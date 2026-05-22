import { toast } from "sonner";

function pickServerMessage(error) {
  const msg =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "";
  return typeof msg === "string" ? msg.trim() : "";
}

export function getFriendlyAuthError(
  error,
  { fallbackTitle, fallbackDescription } = {}
) {
  const status = error?.response?.status;
  const serverMsg = pickServerMessage(error);
  const msgLower = serverMsg.toLowerCase();

  // Normalize generic axios 500 text for auth/password flows.
  if (msgLower.includes("request failed with status code 500")) {
    return {
      title: fallbackTitle || "Request failed",
      description: "Please enter strong password.",
    };
  }

  // Network / CORS / server down
  if (!status) {
    return {
      title: fallbackTitle || "Something went wrong",
      description:
        fallbackDescription ||
        "We couldn’t reach the server. Please check your connection and try again.",
    };
  }

  if (status === 401) {
    return {
      title: fallbackTitle || "Sign in failed",
      description: serverMsg || "Please check your email and password and try again.",
    };
  }

  if (status === 403) {
    return {
      title: fallbackTitle || "Account not ready",
      description:
        serverMsg ||
        "Please verify your email before signing in.",
    };
  }

  if (status === 404) {
    return {
      title: fallbackTitle || "Not found",
      description:
        serverMsg || "We couldn’t find an account with that email.",
    };
  }

  if (status === 400) {
    const desc =
      serverMsg ||
      fallbackDescription ||
      "Please double-check your details and try again.";

    // Keep server message, but add a more “professional” title.
    return {
      title: fallbackTitle || "Please check your details",
      description: desc,
    };
  }

  // Some backend validation failures currently bubble up as 500.
  if (status === 500) {
    return {
      title: fallbackTitle || "Registration failed",
      description: "Please enter strong password.",
    };
  }

  return {
    title: fallbackTitle || "Something went wrong",
    description: serverMsg || fallbackDescription || "Please try again in a moment.",
  };
}

export function toastAuthError(error, opts = {}) {
  const { title, description } = getFriendlyAuthError(error, opts);
  toast.error(title, { description });
}

export function toastAuthSuccess(title, description) {
  toast.success(title, description ? { description } : undefined);
}

