import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authServices } from "../../services/authServices";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Missing reset token in URL.");
      return;
    }

    try {
      const response = await authServices.resetPassword({
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      toast.success("Password reset successful.");
      navigate("/signin", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not reset password.");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 lg:py-10 bg-no-repeat"
      style={{
        backgroundImage:
          "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
        backgroundSize: "55% 70%, cover",
        backgroundPosition: "145% 100%, center",
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md p-8 rounded-xl shadow-lg text-black border border-[#E2E8F0] bg-[#f8fafc]/90"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
        <p className="text-sm text-center text-[#334155] mb-6">
          Set your new password for your account.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input
            type="password"
            placeholder="New password"
            {...register("newPassword", { required: "New password required" })}
            className={`w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white ${
              errors.newPassword ? "ring-2 ring-red-400" : ""
            }`}
          />
          {errors.newPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm password"
            {...register("confirmPassword", { required: "Confirm password required" })}
            className={`w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white ${
              errors.confirmPassword ? "ring-2 ring-red-400" : ""
            }`}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#00b8db] text-white py-2 rounded-md"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>

        <p className="text-sm text-center mt-4">
          Back to{" "}
          <Link to="/signin" className="underline text-[#00b8db]">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}

export default ResetPassword;

