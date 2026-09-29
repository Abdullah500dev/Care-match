import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import SEO from "@/components/common/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authServices } from "../../services/authServices";
import { getUser, setUser } from "../../store/auth/authSlice";
import { toastAuthError, toastAuthSuccess } from "../../lib/authFeedback";

export default function UserDashboardSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, token } = useSelector(getUser);
  const isFamilyUser =
    userData?.role === "user" &&
    !["admin", "authenticator", "moderator"].includes(userData?.user_type);

  const [name, setName] = useState(userData?.name || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [nameError, setNameError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [activeTab, setActiveTab] = useState(() =>
    location.hash === "#password" ? "password" : "profile",
  );

  useEffect(() => {
    // Legacy deep-link: settings#medical-record → dedicated Medical History page
    if (location.hash === "#medical-record" && isFamilyUser) {
      navigate("/portal/medical-history", { replace: true });
    }
  }, [location.hash, isFamilyUser, navigate]);

  useEffect(() => {
    setName(userData?.name || "");
  }, [userData]);

  useEffect(() => {
    setActiveTab(location.hash === "#password" ? "password" : "profile");
  }, [location.hash]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    const nextHash = value === "password" ? "#password" : "";
    navigate(`${location.pathname}${location.search}${nextHash}`, { replace: true });
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }
    setNameError("");
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
    const nextErrors = {
      oldPassword: passwordForm.oldPassword ? "" : "Current password is required.",
      newPassword: passwordForm.newPassword ? "" : "New password is required.",
      confirmPassword: passwordForm.confirmPassword ? "" : "Please confirm your new password.",
    };
    if (nextErrors.oldPassword || nextErrors.newPassword || nextErrors.confirmPassword) {
      setPasswordErrors(nextErrors);
      return;
    }
    setPasswordErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match.",
      }));
      toastAuthError(
        { response: { status: 400, data: { message: "Passwords do not match." } } },
        { fallbackTitle: "Password mismatch" },
      );
      return;
    }

    try {
      setPasswordLoading(true);
      await authServices.updateUserPassword(passwordForm);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-slate-100 p-1">
          <TabsTrigger
            value="profile"
            className="rounded-md px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#00B8DB] data-[state=active]:shadow-sm"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="password"
            className="rounded-md px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#00B8DB] data-[state=active]:shadow-sm"
          >
            Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <form
            onSubmit={handleNameUpdate}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Profile</h2>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={userData?.email || ""}
              disabled
              title="Email is locked and cannot be edited"
              className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 opacity-90"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email cannot be updated from settings.
            </p>
            <label className="mb-1 mt-3 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                nameError ? "border-red-400" : "border-slate-200"
              }`}
            />
            {nameError ? <p className="mt-1 text-xs text-red-600">{nameError}</p> : null}
            <button
              type="submit"
              disabled={nameLoading}
              className="mt-4 rounded-lg bg-[#00B8DB] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {nameLoading ? "Updating..." : "Update Name"}
            </button>
          </form>
        </TabsContent>

        <TabsContent value="password" className="mt-4">
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
                <div className="relative">
                  <input
                    type={showPassword.oldPassword ? "text" : "password"}
                    value={passwordForm.oldPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }));
                      if (passwordErrors.oldPassword) {
                        setPasswordErrors((prev) => ({ ...prev, oldPassword: "" }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                      passwordErrors.oldPassword ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        oldPassword: !prev.oldPassword,
                      }))
                    }
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                    aria-label={showPassword.oldPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword.oldPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.oldPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.oldPassword}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.newPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                      if (passwordErrors.newPassword || passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                      passwordErrors.newPassword ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        newPassword: !prev.newPassword,
                      }))
                    }
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                    aria-label={showPassword.newPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword.newPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                      passwordErrors.confirmPassword ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        confirmPassword: !prev.confirmPassword,
                      }))
                    }
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                    aria-label={
                      showPassword.confirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword.confirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
                ) : null}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
