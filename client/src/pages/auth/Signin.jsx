import React from 'react'
import { useForm } from "react-hook-form";

function Signin({ onSwitch }) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = (data) => {
        console.log("Form submitted:", data);
    }

    return (
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
                    {errors.email && <p className="text-red-300 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input type="password" placeholder="Password" {...register("password", { required: "Password required" })}
                        className={`w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white ${errors.password ? "ring-2 ring-red-400" : ""}`} />
                    {errors.password && <p className="text-red-300 text-sm mt-1">{errors.password.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-[#00b8db] text-white   py-2 rounded-md">
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </button>

                <p className="text-sm text-center mt-4">
                    Don’t have an account? <a href="#" className="underline text-[#00b8db]" onClick={onSwitch}>Sign Up</a>
                </p>
            </form>
        </div>
    );
}

export default Signin
