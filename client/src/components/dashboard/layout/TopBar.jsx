import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { authServices, clearPersistedAuthTokens } from "../../../services/authServices";
import { clearUser } from "../../../store/auth/authSlice";

export default function DashboardTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const getTitle = () => {
    if (location.pathname.startsWith("/dashboard/residents")) return "Residents";
    if (location.pathname.startsWith("/dashboard/communities")) return "Communities";
    if (location.pathname.startsWith("/dashboard/messages")) return "Messages";
    if (location.pathname.startsWith("/dashboard/settings")) return "Settings";
    return "Overview";
  };

  const handleLogout = async () => {
    try {
      await authServices.logout();
    } catch {
      // even if request fails, clear local session to avoid a stuck UI
    } finally {
      clearPersistedAuthTokens();
      dispatch(clearUser());
      toast.success("Signed out.");
      navigate("/signin");
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <div>
        <h1 className="text-base font-semibold text-slate-900 md:text-lg">
          {getTitle()}
        </h1>
        <p className="text-xs text-slate-500 md:text-sm">
          Internal tools for managing CareMatch.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-xs text-slate-500 sm:block">
          Logged in as <span className="font-medium text-slate-900">Admin</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-800 md:px-4 md:py-2 md:text-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

