import React from "react";
import { Toaster } from "sonner";
import "./App.css";
import Navigation from "./navigation";

export default function App() {
  return (
    <div className="App min-w-0 max-w-full">
      <Navigation />
      <Toaster richColors position="top-right" />
    </div>
  );
}
