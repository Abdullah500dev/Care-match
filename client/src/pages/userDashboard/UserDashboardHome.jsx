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
import { Copy, Heart, Loader2, MessageSquare, QrCode, Search } from "lucide-react";
import { apiClient } from "@/services/api";
import { postMatchRecommendations } from "@/services/matchService";
import { unreadMessageCount } from "@/lib/userDashboardMessages";
import { toast } from "sonner";

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
  const [visitPass, setVisitPass] = useState(null);
  const [visitPassLoading, setVisitPassLoading] = useState(true);
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

  const loadVisitPass = useCallback(async () => {
    setVisitPassLoading(true);
    try {
      const { data } = await apiClient.get("/api/snf-partners/my-visit-pass");
      setVisitPass(data?.visitPass || null);
    } catch {
      setVisitPass(null);
    } finally {
      setVisitPassLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadVisitPass();
  }, [loadStats, loadVisitPass]);

  const copyVisitCode = async () => {
    if (!visitPass?.visitCode) return;
    try {
      await navigator.clipboard.writeText(visitPass.visitCode);
      toast.success("Visit code copied");
    } catch {
      toast.error("Could not copy visit code");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="My Dashboard – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Dashboard</h1>
        <p className="text-slate-500">
          Track your search progress, saved facilities, and advisor conversations.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#ECFEFF] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              <QrCode className="h-3.5 w-3.5" />
              Facility visit pass
            </div>
            <h2 className="text-lg font-bold text-slate-900">Your visit QR code</h2>
            <p className="mt-1 text-sm text-slate-500">
              {visitPass?.instructions ||
                "Show this QR when you visit a skilled nursing facility so staff can record your visit."}
            </p>
            {visitPass?.visitCode ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-slate-100 px-3 py-2 font-mono text-sm font-bold text-slate-800">
                  {visitPass.visitCode}
                </span>
                <button
                  type="button"
                  onClick={copyVisitCode}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy code
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {visitPassLoading ? (
              <div className="flex h-40 w-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : visitPass?.qrImageUrl ? (
              <img
                src={visitPass.qrImageUrl}
                alt="Your visit QR code"
                className="h-40 w-40 object-contain"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center text-center text-xs text-slate-400">
                Visit pass unavailable
              </div>
            )}
          </div>
        </div>
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
