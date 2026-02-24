const setupSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`user ${userId} joined room`);
    });
  });
};

export default setupSocket;
