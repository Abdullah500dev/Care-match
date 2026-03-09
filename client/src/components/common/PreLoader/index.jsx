import React from "react";

export default function PreLoader() {
  return (
    <div className="preloader">
      <div className="preloader-inner">
        <img
          src="/assets/images/favicon/favicon.svg"
          alt="CareMatch AI"
          className="preloader-logo"
        />
        <p className="preloader-text">CareMatch AI</p>
      </div>
    </div>
  );
}
