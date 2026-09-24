import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogGallery from "../DogGallery";
import { trackGalleryPhotoViewed } from "@/lib/analytics";
import { reportError } from "@/utils/logger";
import type { DogImage } from "@/types/dog";

jest.mock("@/lib/analytics", () => ({
  trackGalleryPhotoViewed: jest.fn(),
}));
jest.mock("@/utils/logger", () => ({
  reportError: jest.fn(),
}));

const CDN = "https://images.rescuedogs.me/rescue_dogs/test";
const photos = (n: number): DogImage[] =>
  Array.from({ length: n }, (_, i) => ({ url: `${CDN}/p${i + 1}.jpg`, width: 1200, height: 900 }));

function renderGallery(images: DogImage[]) {
  return render(<DogGallery dogId={7} dogName="Dolly" images={images} />);
}

describe("DogGallery", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows a single photo without any gallery chrome", () => {
    renderGallery(photos(1));

    expect(screen.getByAltText("Dolly")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("gallery-thumbs")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gallery-dots")).not.toBeInTheDocument();
    expect(screen.getByTestId("dog-gallery")).not.toHaveAttribute("aria-roledescription");
  });

  it("renders nothing without photos", () => {
    const { container } = renderGallery([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("steps through photos with the arrows and announces the position", () => {
    renderGallery(photos(4));
    const prev = screen.getByRole("button", { name: "Previous photo" });
    const next = screen.getByRole("button", { name: "Next photo" });

    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    expect(prev).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    expect(screen.getByText("2 / 4").closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
    expect(prev).toBeEnabled();
  });

  it("moves with the arrow, Home and End keys", () => {
    renderGallery(photos(5));
    const gallery = screen.getByTestId("dog-gallery");

    fireEvent.keyDown(gallery, { key: "End" });
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toBeDisabled();

    fireEvent.keyDown(gallery, { key: "ArrowLeft" });
    expect(screen.getByText("4 / 5")).toBeInTheDocument();

    fireEvent.keyDown(gallery, { key: "Home" });
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("shows at most six thumbnails, the last one counting the rest", () => {
    renderGallery(photos(11));
    const thumbs = within(screen.getByTestId("gallery-thumbs")).getAllByRole("button");

    expect(thumbs).toHaveLength(6);
    expect(thumbs[5]).toHaveAccessibleName("View all 11 photos full screen");
    expect(thumbs[5]).toHaveTextContent("+6");

    fireEvent.click(thumbs[2]);
    expect(thumbs[2]).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("3 / 11")).toBeInTheDocument();
  });

  it("never draws a photo larger than its stored size", () => {
    renderGallery([{ url: `${CDN}/tiny.jpg`, width: 300, height: 300 }]);

    const box = screen.getByTestId("gallery-photo-box");
    expect(box).toHaveStyle({ maxWidth: "300px", maxHeight: "300px" });
    expect(within(box).getByRole("img")).toHaveClass("object-contain");
  });

  it("uses object-scale-down for a photo without a stored size", () => {
    renderGallery([{ url: `${CDN}/hero.jpg` }]);

    const box = screen.getByTestId("gallery-photo-box");
    expect(box).not.toHaveAttribute("style");
    expect(within(box).getByRole("img")).toHaveClass("object-scale-down");
  });

  it("reports each photo view once, after the frame settles", () => {
    jest.useFakeTimers();
    try {
      renderGallery(photos(3));
      const next = screen.getByRole("button", { name: "Next photo" });

      fireEvent.click(next);
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(500));
      // Photo 2 was passed on the way to photo 3, so only photo 3 counts
      expect(trackGalleryPhotoViewed).toHaveBeenCalledTimes(1);
      expect(trackGalleryPhotoViewed).toHaveBeenCalledWith(7, 2, 3);

      fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(500));
      expect(trackGalleryPhotoViewed).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("opens full screen on the clicked photo and moves one photo per key press", () => {
    renderGallery(photos(4));

    fireEvent.click(screen.getByRole("button", { name: "View photo 1 of Dolly full screen" }));
    const dialog = screen.getByRole("dialog", { name: "Photos of Dolly" });
    expect(within(dialog).getByAltText("Dolly, photo 1 of 4")).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByAltText("Dolly, photo 2 of 4")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close full screen" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("keeps the target photo while its smooth scroll passes the others", () => {
    renderGallery(photos(3));
    const track = screen.getByTestId("dog-gallery").querySelector(".snap-x") as HTMLDivElement;
    let left = 0;
    Object.defineProperty(track, "clientWidth", { value: 400 });
    Object.defineProperty(track, "scrollLeft", { get: () => left });
    track.scrollTo = jest.fn();

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    // Mid-way the frame is nearer photo 1; the counter must not go back
    left = 150;
    fireEvent.scroll(track);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // A second click during the scroll still moves on from photo 2
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    left = 800;
    fireEvent.scroll(track);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // After arriving, a swipe updates it again
    left = 400;
    fireEvent.scroll(track);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("changes photo in full screen without scrolling the page frame behind it", () => {
    renderGallery(photos(3));
    const track = screen.getByTestId("dog-gallery").querySelector(".snap-x") as HTMLDivElement;
    track.scrollTo = jest.fn();

    fireEvent.click(screen.getByRole("button", { name: "View photo 1 of Dolly full screen" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });

    expect(within(dialog).getByAltText("Dolly, photo 3 of 3")).toBeInTheDocument();
    expect(track.scrollTo).not.toHaveBeenCalled();
  });

  it("keeps arrow keys from the page while a single photo is full screen", () => {
    renderGallery(photos(1));
    const gallery = screen.getByTestId("dog-gallery");

    // Closed: the page's prev/next-dog keys still work
    expect(fireEvent.keyDown(gallery, { key: "ArrowRight" })).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "View photo 1 of Dolly full screen" }));
    expect(fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" })).toBe(false);
  });

  it("moves keyboard focus with the photo, so Enter opens the one shown", () => {
    renderGallery(photos(3));
    const first = screen.getByRole("button", { name: "View photo 1 of Dolly full screen" });
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    const second = screen.getByRole("button", { name: "View photo 2 of Dolly full screen" });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("tabindex", "0");
  });

  describe("swiping past the first or last photo", () => {
    const swipe = (el: Element, dx: number, dy = 0) => {
      fireEvent.touchStart(el, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchEnd(el, { changedTouches: [{ clientX: 200 + dx, clientY: 100 + dy }] });
    };

    function setup() {
      const onSwipePastStart = jest.fn();
      const onSwipePastEnd = jest.fn();
      render(
        <DogGallery
          dogId={7}
          dogName="Dolly"
          images={photos(3)}
          onSwipePastStart={onSwipePastStart}
          onSwipePastEnd={onSwipePastEnd}
        />,
      );
      const track = screen.getByTestId("dog-gallery").querySelector(".snap-x") as HTMLDivElement;
      return { track, onSwipePastStart, onSwipePastEnd };
    }

    it("goes to the previous dog from the first photo", () => {
      const { track, onSwipePastStart, onSwipePastEnd } = setup();
      swipe(track, 120);
      expect(onSwipePastStart).toHaveBeenCalledTimes(1);
      expect(onSwipePastEnd).not.toHaveBeenCalled();
    });

    it("goes to the next dog from the last photo only", () => {
      const { track, onSwipePastEnd } = setup();
      swipe(track, -120);
      expect(onSwipePastEnd).not.toHaveBeenCalled();

      fireEvent.keyDown(screen.getByTestId("dog-gallery"), { key: "End" });
      swipe(track, -120);
      expect(onSwipePastEnd).toHaveBeenCalledTimes(1);
    });

    it("ignores short and mostly vertical swipes", () => {
      const { track, onSwipePastStart } = setup();
      swipe(track, 30);
      swipe(track, 80, 200);
      expect(onSwipePastStart).not.toHaveBeenCalled();
    });
  });

  it("returns focus to the photo shown when full screen closes", async () => {
    renderGallery(photos(3));
    fireEvent.click(screen.getByRole("button", { name: "View photo 1 of Dolly full screen" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Radix restores focus on a timer after the dialog unmounts
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "View photo 3 of Dolly full screen" })).toHaveFocus(),
    );
  });

  it("reports a photo that fails to load", () => {
    renderGallery([{ url: `${CDN}/broken.jpg`, width: 800, height: 600 }]);

    fireEvent.error(screen.getByAltText("Dolly"));

    expect(screen.getByTestId("gallery-photo-missing")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { imageUrl: `${CDN}/broken.jpg` });
  });
});
