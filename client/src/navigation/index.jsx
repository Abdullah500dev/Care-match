import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ScrollToTop from "../utils/scroll-top";
import PreLoader from "../components/common/PreLoader";

// client pages
const Home = lazy(() => import("../pages/client/Home"));
const Page1 = lazy(() => import("../pages/client/Page1"));
const Page2 = lazy(() => import("../pages/client/Page2"));

// dashboard pages
const DashboardHome = lazy(() => import("../pages/dashboard/DashboardHome"));
const DashboardResidents = lazy(() => import("../pages/dashboard/Residents"));
const DashboardCommunities = lazy(() => import("../pages/dashboard/Communities"));
const DashboardMessages = lazy(() => import("../pages/dashboard/Messages"));
const DashboardSettings = lazy(() => import("../pages/dashboard/Settings"));
const DashboardCalendar = lazy(() => import("../pages/dashboard/Calendar"));
const DashboardAnalytics = lazy(() => import("../pages/dashboard/Analytics"));

const NotFound = lazy(() => import("../pages/common/NotFound"));

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

              <Route path="/dashboard/*" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="residents" element={<DashboardResidents />} />
                <Route path="communities" element={<DashboardCommunities />} />
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
