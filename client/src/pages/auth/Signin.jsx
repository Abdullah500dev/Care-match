import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { authServices, persistAuthTokens } from "../../services/authServices";
import { setUser } from "../../store/auth/authSlice";
import { Eye, EyeOff } from "lucide-react";
import { toastAuthError, toastAuthSuccess } from "../../lib/authFeedback";
import SEO from "../../components/common/SEO";

function Signin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = async (data) => {
        try {
            const response = await authServices.login(data);
            const payload = response?.data || {};

            const accessToken = payload?.accessToken;
            const refreshToken = payload?.refreshToken;
            const user = payload?.user;

            persistAuthTokens({ accessToken, refreshToken });
            dispatch(setUser({ user, token: accessToken, tokenExpire: null }));

            toastAuthSuccess("Welcome back", "You’re signed in and ready to continue.");
            const role = user?.role;
            const userType = user?.user_type;
            if (["admin", "authenticator", "moderator"].includes(userType)) {
              navigate("/admin");
            } else if (role === "facility") {
              navigate("/facility");
            } else if (role === "user") {
              navigate("/portal");
            } else {
              navigate("/admin");
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

                <div className="mb-6">
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

                <div className="mb-6 text-right">
                    <Link to="/forgot-password" className="text-sm underline text-[#00b8db]">
                        Forgot password?
                    </Link>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-[#00b8db] text-white   py-2 rounded-md">
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </button>

                <p className="text-sm text-center mt-4">
                    Don’t have an account? <Link to="/register" className="underline text-[#00b8db]">Sign Up</Link>
                </p>
            </form>
        </div>
        </>
    );
}

export default Signin;
