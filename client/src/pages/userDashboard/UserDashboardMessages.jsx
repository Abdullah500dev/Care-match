import React from "react";
import { useSelector } from "react-redux";
import SEO from "@/components/common/SEO";
import DirectMessagesPanel from "@/components/messaging/DirectMessagesPanel";
import { getUser } from "@/store/auth/authSlice";

export default function UserDashboardMessages() {
  const { userData } = useSelector(getUser);
  const isFamilyUser =
    userData?.role === "user" &&
    !["admin", "authenticator", "moderator"].includes(userData?.user_type);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SEO title="Messages – CareMatch AI" />
      <DirectMessagesPanel
        title="Messages"
        description="Chat with scanned SNF partners, CareMatch support, or Carrie your AI care advisor."
        showSupportShortcut
        showScannedSnfs={isFamilyUser}
        carriePlaceholder="Ask Carrie… (Enter to send)"
      />
    </div>
  );
}
