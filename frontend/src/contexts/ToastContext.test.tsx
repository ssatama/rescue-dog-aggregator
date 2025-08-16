import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ToastProvider, useToast } from "./ToastContext";

describe("ToastContext", () => {
  describe("ToastProvider", () => {
    it("provides toast context to children", () => {
      const TestComponent = () => {
        const { showToast } = useToast();
        return (
          <button onClick={() => showToast("success", "Test message")}>
            Show Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      expect(screen.getByText("Show Toast")).toBeInTheDocument();
    });

    it("throws error when useToast is used outside provider", () => {
      const TestComponent = () => {
        useToast();
        return <div>Test</div>;
      };

      const spy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        "useToast must be used within a ToastProvider",
      );

      spy.mockRestore();
    });
  });

  describe("Toast functionality", () => {
    const TestComponent = () => {
      const { showToast, hideToast } = useToast();
      return (
        <div>
          <button onClick={() => showToast("success", "Success message")}>
            Show Success
          </button>
          <button onClick={() => showToast("add", "Dog added")}>
            Show Add
          </button>
          <button onClick={() => showToast("remove", "Dog removed")}>
            Show Remove
          </button>
          <button onClick={() => showToast("error", "Error occurred")}>
            Show Error
          </button>
          <button onClick={hideToast}>Hide Toast</button>
        </div>
      );
    };

    it("shows success toast when showToast is called", async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      const button = getByText("Show Success");

      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Success message")).toBeInTheDocument();
      });
    });

    it("shows add toast with correct type", async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      const button = getByText("Show Add");

      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Dog added")).toBeInTheDocument();
        expect(screen.getByText("❤️")).toBeInTheDocument();
      });
    });

    it("shows remove toast with correct type", async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      const button = getByText("Show Remove");

      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Dog removed")).toBeInTheDocument();
        expect(screen.getByText("💔")).toBeInTheDocument();
      });
    });

    it("hides toast when hideToast is called", async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      act(() => {
        getByText("Show Success").click();
      });

      await waitFor(() => {
        expect(screen.getByText("Success message")).toBeInTheDocument();
      });

      act(() => {
        getByText("Hide Toast").click();
      });

      await waitFor(() => {
        expect(screen.queryByText("Success message")).not.toBeInTheDocument();
      });
    });

    it("auto-hides toast after default duration", async () => {
      jest.useFakeTimers();

      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      act(() => {
        getByText("Show Success").click();
      });

      expect(screen.getByText("Success message")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Success message")).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("replaces current toast when new one is shown", async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      act(() => {
        getByText("Show Success").click();
      });

      await waitFor(() => {
        expect(screen.getByText("Success message")).toBeInTheDocument();
      });

      act(() => {
        getByText("Show Error").click();
      });

      await waitFor(() => {
        expect(screen.queryByText("Success message")).not.toBeInTheDocument();
        expect(screen.getByText("Error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("Configuration options", () => {
    it("allows custom duration to be set", async () => {
      jest.useFakeTimers();

      const TestComponent = () => {
        const { showToast } = useToast();
        return (
          <button
            onClick={() => showToast("success", "Test", { duration: 5000 })}
          >
            Show Toast
          </button>
        );
      };

      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      act(() => {
        getByText("Show Toast").click();
      });

      expect(screen.getByText("Test")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should still be visible after 3 seconds
      expect(screen.getByText("Test")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should be hidden after 5 seconds total
      await waitFor(() => {
        expect(screen.queryByText("Test")).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("allows position to be configured", async () => {
      const TestComponent = () => {
        const { showToast } = useToast();
        return (
          <button
            onClick={() =>
              showToast("success", "Top toast", { position: "top" })
            }
          >
            Show Top Toast
          </button>
        );
      };

      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>,
      );

      act(() => {
        getByText("Show Top Toast").click();
      });

      await waitFor(() => {
        const toast = screen.getByRole("alert");
        expect(toast.parentElement).toHaveClass("top-4");
      });
    });
  });
});
