import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import SEO from "../../../components/common/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Contact() {
  const [form, setForm] = useState({
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "(555) 000-0000",
    subject: "",
    message: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <SEO title="Contact" />
      <div className="min-h-screen bg-white">
        {/* Back to Results - full width with borders */}
        <div className="w-full border border-[#E2E8F0] px-4 py-3 sm:px-6">
          <div className="container mx-auto flex justify-start pl-4 sm:pl-6 lg:max-w-6xl lg:pl-12 min-[1280px]:max-w-[1400px] min-[1280px]:pl-24 min-[1536px]:max-w-[1600px] min-[1536px]:pl-96">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-normal text-[#364153] transition-colors hover:text-[#132329]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Results
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-2xl">
            {/* Form Card */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Two-column row: Full Name, Email */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="fullName"
                    className="text-sm font-normal text-[#364153]"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    className="h-11 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-[#364153] placeholder:text-[rgba(15,23,43,0.5)] focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-normal text-[#364153]"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="h-11 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-[#364153] placeholder:text-[rgba(15,23,43,0.5)] focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
              </div>

              {/* Two-column row: Phone, Title/Subject */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-normal text-[#364153]"
                  >
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="h-11 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-[#364153] placeholder:text-[rgba(15,23,43,0.5)] focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="subject"
                    className="text-sm font-normal text-[#364153]"
                  >
                    Title / Subject
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder=""
                    className="h-11 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-[#364153] placeholder:text-[rgba(15,23,43,0.5)] focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
              </div>

              {/* Your Message */}
              <div className="space-y-2">
                <Label
                  htmlFor="message"
                  className="text-sm font-normal text-[#364153]"
                >
                  Your Message
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us a bit more about how we can help..."
                  rows={5}
                  className="min-h-[120px] rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-[#364153] placeholder:text-[rgba(15,23,43,0.5)] placeholder:italic focus-visible:ring-2 focus-visible:ring-[#132329]"
                />
              </div>

              {/* Send Message Button */}
              <Button
                type="submit"
                className="h-12 rounded-xl bg-[#132329] px-6 font-normal text-white shadow-sm hover:bg-[#132329]/90"
              >
                Send Message
                <Send className="ml-2 h-4 w-4" />
              </Button>

              {/* Privacy Notice */}
              <p
                className="text-[#90A1B9]"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 300,
                  fontSize: "8px",
                  lineHeight: "14px",
                  letterSpacing: "0px",
                }}
              >
                By submitting you agree to our{" "}
                <Link
                  to="/privacy"
                  className="text-[#0EA5E9] text-sm font-bold hover:text-[#0284C7] sm:text-base"
                >
                  Privacy Policy
                </Link>
                . We never share your contact info without consent.
              </p>
            </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
