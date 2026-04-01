import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../../../components/common/SEO";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authServices } from "../../../services/authServices";
import { Eye, EyeOff } from "lucide-react";
import { toastAuthError, toastAuthSuccess } from "../../../lib/authFeedback";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const showActivationCard = Boolean(pendingEmail);
 
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
      toastAuthError(
        { response: { status: 400, data: { message: "All fields are required." } } },
        { fallbackTitle: "Missing information" }
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      toastAuthError(
        { response: { status: 400, data: { message: "Passwords do not match." } } },
        { fallbackTitle: "Passwords don’t match" }
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authServices.register({
        name: form.fullName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setPendingEmail(form.email);
      toastAuthSuccess(
        "Account created",
        response?.data?.message ||
          "We sent a 6-digit verification code to your email. Enter it below to activate your account."
      );
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Registration failed",
        fallbackDescription:
          "Please review your details and try again. If your password is too weak, choose a stronger one.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateAccount = async (e) => {
    e.preventDefault();
    if (!pendingEmail || !activationCode) {
      toastAuthError(
        { response: { status: 400, data: { message: "Verification code is required." } } },
        { fallbackTitle: "Missing verification code" }
      );
      return;
    }

    try {
      setIsVerifying(true);
      const response = await authServices.activate({ email: pendingEmail, code: activationCode });
      toastAuthSuccess(
        "Account verified",
        response?.data?.message || "Your account is active. You can now sign in."
      );
      navigate("/signin");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Verification failed",
        fallbackDescription: "Please check the 6-digit code and try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingEmail) return;
    try {
      const response = await authServices.resendVerificationCode({ email: pendingEmail });
      toastAuthSuccess(
        "Code resent",
        response?.data?.message || "We sent a new verification code to your email."
      );
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Couldn’t resend code",
        fallbackDescription: "Please try again in a moment.",
      });
    }
  };

  return (
    <>
      <SEO title="Sign Up - CareMatch AI" />
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 lg:py-10 bg-no-repeat"
            style={{
                backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
                backgroundSize: "55% 70%, cover",
                backgroundPosition: "145% 100%, center",
            }}>
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-lg">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl">
                Create Your Account
              </h1>
              <p className="mt-2 text-sm text-[#64748b] sm:text-base">
                Join CareMatch AI to save preferences and track your search.
              </p>
            </div>

            <div className="[perspective:1200px]">
              <div
                className="relative transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: showActivationCard ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 [backface-visibility:hidden]"
                  style={{
                    boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A",
                  }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-normal text-[#314158]">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Jane Doe"
                        className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-normal text-[#314158]">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="jane@example.com"
                        className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-normal text-[#314158]">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Enter password"
                          className="h-11 rounded-xl border border-[#E2E8F0] pr-11 text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-600 hover:text-slate-900"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-normal text-[#314158]">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          className="h-11 rounded-xl border border-[#E2E8F0] pr-11 text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-600 hover:text-slate-900"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-xl bg-[#0F172B] text-base font-bold text-white hover:bg-[#1e293b]"
                    >
                      {isSubmitting ? "Creating account..." : "Sign Up"}
                    </Button>

                    <p className="text-center text-sm text-[#64748b]">
                      Already have an account?{" "}
                      <Link to="/signin" className="underline text-[#00b8db]">
                        Sign In
                      </Link>
                    </p>
                  </form>
                </div>

                <div
                  className="absolute inset-0 rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 [backface-visibility:hidden] flex flex-col justify-center"
                  style={{
                    transform: "rotateY(180deg)",
                    boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A",
                  }}
                >
                  <h2 className="text-center text-lg font-bold text-[#0f172a]">Activate your account</h2>
                  <p className="mt-1 text-center text-sm text-[#64748b]">
                    Enter the 6-digit code sent to <span className="font-semibold">{pendingEmail}</span>.
                  </p>
                  <form onSubmit={handleActivateAccount} className="mx-auto mt-4 w-full max-w-sm space-y-4">
                    <div className="space-y-2 text-center">
                      <Label htmlFor="activationCode" className="text-sm font-normal text-[#314158] text-center block">
                        Verification Code
                      </Label>
                      <Input
                        id="activationCode"
                        name="activationCode"
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        placeholder="123456"
                        className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isVerifying}
                      className="h-12 w-full rounded-xl bg-[#00b8db] text-base font-bold text-white hover:bg-[#009fbe]"
                    >
                      {isVerifying ? "Verifying..." : "Activate Account"}
                    </Button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="w-full text-center text-sm font-medium text-[#00b8db] underline"
                    >
                      Resend verification code
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
