import React, { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { authServices, clearPersistedAuthTokens, persistAuthTokens } from "../../services/authServices";
import { clearUser, getUser, setUser } from "../../store/auth/authSlice";
import { Eye, EyeOff } from "lucide-react";
import { toastAuthError, toastAuthSuccess } from "../../lib/authFeedback";
import SEO from "../../components/common/SEO";
import { apiClient } from "../../services/api";
import {
  clearSnfReferralCode,
  normalizeSnfReferralCode,
  peekSnfReferralCode,
  persistSnfHighlightPartnerId,
  persistSnfReferralCode,
  snfReferralPath,
} from "../../lib/snfReferral";

const SIGNUP_PREFILL_KEY = "carematch_signup_signin_prefill";
const POST_LOGIN_REDIRECT_KEY = "carematch_post_login_redirect";

function Signin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, userData, token } = useSelector(getUser);
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
    const fromState = location.state?.from;

    const getPostLoginRedirect = () => {
      if (!fromState) return null;
      if (typeof fromState === "string") {
        if (
          fromState.startsWith("/signin") ||
          fromState.startsWith("/register") ||
          fromState.startsWith("/admin/login")
        ) {
          return null;
        }
        return { pathname: fromState, search: "", hash: "", state: undefined };
      }
      if (typeof fromState === "object" && typeof fromState.pathname === "string") {
        if (
          fromState.pathname.startsWith("/signin") ||
          fromState.pathname.startsWith("/register") ||
          fromState.pathname.startsWith("/admin/login")
        ) {
          return null;
        }
        return {
          pathname: fromState.pathname,
          search: fromState.search || "",
          hash: fromState.hash || "",
          state: fromState.state,
        };
      }
      return null;
    };
    const getStoredPostLoginRedirect = () => {
      try {
        const raw = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.pathname !== "string") return null;
        if (
          parsed.pathname.startsWith("/signin") ||
          parsed.pathname.startsWith("/register") ||
          parsed.pathname.startsWith("/admin/login")
        ) {
          return null;
        }
        return {
          pathname: parsed.pathname,
          search: parsed.search || "",
          hash: parsed.hash || "",
          state: parsed.state,
        };
      } catch {
        return null;
      }
    };

    React.useEffect(() => {
      const referralFromQuery = persistSnfReferralCode(searchParams.get("referral"));
      const referralCode = referralFromQuery || peekSnfReferralCode();
      const currentToken = token || (typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : "");
      if (referralCode && isAuthenticated && currentToken && userData?.role === "user") {
        navigate(snfReferralPath(referralCode), { replace: true });
      }
    }, [isAuthenticated, navigate, searchParams, token, userData?.role]);

    React.useEffect(() => {
      const stateEmail = location.state?.email || "";
      const statePassword = location.state?.password || "";

      if (stateEmail) setValue("email", stateEmail);
      if (statePassword) setValue("password", statePassword);

      const referralPrefill =
        normalizeSnfReferralCode(searchParams.get("referral")) || peekSnfReferralCode();
      if (referralPrefill) setValue("referralCode", referralPrefill);

      if (!stateEmail || !statePassword) {
        const savedPrefill = sessionStorage.getItem(SIGNUP_PREFILL_KEY);
        if (savedPrefill) {
          try {
            const parsed = JSON.parse(savedPrefill);
            if (!stateEmail && parsed?.email) setValue("email", parsed.email);
            if (!statePassword && parsed?.password) setValue("password", parsed.password);
          } catch {
            // Ignore storage parsing errors.
          }
        }
      }
    }, [location.state, searchParams, setValue]);

    const claimReferralForHighlight = async (referralCode) => {
      const code = normalizeSnfReferralCode(referralCode);
      if (!code) return false;
      try {
        const { data } = await apiClient.post("/api/snf-partners/claim-referral", {
          referralCode: code,
        });
        const partnerId = data?.partner?.id;
        if (partnerId) {
          persistSnfHighlightPartnerId(partnerId);
          clearSnfReferralCode();
          return true;
        }
      } catch (error) {
        toastAuthError(error, {
          fallbackTitle: "Referral code not found",
          fallbackDescription: "You are signed in, but that SNF referral could not be applied.",
        });
      }
      return false;
    };

    const onSubmit = async (data) => {
        try {
            const formReferralCode = normalizeSnfReferralCode(data.referralCode);
            const { referralCode: _omitReferral, ...loginPayload } = data;
            const response = await authServices.login(loginPayload);
            const payload = response?.data || {};

            const accessToken = payload?.accessToken;
            const refreshToken = payload?.refreshToken;
            const user = payload?.user;
            const role = user?.role;
            const userType = user?.user_type ?? user?.userType;

            // Normal sign-in is only for user/facility accounts.
            if (["admin", "authenticator", "moderator"].includes(userType) || role === "admin") {
              clearPersistedAuthTokens();
              dispatch(clearUser());
              toastAuthError(new Error("admin-signin-only"), {
                fallbackTitle: "Use Admin Sign In",
                fallbackDescription: "Admins must sign in from /admin/login.",
              });
              navigate("/admin/login", { replace: true });
              return;
            }

            persistAuthTokens({ accessToken, refreshToken });
            dispatch(setUser({ user, token: accessToken, tokenExpire: null }));
            sessionStorage.removeItem(SIGNUP_PREFILL_KEY);

            toastAuthSuccess("Welcome back", "You’re signed in and ready to continue.");
            if (formReferralCode) {
              persistSnfReferralCode(formReferralCode);
            }
            const queryReferral = persistSnfReferralCode(searchParams.get("referral"));
            const referralCode = formReferralCode || queryReferral || peekSnfReferralCode();
            const usedFormReferral = Boolean(formReferralCode);
            const redirect = getPostLoginRedirect() || getStoredPostLoginRedirect();
            sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
            if (role === "facility") {
              navigate(redirect && String(redirect.pathname || "").startsWith("/facility")
                ? redirect.pathname
                : "/facility", {
                replace: true,
                state: redirect?.state,
              });
            } else if (role === "snf") {
              navigate(redirect && String(redirect.pathname || "").startsWith("/snf")
                ? redirect.pathname
                : "/snf", {
                replace: true,
                state: redirect?.state,
              });
            } else if (usedFormReferral && referralCode) {
              await claimReferralForHighlight(referralCode);
              navigate("/portal", { replace: true });
            } else if (referralCode) {
              navigate(snfReferralPath(referralCode), { replace: true });
            } else {
              if (redirect && !String(redirect.pathname || "").startsWith("/facility") && !String(redirect.pathname || "").startsWith("/snf") && !String(redirect.pathname || "").startsWith("/admin")) {
                navigate(
                  {
                    pathname: redirect.pathname,
                    search: redirect.search,
                    hash: redirect.hash,
                  },
                  { replace: true, state: redirect.state },
                );
              } else {
                navigate("/portal", { replace: true });
              }
            }
        } catch (error) {
            toastAuthError(error, {
              fallbackTitle: "Sign in failed",
              fallbackDescription: "Please check your details and try again.",
            });
        }
    }

    return (
        <>
        <SEO title="Sign In - CareMatch AI" />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 lg:py-10 bg-no-repeat"
            style={{
                backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
                backgroundSize: "55% 70%, cover",
                backgroundPosition: "145% 100%, center",
            }}>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md p-8 rounded-xl shadow-lg text-black border border-[#E2E8F0] bg-[#f8fafc]/90">
                <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" placeholder="Email" {...register("email", { required: "Email required" })}
                        className={`w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white ${errors.email ? "ring-2 ring-red-400" : ""}`} />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            {...register("password", { required: "Password required" })}
                            className={`w-full px-4 py-2 pr-11 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white ${errors.password ? "ring-2 ring-red-400" : ""}`}
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
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Referral code <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EFF-23D52E"
                      autoComplete="off"
                      {...register("referralCode")}
                      className="w-full px-4 py-2 rounded-md bg-white/90 text-black uppercase focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Enter an SNF partner code to highlight that facility on your SNF page.
                    </p>
                </div>

                <div className="mb-6 text-right">
                    <Link to="/forgot-password" className="text-sm underline text-[#00b8db]">
                        Forgot password?
                    </Link>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-[#00b8db] text-white   py-2 rounded-md">
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </button>

                <p className="text-sm text-center mt-4">
                    Don’t have an account? <Link to={{ pathname: "/register", search: location.search }} state={{ from: fromState }} className="underline text-[#00b8db]">Sign Up</Link>
                </p>
            </form>
        </div>
        </>
    );
}

export default Signin;
