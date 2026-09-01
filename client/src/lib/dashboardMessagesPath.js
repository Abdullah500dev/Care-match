/** Messages route for the signed-in dashboard (admin, portal, facility, or SNF). */
export function getDashboardMessagesPath(userData) {
  const userType = userData?.user_type;
  if (["admin", "authenticator", "moderator"].includes(userType)) {
    return "/admin/messages";
  }
  const role = userData?.role;
  if (role === "facility") return "/facility/messages";
  if (role === "snf") return "/snf/messages";
  return "/portal/messages";
}
