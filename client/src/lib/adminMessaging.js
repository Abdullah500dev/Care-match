import { toast } from "sonner";
import { startConversation } from "@/services/messageService";

function normalizeOwnedFacilityId(facilityId) {
  const raw = String(facilityId || "").trim();
  if (!raw) return "";
  if (raw.startsWith("owned-") || raw.startsWith("snf-")) return raw;
  if (/^[a-f\d]{24}$/i.test(raw)) return `owned-${raw}`;
  return raw;
}

export async function openAdminConversation(navigate, payload) {
  try {
    const { data } = await startConversation(payload);
    const conversationId = data?.conversation?.id;
    if (!conversationId) {
      toast.error("Could not open messages", {
        description: "Please try again from the Messages page.",
      });
      return false;
    }
    navigate(`/admin/messages?conversation=${encodeURIComponent(conversationId)}`);
    return true;
  } catch (error) {
    toast.error("Could not open message", {
      description: error?.response?.data?.message || "Please try again.",
    });
    return false;
  }
}

export function messageAdminFacility(navigate, facilityOrId) {
  const facilityId =
    typeof facilityOrId === "string"
      ? normalizeOwnedFacilityId(facilityOrId)
      : normalizeOwnedFacilityId(facilityOrId?._id || facilityOrId?.facilityId);
  if (!facilityId) {
    toast.error("Facility messaging unavailable", {
      description: "This listing does not have a linked CareMatch account yet.",
    });
    return Promise.resolve(false);
  }
  return openAdminConversation(navigate, { facilityId });
}

export function messageAdminUser(navigate, recipientId) {
  const id = String(recipientId || "").trim();
  if (!id) {
    toast.error("User messaging unavailable");
    return Promise.resolve(false);
  }
  return openAdminConversation(navigate, { recipientId: id });
}

export function messageAdminSnfPartner(navigate, partner) {
  const recipientId = partner?.facilityUserId || partner?.facility_user_id;
  if (recipientId) {
    return openAdminConversation(navigate, { recipientId: String(recipientId) });
  }
  const partnerId = partner?.id || partner?._id;
  if (partnerId) {
    return openAdminConversation(navigate, { snfPartnerId: String(partnerId) });
  }
  toast.error("SNF messaging unavailable", {
    description: "This partner does not have a login account yet.",
  });
  return Promise.resolve(false);
}
