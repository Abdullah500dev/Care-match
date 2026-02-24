import React, { Fragment } from "react";
import SEO from "../../../components/common/SEO";

export default function Page2() {
  return (
    <Fragment>
      <SEO title="Page 2" />
      <div className="content-container bg-gradient-to-br from-gray-50 to-white flex flex-col overflow-hidden">
        {/* Page_2 Section */}
        <div>
          <div className="bg-stone-400 w-screen h-screen flex items-center justify-center">
            Page 2
          </div>
        </div>
      </div>
    </Fragment>
  );
}
