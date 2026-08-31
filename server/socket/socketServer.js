import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/userModel.js";
import {
  createAndEmitMessage,
  markConversationRead,
} from "../services/messagingService.js";

function listOnlineUserIds(onlineUsers) {
  return [...onlineUsers.keys()];
}

export function initSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    path: "/socket.io",
  });

  /** userId -> number of active socket connections */
  const onlineUsers = new Map();

  const markUserOnline = (userId) => {
    const key = String(userId);
    const next = (onlineUsers.get(key) || 0) + 1;
    onlineUsers.set(key, next);
    return next === 1;
  };

  const markUserOffline = (userId) => {
    const key = String(userId);
    const current = onlineUsers.get(key) || 0;
    if (current <= 1) {
      onlineUsers.delete(key);
      return true;
    }
    onlineUsers.set(key, current - 1);
    return false;
  };

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.["access-token"];
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN || "");
      const user = await User.findById(decoded.id).select(
        "name email role user_type is_blocked",
      );
      if (!user || user.is_blocked) return next(new Error("User not found"));

      socket.user = user;
      socket.userId = String(user._id);
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const becameOnline = markUserOnline(socket.userId);
    socket.join(`user:${socket.userId}`);

    socket.emit("presence:sync", { onlineUserIds: listOnlineUserIds(onlineUsers) });
    if (becameOnline) {
      io.emit("presence:update", { userId: socket.userId, online: true });
    }

    socket.on("conversation:join", ({ conversationId } = {}) => {
      const id = String(conversationId || "").trim();
      if (!id) return;
      socket.join(`conversation:${id}`);
    });

    socket.on("conversation:leave", ({ conversationId } = {}) => {
      const id = String(conversationId || "").trim();
      if (!id) return;
      socket.leave(`conversation:${id}`);
    });

    socket.on("message:send", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "").trim();
        const text = String(payload?.text || "").trim();
        if (!conversationId || !text) {
          if (typeof ack === "function") ack({ success: false, message: "Invalid payload" });
          return;
        }

        const result = await createAndEmitMessage({
          conversationId,
          senderId: socket.userId,
          text,
          io,
        });

        if (typeof ack === "function") {
          ack({ success: true, ...result });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({
            success: false,
            message: error?.message || "Could not send message",
          });
        }
      }
    });

    socket.on("conversation:read", async ({ conversationId } = {}, ack) => {
      try {
        const id = String(conversationId || "").trim();
        if (!id) {
          if (typeof ack === "function") ack({ success: false });
          return;
        }
        await markConversationRead(socket.user, id);
        if (typeof ack === "function") ack({ success: true });
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: error?.message || "Read failed" });
        }
      }
    });

    socket.on("disconnect", () => {
      const becameOffline = markUserOffline(socket.userId);
      if (becameOffline) {
        io.emit("presence:update", { userId: socket.userId, online: false });
      }
    });
  });

  return io;
}
