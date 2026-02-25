import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ScrollToTop from "../utils/scroll-top";
import PreLoader from "../components/common/PreLoader";

// client pages
const Home = lazy(() => import("../pages/client/Home"));
const Page1 = lazy(() => import("../pages/client/Page1"));
const Page2 = lazy(() => import("../pages/client/Page2"));

const NotFound = lazy(() => import("../pages/common/NotFound"));

import Header from "../components/client/Header";
import TopBar from "../components/client/TopBar";
import Footer from "../components/client/Footer";

const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith("/dashboard");

  return (
    <>
      {!isDashboardRoute && (
        <div className="sticky top-0 z-50 w-full">
          <TopBar />
          <Header />
        </div>
      )}
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
              <Route path="/*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Suspense>
      </ScrollToTop>
    </BrowserRouter>
  );
}
