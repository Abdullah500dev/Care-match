import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ScrollToTop from "../utils/scroll-top";
import PreLoader from "../components/common/PreLoader";

// Eager-load all client pages to avoid "Failed to fetch dynamically imported module"
import Home from "../pages/client/Home";
import Page1 from "../pages/client/Page1";
import Page2 from "../pages/client/Page2";
import Contact from "../pages/client/Contact";
import Profile from "../pages/client/Profile";
import IntakeSearch from "../pages/client/IntakeSearch";
import NotFound from "../pages/common/NotFound";

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

import Header from "../components/client/Header";
import TopBar from "../components/client/TopBar";
import Footer from "../components/client/Footer";
import DashboardLayout from "../components/dashboard/layout/DashboardLayout";

const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith("/dashboard");

  return (
    <>
      <div className="sticky top-0 z-50 w-full">
        <TopBar />
        {!isDashboardRoute && <Header />}
      </div>
      {children}
      {!isDashboardRoute && <Footer />}
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
              <Route path="/find-care" element={<IntakeSearch />} />

              <Route path="/dashboard/*" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="residents" element={<DashboardResidents />} />
                <Route path="communities" element={<DashboardCommunities />} />
                <Route path="snf-partners" element={<DashboardSNFPartners />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="calendar" element={<DashboardCalendar />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="settings" element={<DashboardSettings />} />
              </Route>

              <Route path="/*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Suspense>
      </ScrollToTop>
    </BrowserRouter>
  );
}
