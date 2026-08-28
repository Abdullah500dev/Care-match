import React from "react";
import SEO from "@/components/common/SEO";
import DirectMessagesPanel from "@/components/messaging/DirectMessagesPanel";

export default function AdminMessages() {
  return (
    <>
      <SEO title="Messages – Admin | CareMatch AI" />
      <DirectMessagesPanel
        title="Messages"
        description="Message any family user, facility partner, or SNF account. Live socket notifications included."
        showDirectory
        carriePlaceholder="Ask Carrie… (Enter to send)"
      />
    </>
  );
}
