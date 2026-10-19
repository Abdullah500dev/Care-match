import React from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

const DEFAULT_TITLE = "CareMatch AI";
const DEFAULT_TAGLINE = "Find the right care for your loved one";
const DEFAULT_DESCRIPTION =
  "Search verified senior living communities by location, care type, and the services that matter most.";

export default function SEO({
  title = import.meta.env.VITE_REACT_APP_PROJECT_NAME || DEFAULT_TITLE,
  tagline = import.meta.env.VITE_REACT_APP_PROJECT_TAGLINE || DEFAULT_TAGLINE,
  description =
    import.meta.env.VITE_REACT_APP_PROJECT_DESCRIPTION || DEFAULT_DESCRIPTION,
}) {
  const safeTitle = String(title || DEFAULT_TITLE).trim() || DEFAULT_TITLE;
  const safeTagline = String(tagline || DEFAULT_TAGLINE).trim() || DEFAULT_TAGLINE;
  const safeDescription =
    String(description || DEFAULT_DESCRIPTION).trim() || DEFAULT_DESCRIPTION;

  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title>
          {safeTitle} | {safeTagline}
        </title>
        <meta name="description" content={safeDescription} />
      </Helmet>
    </HelmetProvider>
  );
}
