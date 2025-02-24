import React from "react";
import ReactDOM from "react-dom/client";
// Import React Router
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import pages/components
import HomePage from "./components/HomePage.jsx";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Home page at "/" */}
        <Route path="/" element={<HomePage />} />

        {/* The WAF toggles & other flows at "/app" */}
        <Route path="/app" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
