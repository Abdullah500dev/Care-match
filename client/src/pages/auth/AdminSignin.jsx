import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";

import SEO from "../../components/common/SEO";
import { authServices, persistAuthTokens, clearPersistedAuthTokens } from "../../services/authServices";
import { setUser, clearUser } from "../../store/auth/authSlice";
import { toast } from "sonner";
import { toastAuthError, toastAuthSuccess } from "../../lib/authFeedback";

const ADMIN_STAFF_TYPES = ["admin", "authenticator", "moderator"];

function AdminSignin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await authServices.login({
        email: data.email.trim(),
        password: data.password,
      });
      const payload = response?.data || {};
      const user = payload?.user;
      const userType = user?.user_type ?? user?.userType;

      if (!ADMIN_STAFF_TYPES.includes(userType)) {
        clearPersistedAuthTokens();
        dispatch(clearUser());
        toast.error("Access denied", {
          description:
            "This page is for CareMatch staff only. Please use the regular Sign in for your account.",
        });
        return;
      }

      const accessToken = payload?.accessToken;
      const refreshToken = payload?.refreshToken;

      if (!user || !accessToken) {
        toastAuthError(new Error("bad payload"), {
          fallbackTitle: "Sign in failed",
          fallbackDescription: "Unexpected response from server.",
        });
        return;
      }

      persistAuthTokens({ accessToken, refreshToken });
      dispatch(setUser({ user, token: accessToken, tokenExpire: null }));

      toastAuthSuccess("Signed in", "Welcome to the admin dashboard.");
      navigate("/admin", { replace: true });
    } catch (error) {
      clearPersistedAuthTokens();
      dispatch(clearUser());
      toastAuthError(error, {
        fallbackTitle: "Sign in failed",
        fallbackDescription: "Please check your details and try again.",
      });
    }
  };

  return (
    <>
      <SEO title="Admin sign in - CareMatch AI" />
      <div
        className="flex min-h-screen flex-col items-center justify-center px-4 py-10 bg-[#0f172a]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(0,207,244,0.12), transparent 55%), radial-gradient(ellipse at bottom, rgba(15,23,42,0.9), #0f172a)",
        }}
      >
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#00CFF4]">
            CareMatch AI
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Admin sign in</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Staff only. Client and facility accounts should use the main Sign in page.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl backdrop-blur"
        >
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-300">Work email</label>
            <input
              type="email"
              autoComplete="username"
              placeholder="admin@yourorg.com"
              {...register("email", { required: "Email required" })}
              className={`w-full rounded-lg border border-slate-600 bg-slate-950/80 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00CFF4] ${
                errors.email ? "ring-2 ring-red-500" : ""
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="*"
              {...register("password", { required: "Password required" })}
              className={`w-full rounded-lg border border-slate-600 bg-slate-950/80 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00CFF4] ${
                errors.password ? "ring-2 ring-red-500" : ""
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#00CFF4] py-2.5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#33d9f7] disabled:opacity-60"
          >
            {isSubmitting ? "Signing in" : "Sign in to admin dashboard"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-400">
            <Link to="/" className="text-[#00CFF4] underline-offset-2 hover:underline">
              Back to website
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}

export default AdminSignin;
