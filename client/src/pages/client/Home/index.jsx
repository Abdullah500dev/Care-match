import React, { Fragment, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SEO from "../../../components/common/SEO";
import Banner from "../../../components/client/Banner";

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo) {
      const targetId = location.state.scrollTo;
      const el = document.getElementById(targetId);
      if (el) {
        const yOffset = -80;
        const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }

      // Clear scroll state so it doesn't persist
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <Fragment>
      <SEO title="Home" />
      <div
        className="content-container flex flex-col overflow-hidden"
        // style={{
        //   background:
        //     "linear-gradient(180deg, rgba(255, 255, 255, 0) 70%, #FFFFFF 95%)",
        // }}
      >
        <Banner />

        {/* How It Works */}
        <div id="how-it-works">
          <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
            How It Works
          </div>
        </div>

        {/* Care Types */}
        <div id="care-types">
          <div className="flex h-screen w-screen items-center justify-center bg-slate-200">
            Care Types
          </div>
        </div>

        {/* Why Us */}
        <div id="why-us">
          <div className="flex h-screen w-screen items-center justify-center bg-slate-300">
            Why Us
          </div>
        </div>

        {/* Resources */}
        <div id="resources">
          <div className="flex h-screen w-screen items-center justify-center bg-slate-400">
            Resources
          </div>
        </div>

        {/* Contact */}
        <div id="contact">
          <div className="flex h-screen w-screen items-center justify-center bg-slate-500">
            Contact
          </div>
        </div>
      </div>
    </Fragment>
  );
}
