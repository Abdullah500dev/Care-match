import React from "react";
import SEO from "@/components/common/SEO";

export default function UserDashboardFacilities() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <SEO title="Facilities – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facilities</h1>
        <p className="text-slate-500">This is a placeholder page for user facilities.</p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Dummy content: user facility listing and saved facility tools will be added here.
      </div>
    </div>
  );
}

