import React, { useEffect, Fragment } from "react";
import SEO from "../../../components/common/SEO";

import { sampleGetRequest } from "../../../services/sampleServices";

export default function Page1() {
  useEffect(() => {
    fetchSampleData();
  }, []);

  const fetchSampleData = async () => {
    try {
      const response = await sampleGetRequest("nathaniel");
      console.log("Sample Data:", response.data);
    } catch (error) {
      // Handle error appropriately
      console.error("Error fetching campaigns:", error);
    } finally {
      // Any cleanup or final actions can be performed here
    }
  };

  return (
    <Fragment>
      <SEO title="Page 1" />
      <div className="content-container bg-gradient-to-br from-gray-50 to-white flex flex-col overflow-hidden">
        {/* Page_1 Section */}
        <div>
          <div className="bg-slate-400 w-screen h-screen flex items-center justify-center">
            Page 1
          </div>
        </div>
      </div>
    </Fragment>
  );
}
