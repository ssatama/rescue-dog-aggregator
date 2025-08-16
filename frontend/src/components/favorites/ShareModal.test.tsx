import React from "react";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import "@testing-library/jest-dom";
import { ShareModal } from "./ShareModal";
import { ToastProvider } from "../../contexts/ToastContext";

// Wrapper for tests
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.open for social shares
const mockOpen = jest.fn();
window.open = mockOpen;

describe("ShareModal", () => {
  const mockOnClose = jest.fn();
  const defaultUrl =
    "https://rescuedogs.me/favorites?shared=eyJpZHMiOlsxLDIsMl19";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the modal when open", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    expect(screen.getByText("Share Your Favorites")).toBeInTheDocument();
    expect(
      screen.getByText(/Share this collection with others/i),
    ).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <ShareModal isOpen={false} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    expect(screen.queryByText("Share Your Favorites")).not.toBeInTheDocument();
  });

  it("should display the share URL", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const urlInput = screen.getByDisplayValue(defaultUrl);
    expect(urlInput).toBeInTheDocument();
  });

  it("should copy URL to clipboard when copy button is clicked", async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const copyButtons = screen.getAllByRole("button", { name: /copy link/i });
    fireEvent.click(copyButtons[0]); // Click the icon button, not the row button

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(defaultUrl);
    });
  });

  it("should show copied confirmation after successful copy", async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const copyButtons = screen.getAllByRole("button", { name: /copy link/i });
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("should open email client when email button is clicked", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const emailButton = screen.getByRole("button", {
      name: /share via email/i,
    });
    fireEvent.click(emailButton);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("mailto:?subject="),
      "_blank",
    );
  });

  it("should open WhatsApp when WhatsApp button is clicked", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const whatsappButton = screen.getByRole("button", {
      name: /share via whatsapp/i,
    });
    fireEvent.click(whatsappButton);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
  });

  it("should open SMS when SMS button is clicked", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const smsButton = screen.getByRole("button", { name: /share via sms/i });
    fireEvent.click(smsButton);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("sms:?body="),
      "_blank",
    );
  });

  it("should display privacy notice", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    expect(screen.getByText(/no personal data is shared/i)).toBeInTheDocument();
  });

  it("should close modal when close button is clicked", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    // Get the X button specifically (not the "Close" text button)
    const closeButton = screen.getByRole("button", { name: "Close modal" });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should close modal when backdrop is clicked", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const backdrop = screen.getByTestId("modal-backdrop");
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should close modal when Escape key is pressed", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should have proper accessibility attributes", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const modal = screen.getByRole("dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");
    expect(modal).toHaveAttribute("aria-labelledby");
  });

  it("should trap focus within modal", () => {
    render(
      <ShareModal isOpen={true} url={defaultUrl} onClose={mockOnClose} />,
      { wrapper },
    );

    const modal = screen.getByRole("dialog");
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    expect(focusableElements.length).toBeGreaterThan(0);
  });
});
