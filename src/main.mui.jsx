import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import "./styles/admin.css";
import "./styles/style.css";
import "./styles/tailwind.css";

const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#f50057" },
  },
  typography: {
    fontFamily: "Roboto, Arial",
  },
});

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
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);
