import React, { Fragment, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SEO from "../../../components/common/SEO";
import AssistedLiving from "../../../components/client/AssistedLiving";
import Banner from "../../../components/client/Banner";
import Gallery from "../../../components/client/Gallery";
import SimpleProcess from "../../../components/client/SimpleProcess";
import StartYourSearch from "../../../components/client/StartYourSearch";
import SuccessStories from "../../../components/client/SuccessStories";
import WhyCareMatch from "../../../components/client/WhyCareMatch";

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
      <div className="content-container flex w-full min-h-screen flex-col overflow-hidden bg-white">
        <Banner />

        <Gallery />

        <SimpleProcess />


        <AssistedLiving />

        <WhyCareMatch />

        <SuccessStories />

        <StartYourSearch />
      </div>
    </Fragment>
  );
}
