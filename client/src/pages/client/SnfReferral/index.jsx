import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import SEO from "@/components/common/SEO";
import SnfInfoDialog from "@/components/snf/SnfInfoDialog";
import { apiClient } from "@/services/api";
import { getUser } from "@/store/auth/authSlice";
import {
  clearSnfReferralCode,
  normalizeSnfReferralCode,
  persistSnfReferralCode,
  snfReferralPath,
} from "@/lib/snfReferral";

export default function SnfReferralLanding() {
  const { code: rawCode } = useParams();
  const code = normalizeSnfReferralCode(rawCode);
  const navigate = useNavigate();
  const { userData, token } = useSelector(getUser);
  const role = userData?.role;
  const [partner, setPartner] = useState(null);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("This referral link is missing a code.");
      return;
    }

    persistSnfReferralCode(code);
    let cancelled = false;

    const goToSignin = () => {
      navigate(`/signin?referral=${encodeURIComponent(code)}`, {
        replace: true,
        state: { from: snfReferralPath(code) },
      });
    };

    const run = async () => {
      const hasToken = Boolean(
        token || (typeof localStorage !== "undefined" && localStorage.getItem("access_token")),
      );

      try {
        if (hasToken) {
          try {
            const { data } = await apiClient.post("/api/snf-partners/claim-referral", {
              referralCode: code,
            });
            if (cancelled) return;
            const claimed = data?.partner;
            if (claimed) {
              clearSnfReferralCode();
              if (role && role !== "user") {
                setPartner(claimed);
                setDialogOpen(true);
                return;
              }
              navigate(`/portal/snf?open=${encodeURIComponent(claimed.id)}`, {
                replace: true,
                state: { partner: claimed },
              });
              return;
            }
          } catch (err) {
            if (err?.response?.status !== 401) {
              throw err;
            }
          }
        }

        const { data } = await apiClient.get(
          `/api/snf-partners/public/${encodeURIComponent(code)}`,
        );
        if (cancelled) return;
        const nextPartner = data?.partner || null;
        if (!nextPartner) {
          setError("This SNF referral could not be found.");
          return;
        }
        setPartner(nextPartner);
        goToSignin();
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || "This SNF referral could not be found.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [code, navigate, role, token]);

  return (
    <div className="mx-auto min-h-[60vh] w-full max-w-3xl px-4 py-16">
      <SEO title="SNF Referral – CareMatch AI" />
      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Referral unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Opening this skilled nursing profile…
        </div>
      )}
      <SnfInfoDialog
        open={dialogOpen && Boolean(partner)}
        onOpenChange={setDialogOpen}
        partner={partner}
      />
    </div>
  );
}
