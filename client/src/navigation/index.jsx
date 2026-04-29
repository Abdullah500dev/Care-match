import { Suspense, lazy, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ChevronUp } from "lucide-react";
import { toast } from "sonner";

import ScrollToTop from "../utils/scroll-top";
import PreLoader from "../components/common/PreLoader";

// Eager-load all client pages to avoid "Failed to fetch dynamically imported module"
import Home from "../pages/client/Home";
import Page1 from "../pages/client/Page1";
import Page2 from "../pages/client/Page2";
import Contact from "../pages/client/Contact";
import Profile from "../pages/client/Profile";
import Register from "../pages/client/Register";
import IntakeSearch from "../pages/client/IntakeSearch";
import CareExplorer from "../pages/client/CareExplorer";
import Privacy from "../pages/client/Privacy";
import Terms from "../pages/client/Terms";
import FAQ from "../pages/client/FAQ";
import WhyUs from "../pages/client/WhyUs";
import NotFound from "../pages/common/NotFound";
import Signin from "../pages/auth/Signin";
import AdminSignin from "../pages/auth/AdminSignin";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// Retry wrapper for lazy imports - reloads page on chunk fetch failure (stale cache)
const lazyWithRetry = (importFn) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (e) {
      if (e?.message?.includes("Failed to fetch dynamically imported module")) {
        window.location.reload();
      }
      throw e;
    }
  });

// dashboard pages (lazy - less frequently used)
const DashboardHome = lazyWithRetry(
  () => import("../pages/dashboard/DashboardHome"),
);
const DashboardResidents = lazyWithRetry(
  () => import("../pages/dashboard/Residents"),
);
const DashboardCommunities = lazyWithRetry(
  () => import("../pages/dashboard/Communities"),
);
const DashboardSNFPartners = lazyWithRetry(
  () => import("../pages/dashboard/SNFPartners/index"),
);
const DashboardMessages = lazyWithRetry(
  () => import("../pages/dashboard/Messages"),
);
const DashboardSettings = lazyWithRetry(
  () => import("../pages/dashboard/Settings"),
);
const DashboardCalendar = lazyWithRetry(
  () => import("../pages/dashboard/Calendar"),
);
const DashboardAnalytics = lazyWithRetry(
  () => import("../pages/dashboard/Analytics"),
);
const UserDashboardHome = lazyWithRetry(
  () => import("../pages/userDashboard/UserDashboardHome"),
);
const UserDashboardMessages = lazyWithRetry(
  () => import("../pages/userDashboard/UserDashboardMessages"),
);
const UserDashboardSettings = lazyWithRetry(
  () => import("../pages/userDashboard/UserDashboardSettings"),
);
const UserDashboardFacilities = lazyWithRetry(
  () => import("../pages/userDashboard/UserDashboardFacilities"),
);
const FacilityDashboardHome = lazyWithRetry(
  () => import("../pages/facilityDashboard/FacilityDashboardHome"),
);
const FacilityDashboardFacilities = lazyWithRetry(
  () => import("../pages/facilityDashboard/FacilityDashboardFacilities"),
);

import Header from "../components/client/Header";
import TopBar from "../components/client/TopBar";
import Footer from "../components/client/Footer";
import DashboardLayout from "../components/dashboard/layout/DashboardLayout";
import UserDashboardLayout from "../components/userDashboard/layout/UserDashboardLayout";
import FacilityDashboardLayout from "../components/facilityDashboard/layout/FacilityDashboardLayout";
import { clearUser, getUser } from "../store/auth/authSlice";
import { clearPersistedAuthTokens } from "../services/authServices";

const isJwtExpired = (token) => {
  if (!token) return true;

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const payload = JSON.parse(atob(payloadBase64));
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const RequireAuth = ({ children }) => {
  const { isAuthenticated, token } = useSelector(getUser);
  const dispatch = useDispatch();
  const location = useLocation();
  const currentToken = token || localStorage.getItem("access_token");
  const canAccessDashboard = Boolean(
    isAuthenticated && currentToken && !isJwtExpired(currentToken),
  );

  if (!canAccessDashboard) {
    clearPersistedAuthTokens();
    dispatch(clearUser());
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return children;
};

const getHomeByRole = (userData) => {
  const role = userData?.role;
  const userType = userData?.user_type;

  if (["admin", "authenticator", "moderator"].includes(userType))
    return "/admin";
  if (role === "facility") return "/facility";
  if (role === "user") return "/";
  // Default unknown/non-staff users to website home to avoid accidental admin redirects.
  return "/";
};

const RequireUserRole = ({ children }) => {
  const { userData } = useSelector(getUser);
  const location = useLocation();
  const isAdminStaff = ["admin", "authenticator", "moderator"].includes(
    userData?.user_type,
  );

  if (isAdminStaff || userData?.role !== "user") {
    return (
      <Navigate
        to={getHomeByRole(userData)}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

const RequireFacilityRole = ({ children }) => {
  const { userData } = useSelector(getUser);
  const location = useLocation();
  const isAdminStaff = ["admin", "authenticator", "moderator"].includes(
    userData?.user_type,
  );

  if (isAdminStaff || userData?.role !== "facility") {
    return (
      <Navigate
        to={getHomeByRole(userData)}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

const RequireAdminDashboard = ({ children }) => {
  const { userData } = useSelector(getUser);
  const location = useLocation();
  const userType = userData?.user_type;
  const isAdminStaff = ["admin", "authenticator", "moderator"].includes(
    userType,
  );

  if (!isAdminStaff) {
    return (
      <Navigate
        to={getHomeByRole(userData)}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/portal") ||
    location.pathname.startsWith("/facility");
  const isHomePage = location.pathname === "/";
  const topAnchorRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const reminderToastIdRef = useRef(null);
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Button only when user has scrolled past the trigger (never on hero).
  const showScrollToTop = scrollPastThreshold && !isChatOpen;

  const getCurrentScrollTop = () =>
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.scrollingElement?.scrollTop ||
    document.body.scrollTop ||
    0;

  const getCurrentScrollPercent = () => {
    const scrollTop = getCurrentScrollTop();
    const doc = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(
      doc?.scrollHeight || 0,
      body?.scrollHeight || 0,
      doc?.offsetHeight || 0,
      body?.offsetHeight || 0,
    );
    const viewportHeight = window.innerHeight || doc?.clientHeight || 0;
    const scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
    if (scrollableHeight <= 0) return 0;
    return scrollTop / scrollableHeight;
  };

  // Keep scroll-to-top visibility tied directly to current scroll position.
  useEffect(() => {
    const getDashboardScrollTop = () => {
      const dashboardMain = document.querySelector("main.overflow-y-auto");
      return dashboardMain?.scrollTop || 0;
    };

    const onScroll = () => {
      const top = Math.max(getCurrentScrollTop(), getDashboardScrollTop());
      const percent = getCurrentScrollPercent();
      const dashMain = document.querySelector("main");
      const dashScrollTop = dashMain?.scrollTop || 0;
      const homeThresholdPercent = 0.12;
      setScrollPastThreshold(
        top > 24 ||
        dashScrollTop > 120 ||
        percent >= homeThresholdPercent
      );
    };

    const dashMain = document.querySelector("main");
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    dashMain?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      dashMain?.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    const onChatOpenChange = (event) => {
      setIsChatOpen(Boolean(event?.detail?.isOpen));
    };
    window.addEventListener("carematch:chat-open-change", onChatOpenChange);
    return () => {
      window.removeEventListener(
        "carematch:chat-open-change",
        onChatOpenChange,
      );
    };
  }, []);

  useEffect(() => {
    const onScrollToTop = () => scrollToTop();
    window.addEventListener("carematch:scroll-to-top", onScrollToTop);
    return () => window.removeEventListener("carematch:scroll-to-top", onScrollToTop);
  }, []);

  useEffect(() => {
    const INACTIVITY_MS = 30 * 1000;
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    const clearInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };

    const openChatFromReminder = () => {
      navigate("/", { state: { scrollTo: "search-bar" } });
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("carematch:open-chat-request"));
      }, 250);
    };

    const showHelpReminder = () => {
      if (isChatOpen) return;
      reminderToastIdRef.current = toast.custom(
        () => (
          <div className="relative -mr-4 mb-24 w-[310px] animate-[carrieReminderIn_420ms_ease-out]">
            <button
              type="button"
              onClick={openChatFromReminder}
              className="ml-auto flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-[14px] font-medium text-slate-900 shadow-[0_14px_32px_rgba(0,0,0,0.2)] outline-none ring-1 ring-black/5 transition hover:shadow-[0_18px_38px_rgba(0,0,0,0.24)] focus-visible:ring-2 focus-visible:ring-[#00CFF4]"
              aria-label="Open Carrie chat"
            >
              <span className="leading-snug">Hi, I&apos;m Carrie. What can I help you with?</span>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_10px_22px_rgba(0,0,0,0.16)] ring-1 ring-black/10 animate-[carrieIconBounce_2.2s_ease-in-out_infinite]">
                <img
                  src="/assets/images/favicon/favicon.svg"
                  alt="CareMatch"
                  className="h-7 w-7 object-contain"
                />
              </span>
            </button>
          </div>
        ),
        {
          id: "carematch-help-reminder",
          duration: 10000,
          position: "bottom-right",
        },
      );
    };

    const scheduleReminder = () => {
      clearInactivityTimer();
      inactivityTimerRef.current = window.setTimeout(showHelpReminder, INACTIVITY_MS);
    };

    // Trigger reminder 1 minute after landing and also after fresh inactivity windows.
    scheduleReminder();
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, scheduleReminder, { passive: true });
    }

    return () => {
      clearInactivityTimer();
      if (reminderToastIdRef.current) {
        toast.dismiss(reminderToastIdRef.current);
      }
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, scheduleReminder);
      }
    };
  }, [isChatOpen, navigate, location.pathname]);

  const scrollToTop = () => {
    // Scroll the dashboard <main> container first (covers portal/dashboard routes)
    const dashMain = document.querySelector("main");
    if (dashMain) dashMain.scrollTo({ top: 0, behavior: "smooth" });
    topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("page-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.scrollingElement?.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div id="page-top" ref={topAnchorRef} aria-hidden="true" />
      <div className="sticky top-0 z-50 w-full">
        <TopBar />
        {!isDashboardRoute && <Header />}
      </div>
      {children}
      {!isDashboardRoute && <Footer />}
      {/* Scroll to top - visible across the entire site */}
      {createPortal(
        <button
          type="button"
          onClick={scrollToTop}
          className={`group fixed bottom-8 right-8 z-[99999] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] via-[#00CFF4] to-[#00A9D6] text-white shadow-[0_12px_30px_rgba(0,207,244,0.45)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:shadow-[0_16px_36px_rgba(0,207,244,0.55)] focus:outline-none focus:ring-2 focus:ring-[#00CFF4] focus:ring-offset-2 ${
            showScrollToTop
              ? "translate-y-0 scale-100 opacity-100 pointer-events-auto animate-[floatUp_2.8s_ease-in-out_infinite]"
              : "translate-y-6 scale-90 opacity-0 pointer-events-none"
          }`}
          aria-label="Scroll to top"
        >
          <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100" />
          <ChevronUp className="relative h-7 w-7 transition-transform duration-300 group-hover:-translate-y-0.5" />
        </button>,
        document.body,
      )}
      <style>
        {`
          @keyframes floatUp {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
            }
          }

          @keyframes carrieReminderIn {
            from {
              opacity: 0;
              transform: translateY(14px) scale(0.98);
              filter: blur(1px);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes carrieIconBounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-6px);
            }
          }
        `}
      </style>
    </>
  );
};

export default function Navigation() {
  return (
    <BrowserRouter>
      <ScrollToTop>
        <Suspense fallback={<PreLoader />}>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/page_1" element={<Page1 />} />
              <Route path="/page_2" element={<Page2 />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/register" element={<Register />} />
              <Route path="/find-care" element={<IntakeSearch />} />
              <Route path="/care-explorer" element={<CareExplorer />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/faqs" element={<FAQ />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="/Signin" element={<Signin />} />
              <Route path="/signin" element={<Signin />} />
              <Route path="/login" element={<Signin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/api/auth/reset-password"
                element={<ResetPassword />}
              />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/admin/login" element={<AdminSignin />} />

              {/* ── Admin Panel (/admin/*) ───────────────────────── */}
              <Route
                path="/admin/*"
                element={
                  <RequireAuth>
                    <RequireAdminDashboard>
                      <DashboardLayout />
                    </RequireAdminDashboard>
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="residents" element={<DashboardResidents />} />
                <Route path="communities" element={<DashboardCommunities />} />
                <Route path="snf-partners" element={<DashboardSNFPartners />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="calendar" element={<DashboardCalendar />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="settings" element={<DashboardSettings />} />
              </Route>

              {/* ── User Portal (/portal/*) ──────────────────────── */}
              <Route
                path="/portal/*"
                element={
                  <RequireAuth>
                    <RequireUserRole>
                      <UserDashboardLayout />
                    </RequireUserRole>
                  </RequireAuth>
                }
              >
                <Route index element={<UserDashboardHome />} />
                <Route
                  path="communities"
                  element={<UserDashboardFacilities />}
                />
                <Route path="messages" element={<UserDashboardMessages />} />
                <Route path="settings" element={<UserDashboardSettings />} />
              </Route>

              {/* ── Facility Portal (/facility/*) ────────────────── */}
              <Route
                path="/facility/*"
                element={
                  <RequireAuth>
                    <RequireFacilityRole>
                      <FacilityDashboardLayout />
                    </RequireFacilityRole>
                  </RequireAuth>
                }
              >
                <Route index element={<FacilityDashboardHome />} />
                <Route
                  path="communities"
                  element={<FacilityDashboardFacilities />}
                />
                <Route path="messages" element={<UserDashboardMessages />} />
                <Route path="settings" element={<UserDashboardSettings />} />
              </Route>

              <Route path="/*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Suspense>
      </ScrollToTop>
    </BrowserRouter>
  );
}
