import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/common/SEO";
import { BadgeCheck, Heart, MessageSquare, Search } from "lucide-react";

const cards = [
  { label: "Saved Facilities", value: "14", icon: Heart },
  { label: "New Matches", value: "6", icon: Search },
  { label: "Unread Messages", value: "3", icon: MessageSquare },
  { label: "Profile Completion", value: "92%", icon: BadgeCheck },
];

export default function UserDashboardHome() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="My Dashboard – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Dashboard</h1>
        <p className="text-slate-500">Track your search progress, saved facilities, and advisor conversations.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label} className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardDescription>{item.label}</CardDescription>
                <item.icon className="h-5 w-5 shrink-0 text-slate-500" />
              </div>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-1" />
          </Card>
        ))}
      </div>
    </div>
  );
}

