import { Suspense, lazy, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ChevronUp } from "lucide-react";

import ScrollToTop from "../utils/scroll-top";
import PreLoader from "../components/common/PreLoader";

// Eager-load all client pages to avoid "Failed to fetch dynamically imported module"
import Home from "../pages/client/Home";
import Page1 from "../pages/client/Page1";
import Page2 from "../pages/client/Page2";
import Contact from "../pages/client/Contact";
import Profile from "../pages/client/Profile";
import IntakeSearch from "../pages/client/IntakeSearch";
import CareExplorer from "../pages/client/CareExplorer";
import Privacy from "../pages/client/Privacy";
import Terms from "../pages/client/Terms";
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

const SCROLL_SHOW_THRESHOLD = 80;

const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const isHomePage = location.pathname === "/";
  const topAnchorRef = useRef(null);
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);
  const [galleryInView, setGalleryInView] = useState(false);
  const [simpleProcessInView, setSimpleProcessInView] = useState(false);
  const [assistedLivingInView, setAssistedLivingInView] = useState(false);
  const [whyCareMatchInView, setWhyCareMatchInView] = useState(false);
  const [successStoriesInView, setSuccessStoriesInView] = useState(false);
  const [startYourSearchInView, setStartYourSearchInView] = useState(false);

  // Show button when user has scrolled down, or when on home and key sections are in view
  const showScrollToTop =
    scrollPastThreshold ||
    (isHomePage &&
      (galleryInView ||
        simpleProcessInView ||
        assistedLivingInView ||
        whyCareMatchInView ||
        successStoriesInView ||
        startYourSearchInView));

  useEffect(() => {
    if (isDashboardRoute) return;
    let ticking = false;
    const checkScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y =
          typeof window.scrollY !== "undefined"
            ? window.scrollY
            : document.documentElement.scrollTop ?? document.body.scrollTop ?? 0;
        setScrollPastThreshold(y > SCROLL_SHOW_THRESHOLD);
        ticking = false;
      });
    };
    checkScroll();
    const initialCheck = setTimeout(checkScroll, 100);
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      clearTimeout(initialCheck);
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [isDashboardRoute]);

  // When on home, show button when key sections are in view
  useEffect(() => {
    if (!isHomePage || isDashboardRoute) return;
    const galleryEl = document.getElementById("gallery-cards-section");
    const simpleProcessEl = document.getElementById("simple-process-section");
    const assistedLivingEl = document.getElementById("assisted-living-section");
    const whyCareMatchEl = document.getElementById("why-care-match-section");
    const successStoriesEl = document.getElementById("success-stories-section");
    const startYourSearchEl = document.getElementById("start-your-search-section");
    const hasAny =
      galleryEl || simpleProcessEl || assistedLivingEl || whyCareMatchEl || successStoriesEl || startYourSearchEl;
    if (!hasAny) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.id === "gallery-cards-section") setGalleryInView(entry.isIntersecting);
          if (entry.target.id === "simple-process-section") setSimpleProcessInView(entry.isIntersecting);
          if (entry.target.id === "assisted-living-section") setAssistedLivingInView(entry.isIntersecting);
          if (entry.target.id === "why-care-match-section") setWhyCareMatchInView(entry.isIntersecting);
          if (entry.target.id === "success-stories-section") setSuccessStoriesInView(entry.isIntersecting);
          if (entry.target.id === "start-your-search-section") setStartYourSearchInView(entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: "0px" }
    );

    if (galleryEl) observer.observe(galleryEl);
    if (simpleProcessEl) observer.observe(simpleProcessEl);
    if (assistedLivingEl) observer.observe(assistedLivingEl);
    if (whyCareMatchEl) observer.observe(whyCareMatchEl);
    if (successStoriesEl) observer.observe(successStoriesEl);
    if (startYourSearchEl) observer.observe(startYourSearchEl);

    return () => observer.disconnect();
  }, [isHomePage, isDashboardRoute]);

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
      {/* Scroll to top - all client pages, visible after scrolling down */}
      {!isDashboardRoute &&
        showScrollToTop &&
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
              <Route path="/find-care" element={<IntakeSearch />} />
              <Route path="/care-explorer" element={<CareExplorer />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

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
