import React from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

export default function SEO({
  title = `${import.meta.env.VITE_REACT_APP_PROJECT_NAME}`,
  tagline = `${import.meta.env.VITE_REACT_APP_PROJECT_TAGLINE}`,
  description = `${import.meta.env.VITE_REACT_APP_PROJECT_DESCRIPTION}`,
}) {
  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title>
          {title} | {tagline}
        </title>
        <meta name="description" content={description} />
      </Helmet>
    </HelmetProvider>
  );
}
