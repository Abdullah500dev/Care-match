import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import { HelmetProvider } from "react-helmet-async";

import "./index.css";
import App from "./App.jsx";
import MyThemeProvider from "./theme";
import PreLoader from "./components/common/PreLoader";
import store, { Persistor } from "./store/store.js";

if (process.env.NODE_ENV === "production") disableReactDevTools();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <HelmetProvider>
        <MyThemeProvider>
          <PersistGate loading={<PreLoader />} persistor={Persistor}>
            <Suspense fallback={<PreLoader />}>
              <App />
            </Suspense>
          </PersistGate>
        </MyThemeProvider>
      </HelmetProvider>
    </Provider>
  </React.StrictMode>
);
