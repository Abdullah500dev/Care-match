import React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { authServices } from "../../services/authServices";
import SEO from "../../components/common/SEO";

function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await authServices.forgotPassword(data);
      toast.success(response?.data?.message || "Reset link sent to your email.");
    } catch (error) {
      const rawMessage = error?.response?.data?.message || "Unable to send reset link.";
      const cleanedMessage = String(rawMessage)
        .replace(/["'"'"'`“”‘’]\s*email\s*["'"'"'`“”‘’]/gi, "email")
        .replace(/\s{2,}/g, " ")
        .trim();
      toast.error(cleanedMessage);
    }
  };

  return (
    <>
      <SEO title="Forgot Password – CareMatch AI" />
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
        <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
        <p className="text-sm text-center text-[#334155] mb-6">
          Enter your account email and we will send you a reset link.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            placeholder="Email"
            {...register("email", { required: "Email required" })}
            className={`w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white ${
              errors.email ? "ring-2 ring-red-400" : ""
            }`}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#00b8db] text-white py-2 rounded-md"
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>

        <p className="text-sm text-center mt-4">
          Back to{" "}
          <Link to="/signin" className="underline text-[#00b8db]">
            Sign In
          </Link>
        </p>
      </form>
    </div>
    </>
  );
}

export default ForgotPassword;

