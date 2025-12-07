import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { HomePage } from "@acme/frontend/pages/home";
import { LoginPage } from "@acme/frontend/pages/login";
import { RegisterPage } from "@acme/frontend/pages/register";
import { queryClient } from "@acme/frontend/shared/config/query";
import { Toaster } from "@acme/frontend/shared/ui/sonner";
import { ThemeProvider } from "@acme/frontend/shared/ui/theme-provider";

import "./index.css";

import { CreateAdventure } from "@acme/frontend/pages/create-adventure";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The root element not found");
}

const app = (
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/create" element={<CreateAdventure />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(rootElement));
  root.render(app);
} else {
  const root = createRoot(rootElement);
  root.render(app);
}
