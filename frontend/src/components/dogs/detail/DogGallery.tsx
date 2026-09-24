"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackGalleryPhotoViewed } from "@/lib/analytics";
import type { DogImage } from "@/types/dog";

const MAX_THUMBS = 6;
// Full screen is black in both themes, so its buttons stay light
const ON_BLACK = "dark:bg-white/90 dark:text-gray-900";
const TRACK_DELAY_MS = 300;
const SCROLL_SETTLE_MS = 1000;
// The frame spans the dog page's max-w-4xl column, minus its padding
const FRAME_SIZES = "(min-width: 896px) 832px, 100vw";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * One photo inside a fixed frame. The whole photo is shown over a blurred copy
 * of itself, never cropped and never drawn larger than its stored size, so a
 * 300px photo stays 300px on a 600px frame. A photo without a stored size uses
 * object-scale-down, which also never upscales.
 */
function FramedPhoto({
  image,
  alt,
  priority = false,
  sizes,
  blurredFill = true,
}: {
  image: DogImage;
  alt: string;
  priority?: boolean;
  sizes: string;
  blurredFill?: boolean;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const sized = Boolean(image.width && image.height);

  if (failed) {
    return (
      <div
        className="absolute inset-0 grid place-items-center bg-soft text-subtle"
        data-testid="gallery-photo-missing"
      >
        <span className="text-3xl" aria-hidden="true">
          🐾
        </span>
      </div>
    );
  }

  return (
    <>
      {blurredFill && (
        <Image
          src={image.url}
          alt=""
          aria-hidden="true"
          fill
          sizes="64px"
          className="scale-110 object-cover opacity-60 blur-2xl"
        />
      )}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative h-full w-full"
          style={sized ? { maxWidth: image.width, maxHeight: image.height } : undefined}
          data-testid="gallery-photo-box"
        >
          <Image
            src={image.url}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            onError={() => setFailed(true)}
            className={sized ? "object-contain" : "object-scale-down"}
          />
        </div>
      </div>
    </>
  );
}

function ArrowButton({
  direction,
  onClick,
  disabled,
  className,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  className?: string;
}): React.ReactElement {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 z-[2] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-900 shadow-sm transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0 dark:bg-gray-900/90 dark:text-gray-50",
        direction === "prev" ? "left-3" : "right-3",
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function Counter({
  index,
  total,
  className,
}: {
  index: number;
  total: number;
  className?: string;
}): React.ReactElement {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-[2] rounded-full bg-black/65 px-2.5 py-0.5 font-mono text-xs text-white tabular-nums",
        className,
      )}
    >
      <span className="sr-only">Photo </span>
      {index + 1} / {total}
    </div>
  );
}

export interface DogGalleryProps {
  dogId: number | string;
  dogName: string;
  images: DogImage[];
  className?: string;
}

/**
 * The dog page gallery (#489): a swipeable 4:3 frame with arrows, a counter,
 * thumbnails on larger screens, dots on phones, ← → keys and a full-screen view.
 * A single photo shows without any gallery chrome.
 */
export default function DogGallery({
  dogId,
  dogName,
  images,
  className,
}: DogGalleryProps): React.ReactElement | null {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewed = useRef(new Set<number>([0]));
  const total = images.length;
  const multiple = total > 1;

  // Views are reported once per photo, after the frame settles, so a smooth
  // scroll across several photos doesn't count the ones it passes.
  useEffect(() => {
    if (viewed.current.has(index)) return;
    const timer = setTimeout(() => {
      viewed.current.add(index);
      trackGalleryPhotoViewed(dogId, index, total);
    }, TRACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [index, dogId, total]);

  // While goTo's smooth scroll runs, the frame passes through other photos;
  // `heading` holds the target so those scroll events don't reset the index.
  const heading = useRef<number | null>(null);
  const headingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(headingTimer.current), []);

  const indexFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return null;
    return Math.max(0, Math.min(Math.round(track.scrollLeft / track.clientWidth), total - 1));
  }, [total]);

  const goTo = useCallback(
    (target: number, behavior?: ScrollBehavior) => {
      const next = Math.max(0, Math.min(target, total - 1));
      setIndex(next);
      const track = trackRef.current;
      if (!track?.scrollTo) return;
      heading.current = next;
      clearTimeout(headingTimer.current);
      // A swipe can interrupt the scroll short of the target; after a while
      // trust wherever the frame actually is.
      headingTimer.current = setTimeout(() => {
        heading.current = null;
        const settled = indexFromScroll();
        if (settled !== null) setIndex(settled);
      }, SCROLL_SETTLE_MS);
      track.scrollTo({
        left: next * track.clientWidth,
        behavior: behavior ?? (prefersReducedMotion() ? "auto" : "smooth"),
      });
    },
    [total, indexFromScroll],
  );

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    const current = indexFromScroll();
    if (!track || current === null) return;
    if (heading.current !== null) {
      if (Math.abs(track.scrollLeft - heading.current * track.clientWidth) > 1) return;
      heading.current = null;
      clearTimeout(headingTimer.current);
    }
    setIndex(current);
  }, [indexFromScroll]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keys: Record<string, number> = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        Home: 0,
        End: total - 1,
      };
      if (!(e.key in keys) || (!multiple && !fullscreen)) return;
      // Handled here, so the page's prev/next-dog keys leave it alone, even
      // for a single photo open full screen.
      e.preventDefault();
      if (!multiple) return;
      const next = Math.max(0, Math.min(keys[e.key], total - 1));
      // Full screen only changes the photo; the page frame catches up on close.
      if (fullscreen) {
        setIndex(next);
        return;
      }
      goTo(next);
      // Keyboard focus on a photo follows it, so Enter opens the photo shown
      const track = trackRef.current;
      if (track?.contains(document.activeElement)) {
        track.querySelectorAll<HTMLElement>("[data-open-photo]")[next]?.focus({ preventScroll: true });
      }
    },
    [index, total, multiple, fullscreen, goTo],
  );

  const closeFullscreen = useCallback(
    (open: boolean) => {
      setFullscreen(open);
      // Land the page frame on the photo the visitor ended on.
      if (!open) goTo(index, "auto");
    },
    [goTo, index],
  );

  if (total === 0) return null;

  const openAt = (i: number) => {
    setIndex(i);
    setFullscreen(true);
  };
  const extra = total - MAX_THUMBS;

  return (
    <section
      aria-label={`Photos of ${dogName}`}
      aria-roledescription={multiple ? "carousel" : undefined}
      onKeyDown={handleKeyDown}
      className={cn("grid gap-2", className)}
      data-testid="dog-gallery"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-soft sm:rounded-2xl">
        <div
          ref={trackRef}
          onScroll={multiple ? handleScroll : undefined}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div
              key={image.url}
              role={multiple ? "group" : undefined}
              aria-roledescription={multiple ? "slide" : undefined}
              aria-label={multiple ? `${i + 1} of ${total}` : undefined}
              className="relative h-full w-full flex-none snap-center"
            >
              <FramedPhoto
                image={image}
                alt={multiple ? `${dogName}, photo ${i + 1} of ${total}` : dogName}
                priority={i === 0}
                sizes={FRAME_SIZES}
              />
              <button
                type="button"
                onClick={() => openAt(i)}
                data-open-photo
                aria-label={`View photo ${i + 1} of ${dogName} full screen`}
                tabIndex={i === index ? 0 : -1}
                className="absolute inset-0 z-[1] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              />
            </div>
          ))}
        </div>

        {multiple && (
          <>
            <ArrowButton
              direction="prev"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="hidden md:grid"
            />
            <ArrowButton
              direction="next"
              onClick={() => goTo(index + 1)}
              disabled={index === total - 1}
              className="hidden md:grid"
            />
            <Counter index={index} total={total} className="hidden md:block" />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-1.5 md:hidden"
              aria-hidden="true"
              data-testid="gallery-dots"
            >
              {images.slice(0, 10).map((image, i) => (
                <span
                  key={image.url}
                  className={cn(
                    "h-1.5 rounded-full bg-white/60 shadow-sm transition-all motion-reduce:transition-none",
                    i === Math.min(index, 9) ? "w-4 bg-white" : "w-1.5",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {multiple && (
        <div className="hidden grid-cols-6 gap-1.5 md:grid" data-testid="gallery-thumbs">
          {images.slice(0, MAX_THUMBS).map((image, i) => {
            const isMore = extra > 0 && i === MAX_THUMBS - 1;
            return (
              <button
                key={image.url}
                type="button"
                onClick={() => (isMore ? openAt(i) : goTo(i))}
                aria-label={
                  isMore
                    ? `View all ${total} photos full screen`
                    : `Show photo ${i + 1} of ${total}`
                }
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border-2 bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === index ? "border-orange-600" : "border-transparent hover:opacity-90",
                )}
              >
                <Image src={image.url} alt="" fill sizes="128px" className="object-cover" />
                {isMore && (
                  <span className="absolute inset-0 grid place-items-center bg-black/65 text-lg font-bold text-white">
                    +{extra + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog.Root open={fullscreen} onOpenChange={closeFullscreen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black" />
          {/* ← → reach the section's onKeyDown: React events bubble through portals */}
          <Dialog.Content
            className="fixed inset-0 z-50 focus:outline-none"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Photos of {dogName}</Dialog.Title>
            <div className="absolute inset-4 sm:inset-12">
              <FramedPhoto
                key={images[index].url}
                image={images[index]}
                alt={`${dogName}, photo ${index + 1} of ${total}`}
                sizes="100vw"
                blurredFill={false}
              />
            </div>
            {multiple && (
              <>
                <ArrowButton
                  direction="prev"
                  onClick={() => setIndex(index - 1)}
                  disabled={index === 0}
                  className={ON_BLACK}
                />
                <ArrowButton
                  direction="next"
                  onClick={() => setIndex(index + 1)}
                  disabled={index === total - 1}
                  className={ON_BLACK}
                />
                <Counter index={index} total={total} className="bottom-4 right-1/2 translate-x-1/2" />
              </>
            )}
            <Dialog.Close
              aria-label="Close full screen"
              className="absolute right-3 top-3 z-[2] grid h-10 w-10 place-items-center rounded-full bg-white/90 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
