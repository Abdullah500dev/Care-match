import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Heart, Users, User, UsersRound } from "lucide-react";
import SEO from "../../../components/common/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 9;

const WHO_OPTIONS = [
  { id: "spouse", label: "My Spouse", desc: "Finding exceptional care for my lifelong partner.", Icon: Heart },
  { id: "parent", label: "My Parent", desc: "Expert assistance for a cherished mother or father.", Icon: Users },
  { id: "myself", label: "Myself", desc: "Proactive planning for my own secure future.", Icon: User },
  { id: "other", label: "Someone Else", desc: "Helping a relative, friend, or member of community.", Icon: UsersRound },
];

const CARE_TYPES = [
  { id: "memory", label: "Memory Care" },
  { id: "assisted", label: "Assisted Living" },
  { id: "snf", label: "Skilled Nursing (SNF)" },
  { id: "independent", label: "Independent Living" },
  { id: "respite", label: "Respite / Short-term" },
];

const BUDGET_RANGES = [
  { id: "under3", label: "Under $3,000/mo" },
  { id: "3-5", label: "$3,000 – $5,000/mo" },
  { id: "5-7", label: "$5,000 – $7,000/mo" },
  { id: "7-10", label: "$7,000 – $10,000/mo" },
  { id: "10plus", label: "$10,000+/mo" },
];

const URGENCY_OPTIONS = [
  { id: "asap", label: "As soon as possible" },
  { id: "1month", label: "Within 1 month" },
  { id: "1-3", label: "1 – 3 months" },
  { id: "3plus", label: "3+ months / Planning ahead" },
];

const defaultFormData = {
  who: "",
  location: "",
  careTypes: [],
  budget: "",
  urgency: "",
  amenities: [],
  maxMiles: "",
  visitFrequency: "",
  lifestyle: "",
  specialNeeds: "",
};

export default function IntakeSearch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);

  const progressPercent = (step / TOTAL_STEPS) * 100;

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigate(-1);
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else {
      // Submit / go to results
      console.log("Search criteria:", formData);
      navigate("/"); // TODO: navigate to search results
    }
  };

  const handleSaveAndFinishLater = () => {
    console.log("Saved progress:", { step, formData });
    navigate("/");
  };

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key, id) => {
    setFormData((prev) => {
      const arr = prev[key] || [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...prev, [key]: next };
    });
  };

  return (
    <>
      <SEO title="Find Care - CareMatch" />
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8 lg:py-10 bg-no-repeat"
        style={{
          backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
          backgroundSize: "55% 70%, cover",
          backgroundPosition: "145% 100%, center",
        }}
      >
        {/* Single white card: image left, form right (like reference design) */}
        <div
          className="w-full max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-lg flex flex-col lg:flex-row min-h-[32rem] lg:min-h-[36rem]"
          style={{
            boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.06)",
          }}
        >
          {/* Left: image inside card */}
          <div className="hidden lg:block lg:w-[42%] xl:w-[40%] shrink-0 overflow-hidden rounded-l-2xl">
            <img
              src="/assets/images/search_img.svg"
              alt=""
              className="h-full w-full object-cover object-center min-h-[28rem]"
              aria-hidden
            />
          </div>

          {/* Right: form content */}
          <div className="flex-1 flex flex-col lg:min-w-0 ">
        <Progress value={progressPercent} className="h-1.5 w-full bg-[#e2e8f0] [&>div]:!bg-[#0ea5e9]" />

            <CardShell
              step={step}
              totalSteps={TOTAL_STEPS}
              progressPercent={progressPercent}
              onBack={goBack}
              onContinue={goNext}
              onSaveLater={handleSaveAndFinishLater}
            >
              <StepContent
                step={step}
                formData={formData}
                update={update}
                toggleArray={toggleArray}
              />
            </CardShell>
          </div>
        </div>
      </div>
    </>
  );
}

function CardShell({ step, totalSteps, progressPercent, onBack, onContinue, onSaveLater, children }) {
  return (
    <div className="flex flex-col flex-1 w-full min-w-0 px-6 sm:px-8 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-6 sm:pb-8 lg:pb-10">
      {/* Top section: Back + Step + track bar on top, then divider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex  items-center gap-1.5 rounded-lg bg-[#F9F9F9] px-3.5 py-2 text-sm font-bold text-[#334155] hover:bg-[#e2e8f0] transition-colors border border-[#e2e8f0]"
            style={{ boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }}
          >
            <ArrowLeft className="h-4 w-4 text-[#1D293D]" />
            Back
          </button>
          <span className="text-sm font-normal text-[#6B7280]">
            Step {step}/{totalSteps}
          </span>
        </div>
        {/* Track bar: directly under nav, light grey track + cyan fill */}
      </div>
      {/* Divider below track bar, then main content */}
      <div className="border-b border-[#e2e8f0] mb-8" aria-hidden />

      {/* Main question + options - ample vertical spacing */}
      <div className="flex-1 min-h-0">
        {children}
      </div>

      {/* Action buttons: same width, substantial gap above and between */}
      <div className="mt-10 flex flex-col gap-4">
        <Button
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-[#00CFF4] text-xl text-white font-semibold"
        >
          {step < totalSteps ? "Continue" : "See matching facilities"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          variant="secondary"
          onClick={onSaveLater}
          className="h-14 w-full rounded-2xl bg-[#1D2837] text-xl text-white font-semibold"
        >
          Save and finish later
        </Button>
      </div>
    </div>
  );
}

function StepContent({ step, formData, update, toggleArray }) {
  if (step === 1) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-6 text-center">
          Who is in need of a{" "}
          <span
          className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent"
          style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
        >
          senior care?
        </span>
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {WHO_OPTIONS.map(({ id, label, desc, Icon }) => {
            const isSelected = formData.who === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("who", id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 sm:p-5 text-left transition-colors",
                  isSelected
                    ? "border-2 border-[#00CFF4]"
                    : "border border-[#F0F0F0] bg-white"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#00CFF4]" : "bg-[#F8FAFC]"
                  )}
                  style={
                    !isSelected
                      ? { boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }
                      : undefined
                  }
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-white" : "text-[#94a3b8]")} />
                </span>
                <span className={cn("font-semibold", isSelected ? "text-[#00CFF4]" : "text-[#0f172a]")}>{label}</span>
                <span className={cn("text-sm leading-snug", isSelected ? "text-[#00b4d8]" : "text-[#64748b]")}>{desc}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          Where are you looking for care?
        </h1>
        <p className="text-[#64748b] mb-6">City, state, or ZIP so we can show nearby options.</p>
        <div className="space-y-2">
          <Label htmlFor="location" className="text-[#334155]">Location</Label>
          <Input
            id="location"
            placeholder="e.g. Austin, TX or 78701"
            value={formData.location}
            onChange={(e) => update("location", e.target.value)}
            className="rounded-xl border-[#e2e8f0] h-12"
          />
        </div>
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          What type of care do you need?
        </h1>
        <p className="text-[#64748b] mb-6">Select all that apply.</p>
        <div className="flex flex-wrap gap-3">
          {CARE_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleArray("careTypes", id)}
              className={cn(
                "rounded-xl border-2 px-4 py-3 font-medium transition-colors",
                formData.careTypes.includes(id)
                  ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === 4) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          What is your budget range?
        </h1>
        <p className="text-[#64748b] mb-6">Monthly cost estimate helps us match you to affordable options.</p>
        <div className="space-y-3">
          {BUDGET_RANGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => update("budget", id)}
              className={cn(
                "w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition-colors",
                formData.budget === id
                  ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === 5) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          When do you need care?
        </h1>
        <p className="text-[#64748b] mb-6">This helps us prioritize your search.</p>
        <div className="space-y-3">
          {URGENCY_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => update("urgency", id)}
              className={cn(
                "w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition-colors",
                formData.urgency === id
                  ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === 6) {
    const amenities = [
      { id: "dining", label: "Dining / Meals" },
      { id: "activities", label: "Activities & outings" },
      { id: "therapy", label: "Physical / OT therapy" },
      { id: "memory", label: "Memory programs" },
      { id: "medical", label: "On-site medical" },
      { id: "transport", label: "Transportation" },
    ];
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          Which amenities matter most?
        </h1>
        <p className="text-[#64748b] mb-6">Select any that are important to you.</p>
        <div className="flex flex-wrap gap-3">
          {amenities.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleArray("amenities", id)}
              className={cn(
                "rounded-xl border-2 px-4 py-3 font-medium transition-colors",
                formData.amenities.includes(id)
                  ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === 7) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          How far are you willing to travel?
        </h1>
        <p className="text-[#64748b] mb-6">Maximum distance from your location for visits.</p>
        <div className="space-y-2">
          <Label htmlFor="maxMiles" className="text-[#334155]">Max distance (miles)</Label>
          <Input
            id="maxMiles"
            type="number"
            placeholder="e.g. 25"
            value={formData.maxMiles}
            onChange={(e) => update("maxMiles", e.target.value)}
            className="rounded-xl border-[#e2e8f0] h-12"
          />
        </div>
      </>
    );
  }

  if (step === 8) {
    const lifestyles = [
      { id: "quiet", label: "Quiet & calm" },
      { id: "active", label: "Active & social" },
      { id: "faith", label: "Faith-based" },
      { id: "outdoors", label: "Outdoor access" },
    ];
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          How often will family visit?
        </h1>
        <p className="text-[#64748b] mb-4">Helps us factor in visitation when matching.</p>
        <div className="space-y-2 mb-6">
          <Label htmlFor="visitFrequency" className="text-[#334155]">Visit frequency</Label>
          <Input
            id="visitFrequency"
            placeholder="e.g. Weekly, Daily, Monthly"
            value={formData.visitFrequency}
            onChange={(e) => update("visitFrequency", e.target.value)}
            className="rounded-xl border-[#e2e8f0] h-12"
          />
        </div>
        <h2 className="text-lg font-bold text-[#0f172a] mb-2">Lifestyle or personality preferences</h2>
        <p className="text-[#64748b] mb-4">Optional — we use this to improve fit.</p>
        <div className="flex flex-wrap gap-3 mb-6">
          {lifestyles.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => update("lifestyle", formData.lifestyle === id ? "" : id)}
              className={cn(
                "rounded-xl border-2 px-4 py-3 font-medium transition-colors",
                formData.lifestyle === id
                  ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialNeeds" className="text-[#334155]">Special needs or notes</Label>
          <Input
            id="specialNeeds"
            placeholder="e.g. diabetic care, wheelchair access"
            value={formData.specialNeeds}
            onChange={(e) => update("specialNeeds", e.target.value)}
            className="rounded-xl border-[#e2e8f0] h-12"
          />
        </div>
      </>
    );
  }

  if (step === 9) {
    const whoLabel = WHO_OPTIONS.find((o) => o.id === formData.who)?.label || "—";
    const careLabel = formData.careTypes.length
      ? formData.careTypes.map((id) => CARE_TYPES.find((c) => c.id === id)?.label).join(", ")
      : "—";
    const budgetLabel = BUDGET_RANGES.find((b) => b.id === formData.budget)?.label || "—";
    const urgencyLabel = URGENCY_OPTIONS.find((u) => u.id === formData.urgency)?.label || "—";
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-2">
          Review your search criteria
        </h1>
        <p className="text-[#64748b] mb-6">
          Click &quot;See matching facilities&quot; to get your personalized list.
        </p>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-[#64748b]">Who needs care</dt><dd className="font-medium text-[#0f172a]">{whoLabel}</dd></div>
          <div><dt className="text-[#64748b]">Location</dt><dd className="font-medium text-[#0f172a]">{formData.location || "—"}</dd></div>
          <div><dt className="text-[#64748b]">Care type(s)</dt><dd className="font-medium text-[#0f172a]">{careLabel}</dd></div>
          <div><dt className="text-[#64748b]">Budget</dt><dd className="font-medium text-[#0f172a]">{budgetLabel}</dd></div>
          <div><dt className="text-[#64748b]">When</dt><dd className="font-medium text-[#0f172a]">{urgencyLabel}</dd></div>
          <div><dt className="text-[#64748b]">Max distance</dt><dd className="font-medium text-[#0f172a]">{formData.maxMiles ? `${formData.maxMiles} mi` : "—"}</dd></div>
        </dl>
      </>
    );
  }

  return null;
}
