import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import SEO from "../../../components/common/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Contact() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});

  const validateForm = (values) => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;

    if (!values.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!values.email.trim()) nextErrors.email = "Email is required.";
    else if (!emailRegex.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";

    if (values.phone.trim() && !phoneRegex.test(values.phone.trim())) {
      nextErrors.phone = "Enter a valid phone number.";
    }

    if (!values.subject.trim()) nextErrors.subject = "Subject is required.";
    if (!values.message.trim()) nextErrors.message = "Message is required.";

    return nextErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    toast.success("Message sent successfully.");
    setForm({
      fullName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (errors[name]) {
        const nextErrors = validateForm(updated);
        setErrors((prevErrors) => ({ ...prevErrors, [name]: nextErrors[name] }));
      }
      return updated;
    });
  };

  const inputStyle = {
    borderTop: "1px solid #F1F5F9",
    backgroundColor: "#F8FAFC",
  };

  return (
    <>
      <SEO title="Contact Us – CareMatch AI" />
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Back to Results - top left of content area */}
        {/* <div
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
        </div> */}

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-3xl">
            {/* Heading and subheading */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-2">
                Contact Us
              </h1>
              <p className="text-base text-[#64748b] max-w-xl mx-auto">
                Send us a message and we'll get back to you as soon as we can!
              </p>
            </div>
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
                    {errors.fullName && (
                      <p className="text-xs text-red-500">{errors.fullName}</p>
                    )}
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
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
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
                    {errors.phone && (
                      <p className="text-xs text-red-500">{errors.phone}</p>
                    )}
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
                    {errors.subject && (
                      <p className="text-xs text-red-500">{errors.subject}</p>
                    )}
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
                  {errors.message && (
                    <p className="text-xs text-red-500">{errors.message}</p>
                  )}
                </div>

                {/* Send Message Button */}
                <Button
                  type="submit"
                  className="h-12 md:w-4/12 rounded-xl bg-[#0F172B] px-6 font-bold text-lg text-white "
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
                  {" "}and{" "}
                  <Link
                    to="/terms"
                    className="text-[#2B7FFF] font-medium text-sm hover:text-[#2B7FFF]"
                  >
                    Terms of Service
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
