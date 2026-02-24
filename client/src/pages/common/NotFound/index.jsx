import React, { Fragment } from "react";
import SEO from "../../../components/common/SEO";

export default function NotFound() {
  return (
    <Fragment>
      <SEO title="Not Found" />
      <div className="content-container bg-gradient-to-br from-gray-50 to-white">
        Not Found
      </div>
    </Fragment>
  );
}
