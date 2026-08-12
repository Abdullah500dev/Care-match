import { toast } from "sonner";

function pickServerMessage(error) {
  const msg =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "";
  return typeof msg === "string" ? msg.trim() : "";
}

export function getFriendlyAuthError(error, { fallbackTitle, fallbackDescription } = {}) {
  const status = error?.response?.status;
  const serverMsg = pickServerMessage(error);

  // Network / CORS / server down
  if (!status) {
    return {
      title: fallbackTitle || "Something went wrong",
      description:
        fallbackDescription ||
        "We couldn’t reach the server. Please check your connection and try again.",
    };
  }

  // Common auth statuses
  if (status === 401) {
    return {
      title: fallbackTitle || "Sign in failed",
      description: serverMsg || "Your session has expired. Please sign in again.",
    };
  }

  if (status === 403) {
    return {
      title: fallbackTitle || "Action not allowed",
      description:
        serverMsg ||
        "Your account may need verification before you can continue.",
    };
  }

  if (status === 404) {
    return {
      title: fallbackTitle || "Not found",
      description: serverMsg || "We couldn’t find an account with those details.",
    };
  }

  // Validation / bad request
  if (status === 400) {
    let desc = serverMsg || fallbackDescription || "Please check your details and try again.";

    // Make password errors clearer without changing server logic.
    if (/password/i.test(desc) && /\b(weak|strength|at least|min)\b/i.test(desc)) {
      desc = desc;
    } else if (/password/i.test(desc) && desc.length < 6) {
      desc = "Please choose a stronger password and try again.";
    }

    return {
      title: fallbackTitle || "Please check your details",
      description: desc,
    };
  }

  // Everything else
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

