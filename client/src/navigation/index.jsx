import { Suspense, lazy, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronUp } from "lucide-react";

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
const DashboardHome = lazyWithRetry(() => import("../pages/dashboard/DashboardHome"));
const DashboardResidents = lazyWithRetry(() => import("../pages/dashboard/Residents"));
const DashboardCommunities = lazyWithRetry(() => import("../pages/dashboard/Communities"));
const DashboardSNFPartners = lazyWithRetry(() =>
  import("../pages/dashboard/SNFPartners/index")
);
const DashboardMessages = lazyWithRetry(() => import("../pages/dashboard/Messages"));
const DashboardSettings = lazyWithRetry(() => import("../pages/dashboard/Settings"));
const DashboardCalendar = lazyWithRetry(() => import("../pages/dashboard/Calendar"));
const DashboardAnalytics = lazyWithRetry(() => import("../pages/dashboard/Analytics"));
const UserDashboardHome = lazyWithRetry(() => import("../pages/userDashboard/UserDashboardHome"));
const FacilityDashboardHome = lazyWithRetry(() => import("../pages/facilityDashboard/FacilityDashboardHome"));

import Header from "../components/client/Header";
import TopBar from "../components/client/TopBar";
import Footer from "../components/client/Footer";
import DashboardLayout from "../components/dashboard/layout/DashboardLayout";
import UserDashboardLayout from "../components/userDashboard/layout/UserDashboardLayout";
import FacilityDashboardLayout from "../components/facilityDashboard/layout/FacilityDashboardLayout";
import { getUser } from "../store/auth/authSlice";

const RequireAuth = ({ children }) => {
  const { isAuthenticated, token } = useSelector(getUser);
  const location = useLocation();
  const persistedToken = localStorage.getItem("access_token");
  const canAccessDashboard = Boolean(isAuthenticated && (token || persistedToken));

  if (!canAccessDashboard) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return children;
};

const getHomeByRole = (userData) => {
  const role = userData?.role;
  const userType = userData?.user_type;

  if (["admin", "authenticator", "moderator"].includes(userType)) return "/dashboard";
  if (role === "facility") return "/facility-dashboard";
  if (role === "user") return "/user-dashboard";
  return "/dashboard";
};

const RequireUserRole = ({ children }) => {
  const { userData } = useSelector(getUser);
  const location = useLocation();
  const isAdminStaff = ["admin", "authenticator", "moderator"].includes(userData?.user_type);

  if (isAdminStaff || userData?.role !== "user") {
    return <Navigate to={getHomeByRole(userData)} replace state={{ from: location }} />;
  }

  return children;
};

const RequireFacilityRole = ({ children }) => {
  const { userData } = useSelector(getUser);
  const location = useLocation();
  const isAdminStaff = ["admin", "authenticator", "moderator"].includes(userData?.user_type);

  if (isAdminStaff || userData?.role !== "facility") {
    return <Navigate to={getHomeByRole(userData)} replace state={{ from: location }} />;
  }

  return children;
};

const RequireAdminDashboard = ({ children }) => {
  const { userData } = useSelector(getUser);
  const location = useLocation();
  const userType = userData?.user_type;
  const isAdminStaff = ["admin", "authenticator", "moderator"].includes(userType);

  if (!isAdminStaff) {
    return <Navigate to={getHomeByRole(userData)} replace state={{ from: location }} />;
  }

  return children;
};

const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboardRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/user-dashboard") ||
    location.pathname.startsWith("/facility-dashboard");
  const isHomePage = location.pathname === "/";
  const topAnchorRef = useRef(null);
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);

  // Button only when user has scrolled past the trigger (never on hero).
  const showScrollToTop = !isDashboardRoute && scrollPastThreshold;

  // On home: trigger is below hero; use bottom rootMargin so button stays hidden when trigger is just below fold.
  // Defer observer setup on home so #scroll-to-top-trigger (rendered by Home) exists in the DOM; reset state when landing on home.
  useEffect(() => {
    if (isDashboardRoute) return;
    if (isHomePage) setScrollPastThreshold(false);

    const triggerId = isHomePage ? "scroll-to-top-trigger" : "page-top";

    const setupObserver = () => {
      const el = document.getElementById(triggerId);
      if (!el) return null;
      // Larger bottom margin on home so the button only shows after scrolling well past the Gallery (trigger must be above viewport).
      const rootMargin = isHomePage ? "0px 0px 100% 0px" : "0px";
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target.id !== triggerId) return;
            // On home: once user scrolls past the trigger, keep the button visible (don't hide when trigger re-enters view).
            if (isHomePage) {
              if (!entry.isIntersecting) setScrollPastThreshold(true);
            } else {
              setScrollPastThreshold(!entry.isIntersecting);
            }
          });
        },
        { threshold: 0, rootMargin }
      );
      observer.observe(el);
      return observer;
    };

    let observer = null;
    let retryId = null;
    if (isHomePage) {
      const trySetup = () => {
        observer = setupObserver();
        if (!observer) retryId = setTimeout(trySetup, 80);
      };
      const t = setTimeout(trySetup, 0);
      return () => {
        clearTimeout(t);
        if (retryId) clearTimeout(retryId);
        observer?.disconnect();
      };
    }
    observer = setupObserver();
    return () => observer?.disconnect();
  }, [location.pathname, isDashboardRoute, isHomePage]);

  const scrollToTop = () => {
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
      {showScrollToTop &&
        createPortal(
          <button
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-[99999] flex h-14 w-14 items-center justify-center rounded-full bg-[#00CFF4] text-white shadow-xl transition-all duration-300 hover:bg-[#00b8d8] hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#00CFF4] focus:ring-offset-2"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-7 w-7" />
          </button>,
          document.body
        )}
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
              <Route path="/api/auth/reset-password" element={<ResetPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/dashboard/*"
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

              <Route
                path="/user-dashboard/*"
                element={
                  <RequireAuth>
                    <RequireUserRole>
                      <UserDashboardLayout />
                    </RequireUserRole>
                  </RequireAuth>
                }
              >
                <Route index element={<UserDashboardHome />} />
              </Route>

              <Route
                path="/facility-dashboard/*"
                element={
                  <RequireAuth>
                    <RequireFacilityRole>
                      <FacilityDashboardLayout />
                    </RequireFacilityRole>
                  </RequireAuth>
                }
              >
                <Route index element={<FacilityDashboardHome />} />
              </Route>

              <Route path="/*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Suspense>
      </ScrollToTop>
    </BrowserRouter>
  );
}
