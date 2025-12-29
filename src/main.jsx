import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";

// global styles: admin.css (sidebar/topbar) + style.css (page content)
import "./styles/admin.css";
import "./styles/style.css";
import "./styles/tailwind.css";

const router = createBrowserRouter([
  {
    path: "/*",
    element: <App />,
    errorElement: <div style={{padding:20}}>Unexpected Application Error! (route)</div>
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
