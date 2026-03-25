import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../../components/common/SEO";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Register() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect signup API
    console.log("Register payload:", form);
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

            <div
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8"
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
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-normal text-[#314158]">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] focus-visible:ring-[#132329]"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[#0F172B] text-base font-bold text-white hover:bg-[#1e293b]"
                >
                  Sign Up
                </Button>

                <p className="text-center text-sm text-[#64748b]">
                  Already have an account?{" "}
                  <Link to="/signin" className="underline text-[#00b8db]">
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
