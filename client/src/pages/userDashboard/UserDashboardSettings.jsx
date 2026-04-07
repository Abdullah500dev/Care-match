import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SEO from "@/components/common/SEO";
import { authServices } from "../../services/authServices";
import { getUser, setUser } from "../../store/auth/authSlice";
import { toastAuthError, toastAuthSuccess } from "../../lib/authFeedback";

export default function UserDashboardSettings() {
  const dispatch = useDispatch();
  const { userData, token } = useSelector(getUser);
  const [name, setName] = useState(userData?.name || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setNameLoading(true);
      const response = await authServices.updateUserInfo({ name: name.trim() });
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        dispatch(setUser({ user: updatedUser, token, tokenExpire: null }));
      }
      toastAuthSuccess("Profile updated", "Your name has been updated.");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not update profile",
        fallbackDescription: "Please try again.",
      });
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (
      !passwordForm.oldPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toastAuthError(
        { response: { status: 400, data: { message: "Passwords do not match." } } },
        { fallbackTitle: "Password mismatch" }
      );
      return;
    }

    try {
      setPasswordLoading(true);
      await authServices.updateUserPassword(passwordForm);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toastAuthSuccess("Password updated", "Your password has been changed.");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not update password",
        fallbackDescription: "Please check your current password and try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <SEO title="Settings – CareMatch AI" />
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <form
        onSubmit={handleNameUpdate}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Profile</h2>
        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
        />
        <button
          type="submit"
          disabled={nameLoading}
          className="mt-4 rounded-lg bg-[#00B8DB] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {nameLoading ? "Updating..." : "Update Name"}
        </button>
      </form>

      <form
        onSubmit={handlePasswordUpdate}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Password</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={passwordLoading}
          className="mt-4 rounded-lg bg-[#132329] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {passwordLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

