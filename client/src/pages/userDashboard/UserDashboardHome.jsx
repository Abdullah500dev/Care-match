import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import SEO from "@/components/common/SEO";
import { Heart, Loader2, MessageSquare, Search } from "lucide-react";
import { apiClient } from "@/services/api";
import { postMatchRecommendations } from "@/services/matchService";
import { unreadMessageCount } from "@/lib/userDashboardMessages";

const CARD_META = [
  {
    key: "savedFacilities",
    label: "Saved Facilities",
    icon: Heart,
    to: "/portal/communities",
  },
  {
    key: "newMatches",
    label: "New Matches",
    icon: Search,
    to: "/care-explorer",
  },
  {
    key: "unreadMessages",
    label: "Unread Messages",
    icon: MessageSquare,
    to: "/portal/messages",
  },
];

export default function UserDashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    savedFacilities: 0,
    newMatches: 0,
    unreadMessages: 0,
  });

  const loadStats = useCallback(async () => {
    setLoading(true);
    const unreadMessages = unreadMessageCount();

    const favoritesPromise = apiClient
      .get("/api/auth/favorites")
      .then(({ data }) => {
        if (!data?.success) return 0;
        const details = Array.isArray(data.facilityDetails)
          ? data.facilityDetails
          : [];
        const ids = Array.isArray(data.favorites) ? data.favorites : [];
        return details.length || ids.length || 0;
      })
      .catch(() => 0);

    const matchesPromise = postMatchRecommendations({})
      .then(({ data }) => {
        if (typeof data?.count === "number") return data.count;
        if (Array.isArray(data?.recommendations)) {
          return data.recommendations.length;
        }
        return 0;
      })
      .catch(() => 0);

    const [savedFacilities, newMatches] = await Promise.all([
      favoritesPromise,
      matchesPromise,
    ]);

    setStats({ savedFacilities, newMatches, unreadMessages });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="My Dashboard – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Dashboard</h1>
        <p className="text-slate-500">
          Track your search progress, saved facilities, and advisor conversations.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_META.map((item) => {
          const Icon = item.icon;
          const value = stats[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.to)}
              className="rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8DB]/40"
            >
              <Card className="h-full border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardDescription>{item.label}</CardDescription>
                    <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                  </div>
                  <CardTitle className="text-2xl tabular-nums">
                    {loading ? (
                      <Loader2 className="mt-1 h-6 w-6 animate-spin text-slate-400" />
                    ) : (
                      value
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-1" />
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
