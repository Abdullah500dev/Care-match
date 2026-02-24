import React from "react";

export default function PreLoader() {
  return (
    <>
      <div className="preloader">
        <div className="vertical-centered-box">
          <div className="content">
            <div className="loader-circle"></div>
            <div className="loader-line-mask">
              <div className="loader-line"></div>
            </div>
            <img src="/assets/images/logo.png" alt="logo" width={100} />
          </div>
        </div>
      </div>
    </>
  );
}
