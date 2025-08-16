/**
 * Test utilities with REAL context providers for integration tests
 */

import React from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { ToastProvider } from "./contexts/ToastContext";

// Wrapper with real providers
const RealProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ToastProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </ToastProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  rtlRender(ui, { wrapper: RealProviders, ...options });

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };
