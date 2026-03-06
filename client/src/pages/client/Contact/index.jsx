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
    fullName: "",
    email: "",
    phone: "",
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

  const inputStyle = {
    borderTop: "1px solid #F1F5F9",
    backgroundColor: "#F8FAFC",
  };

  return (
    <>
      <SEO title="Contact" />
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Back to Results - top left of content area */}
        <div
          className="w-full bg-white px-4 py-8 sm:px-6"
          style={{
            borderBottom: "1px solid #0000001A",
            boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A",
          }}
        >
          <div className="container mx-auto flex justify-start lg:max-w-6xl min-[1280px]:max-w-[1400px] min-[1536px]:max-w-[1600px]">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-normal text-[#0A0A0A] transition-colors hover:text-[#0A0A0A]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Results
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-3xl">
            {/* Form Card - white card with rounded corners and subtle shadow */}
            <div
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 md:p-10"
              style={{
                borderTop: "1px solid #E2E8F0",
                boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A",
              }}
            >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Two-column row: Full Name, Email */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="fullName"
                    className="text-sm font-normal text-[#314158]"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    style={inputStyle}
                    className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-normal text-[#314158]"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    style={inputStyle}
                    className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
              </div>

              {/* Two-column row: Phone, Title/Subject */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-normal text-[#314158]"
                  >
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(555) 800-9000"
                    style={inputStyle}
                    className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="subject"
                    className="text-sm font-normal text-[#314158]"
                  >
                    Title / Subject
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Title / Subject"
                    style={inputStyle}
                    className="h-11 rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132329]"
                  />
                </div>
              </div>

              {/* Your Message */}
              <div className="space-y-2">
                <Label
                  htmlFor="message"
                  className="text-sm font-normal text-[#314158]"
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
                  style={inputStyle}
                  className="min-h-[120px] rounded-xl border border-[#E2E8F0] text-[#364153] placeholder:text-[#0F172B80] placeholder:italic outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#132329]"
                />
              </div>

              {/* Send Message Button */}
              <Button
                type="submit"
                className="h-12 w-4/12 rounded-xl bg-[#0F172B] px-6 font-bold text-lg text-white "
              >
                Send Message
                <Send className="ml-2 h-4 w-4" aria-hidden />
              </Button>

              {/* Privacy Notice */}
              <p className="text-xs font-light text-[#90A1B9] leading-relaxed">
                By submitting this form, you agree to our{" "}
                <Link
                  to="/privacy"
                  className="text-[#2B7FFF] font-medium text-sm hover:text-[#2B7FFF]"
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
