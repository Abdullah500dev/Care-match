import React, { Fragment, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SEO from "../../../components/common/SEO";

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
      <div className="content-container bg-gradient-to-br from-gray-50 to-white flex flex-col overflow-hidden">
        {/* Section_1 Section */}
        <div id="section-1">
          <div className="bg-slate-400 w-screen h-screen flex items-center justify-center">
            Home Section 1
          </div>
        </div>

        {/* Section_2 Section */}
        <div id="section-2">
          <div className="bg-stone-400 w-screen h-screen flex items-center justify-center">
            Home Section 2
          </div>
        </div>
      </div>
    </Fragment>
  );
}
