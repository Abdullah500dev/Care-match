import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import SEO from "../../../components/common/SEO";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authServices } from "../../../services/authServices";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toastAuthError, toastAuthSuccess } from "../../../lib/authFeedback";

const SIGNUP_PREFILL_KEY = "carematch_signup_signin_prefill";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
  const [activationError, setActivationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errors, setErrors] = useState({});
  const showActivationCard = Boolean(pendingEmail);
  const fromState = location.state?.from;
 
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const emailFromQuery = (searchParams.get("email") || "").trim();
    const codeFromQuery = (searchParams.get("code") || "").trim();
    const activateFromQuery = (searchParams.get("activate") || "").trim();
    const copyFromQuery = (searchParams.get("copy") || "").trim();
    if (!emailFromQuery && !codeFromQuery) return;

    if (emailFromQuery) {
      setPendingEmail(emailFromQuery);
      setForm((prev) => ({ ...prev, email: emailFromQuery }));
    }
    if (codeFromQuery) {
      setActivationCode(codeFromQuery);
    }

    if (activateFromQuery) {
      setPendingEmail((prev) => prev || emailFromQuery);
    }

    if (copyFromQuery && codeFromQuery) {
      const copyWithFallback = async () => {
        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(codeFromQuery);
            toastAuthSuccess(
              "Code copied",
              "Your verification code is copied. Paste it to activate your account."
            );
            return;
          }
          throw new Error("Clipboard API unavailable");
        } catch {
          try {
            const tempInput = document.createElement("textarea");
            tempInput.value = codeFromQuery;
            tempInput.setAttribute("readonly", "");
            tempInput.style.position = "absolute";
            tempInput.style.left = "-9999px";
            document.body.appendChild(tempInput);
            tempInput.select();
            const copied = document.execCommand("copy");
            document.body.removeChild(tempInput);
            if (copied) {
              toastAuthSuccess(
                "Code copied",
                "Your verification code is copied. Paste it to activate your account."
              );
              return;
            }
          } catch {
            // Keep silent and use the fallback notification below.
          }
          toastAuthSuccess(
            "Code ready",
            "We prefilled your verification code on this page. Tap Activate Account to continue."
          );
        }
      };

      copyWithFallback();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pendingEmail) return;

    let cancelled = false;
    let timerId = null;

    const checkActivationStatus = async () => {
      try {
        const response = await authServices.activationStatus(pendingEmail);
        const isVerified = Boolean(response?.data?.isVerified);
        if (!cancelled && isVerified) {
          const savedPrefill = sessionStorage.getItem(SIGNUP_PREFILL_KEY);
          let nextState = { email: pendingEmail };
          if (savedPrefill) {
            try {
              const parsed = JSON.parse(savedPrefill);
              nextState = {
                email: parsed?.email || pendingEmail,
                password: parsed?.password || "",
              };
            } catch {
              // Ignore parsing errors and continue with email only.
            }
          }
          toastAuthSuccess(
            "Account activated",
            "Your account was activated successfully. Please sign in to continue."
          );
          navigate("/signin", { state: { ...nextState, from: fromState } });
          return;
        }
      } catch {
        // Keep polling quietly; temporary API/network errors should not break signup flow.
      }

      if (!cancelled) {
        timerId = window.setTimeout(checkActivationStatus, 4000);
      }
    };

    timerId = window.setTimeout(checkActivationStatus, 4000);

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [pendingEmail, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }
    if (!form.password) nextErrors.password = "Password is required";
    if (!form.confirmPassword) nextErrors.confirmPassword = "Confirm password is required";
    if (
      form.password &&
      form.confirmPassword &&
      form.password !== form.confirmPassword
    ) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toastAuthError(
        { response: { status: 400, data: { message: "Please fix the highlighted fields." } } },
        { fallbackTitle: "Invalid form" }
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
      sessionStorage.setItem(
        SIGNUP_PREFILL_KEY,
        JSON.stringify({
          email: form.email,
          password: form.password,
        })
      );
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
      setActivationError("Verification code is required");
      toastAuthError(
        { response: { status: 400, data: { message: "Verification code is required." } } },
        { fallbackTitle: "Missing verification code" }
      );
      return;
    }

    try {
      setActivationError("");
      setIsVerifying(true);
      const response = await authServices.activate({ email: pendingEmail, code: activationCode });
      toastAuthSuccess(
        "Account verified",
        response?.data?.message || "Your account is active. You can now sign in."
      );
      const savedPrefill = sessionStorage.getItem(SIGNUP_PREFILL_KEY);
      let nextState = { email: pendingEmail };
      if (savedPrefill) {
        try {
          const parsed = JSON.parse(savedPrefill);
          nextState = {
            email: parsed?.email || pendingEmail,
            password: parsed?.password || "",
          };
        } catch {
          // Ignore parsing errors and continue with email only.
        }
      }
      navigate("/signin", { state: { ...nextState, from: fromState } });
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
                        className={`h-11 rounded-xl border text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329] ${
                          errors.fullName ? "border-red-400 ring-1 ring-red-300" : "border-[#E2E8F0]"
                        }`}
                      />
                      {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
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
                        className={`h-11 rounded-xl border text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329] ${
                          errors.email ? "border-red-400 ring-1 ring-red-300" : "border-[#E2E8F0]"
                        }`}
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                          className={`h-11 rounded-xl border pr-11 text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329] ${
                            errors.password ? "border-red-400 ring-1 ring-red-300" : "border-[#E2E8F0]"
                          }`}
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
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
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
                          className={`h-11 rounded-xl border pr-11 text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329] ${
                            errors.confirmPassword ? "border-red-400 ring-1 ring-red-300" : "border-[#E2E8F0]"
                          }`}
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
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-xl bg-[#00b8db] text-base font-bold text-white hover:bg-[#009fbe]"
                    >
                      {isSubmitting ? "Creating account..." : "Sign Up"}
                    </Button>

                    <p className="text-center text-sm text-[#64748b]">
                      Already have an account?{" "}
                      <Link to="/signin" state={{ from: fromState }} className="underline text-[#00b8db]">
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
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#00b8db]/10 text-[#00b8db]">
                    <ShieldCheck className="h-6 w-6" aria-hidden />
                  </div>
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
                        onChange={(e) => {
                          setActivationCode(e.target.value);
                          if (activationError) setActivationError("");
                        }}
                        placeholder="123456"
                        className={`h-11 rounded-xl border text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329] ${
                          activationError ? "border-red-400 ring-1 ring-red-300" : "border-[#E2E8F0]"
                        }`}
                      />
                      {activationError && (
                        <p className="text-red-500 text-sm mt-1 text-left">{activationError}</p>
                      )}
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
