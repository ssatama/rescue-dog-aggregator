"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { DogDetailClientProps } from "@/types/pageComponents";
import type { Dog } from "@/types/dog";
import { Button } from "../../../components/ui/button";
import { getAnimalBySlug } from "../../../services/animalsService";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../components/ui/alert";
import ShareButton from "../../../components/ui/ShareButton";
import { ArrowLeft } from "lucide-react";
import DogGallery from "../../../components/dogs/detail/DogGallery";
import DogFactsPanel, { MobileAdoptBar } from "../../../components/dogs/detail/DogFactsPanel";
import { getGallery } from "../../../utils/dogImageHelpers";
import OrganizationCard from "../../../components/organizations/OrganizationCard";
import { ToastProvider } from "../../../contexts/ToastContext";
import SimilarDogsSection from "../../../components/dogs/SimilarDogsSection";
import DogDescription from "../../../components/dogs/DogDescription";
import { reportError } from "../../../utils/logger";
import { formatBreed } from "../../../utils/dogHelpers";
import DogDetailSkeleton from "../../../components/ui/DogDetailSkeleton";
import DogDetailErrorBoundary from "../../../components/error/DogDetailErrorBoundary";
import { DogSchema } from "../../../components/seo";
import Breadcrumbs from "../../../components/ui/Breadcrumbs";
import RetiredListingNotice from "../../../components/dogs/RetiredListingNotice";
import { trackDogView } from "@/lib/monitoring/breadcrumbs";
import {
  trackDogViewed,
  trackGalleryPhotoViewed,
} from "@/lib/analytics";
import {
  PersonalityTraits,
  EnergyTrainability,
  ActivitiesQuirks,
  hasPersonalitySection,
  hasEnergyTrainabilitySection,
  hasActivitiesSection,
} from "../../../components/dogs/detail";
import SwipeNavigationOverlay, { type DogNavigation } from "./SwipeNavigationOverlay";

export default function DogDetailClient({
  params = {},
  initialDog = null,
  initialSimilarDogs,
  breedPageSlug = null,
}: DogDetailClientProps) {
  const urlParams = useParams();
  const rawSlug = params?.slug || urlParams?.slug;
  const dogSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const [dog, setDog] = useState<Dog | null>(initialDog);
  // Server-fetched extras belong to the dog this page was rendered for, not one reached by swiping
  const isInitialDog = dog != null && initialDog != null && dog.id === initialDog.id;
  const [loading, setLoading] = useState(!initialDog);
  const [error, setError] = useState(false);
  const [retryInProgress, setRetryInProgress] = useState(false);
  const mountedRef = useRef<boolean>(true);
  const dogNavigation = useRef<DogNavigation>({});

  // Enhanced fetchDogData with comprehensive error handling and retry logic
  const fetchDogData = useCallback(
    async (retryCount: number = 0) => {
      if (!mountedRef.current) return; // Prevent state updates if unmounted

      if (!dogSlug) {
        setError(true);
        setLoading(false);
        return;
      }

      const fetchStartTime = Date.now();
      const maxRetries = 3;

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        setLoading(true);
        setError(false);

        // Create timeout promise for hanging requests detection
        const timeoutMs = 10000; // 10 second timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`API request timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        // Race between API call and timeout
        const data = await Promise.race([
          getAnimalBySlug(dogSlug),
          timeoutPromise,
        ]);

        // Clear timeout on successful response
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Only update state if component is still mounted
        if (mountedRef.current) {
          setDog(data as Dog);

          // Track dog view when successfully loaded
          const org = data?.organization;
          if (data?.id && data?.name && typeof org === "object" && org?.slug) {
            trackDogView(data.id.toString(), data.name, org.slug);
          }
          if (data?.id) {
            trackDogViewed(data as Dog, "detail_page");
            // The first photo is on screen at load; DogGallery reports the rest
            const photos = getGallery(data as Dog).length;
            if (photos > 0) trackGalleryPhotoViewed(data.id, 0, photos);
          }
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorInfo = {
          message: error.message,
          name: error.name,
          dogSlug,
          retryCount,
          fetchDuration: Date.now() - fetchStartTime,
          isAbortError: error.name === "AbortError",
          isNetworkError: error.message.includes("fetch"),
          timestamp: Date.now(),
        };

        // Always report errors for monitoring
        reportError(err, errorInfo);

        // Retry logic for certain types of errors
        if (
          retryCount < maxRetries &&
          (error.name === "AbortError" || error.message.includes("fetch"))
        ) {
          if (mountedRef.current) {
            setRetryInProgress(true);
          }

          // Exponential backoff delay
          setTimeout(
            () => {
              if (mountedRef.current) {
                setRetryInProgress(false);
                fetchDogData(retryCount + 1);
              }
            },
            1000 * (retryCount + 1),
          );
          return; // Don't set error state yet, we're retrying
        }

        if (mountedRef.current) {
          setError(true);
        }
      } finally {
        // Clear timeout in finally block to prevent memory leaks
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (mountedRef.current && retryCount === 0) {
          // Only set loading to false on the original call (not retries)
          setLoading(false);
        }
      }
    },
    [dogSlug],
  );

  useEffect(() => {
    // If we have initialDog from server-side, use it
    if (initialDog) {
      setDog(initialDog);
      setLoading(false);
      setError(false);

      // Track dog view for SSR data
      if (
        initialDog?.id &&
        initialDog?.name &&
        initialDog?.organization?.slug
      ) {
        trackDogView(
          initialDog.id.toString(),
          initialDog.name,
          initialDog.organization.slug,
        );
      }
      trackDogViewed(initialDog, "detail_page");
      const photos = getGallery(initialDog).length;
      if (photos > 0) trackGalleryPhotoViewed(initialDog.id, 0, photos);
      return;
    }

    // Otherwise fetch client-side
    setLoading(true);
    setError(false);
    setDog(null);

    fetchDogData();

    return () => {
      mountedRef.current = false;
    };
  }, [dogSlug, initialDog, fetchDogData]);

  // Cleanup on unmount
  useEffect(() => {
    // Set mounted to true on mount
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Scroll to top on navigation to ensure hero image is visible
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [dogSlug]);

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    fetchDogData();
  }, [fetchDogData]);

  const router = useRouter();

  if (loading) {
    return <DogDetailSkeleton />;
  }

  if (error || !dog) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Dog Not Found
          </AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              Sorry, we couldn&apos;t find the dog you&apos;re looking for.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center px-4 py-2 transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Try Again
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <Link href="/dogs" className="px-4 py-2">
                  Return to dogs listing
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const gallery = getGallery(dog);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Find Dogs", url: "/dogs" },
    { name: dog.name },
  ];

  const description =
    dog.llm_description ||
    (typeof dog.properties?.description === "string" ? dog.properties.description : undefined) ||
    (typeof dog.properties?.raw_description === "string" ? dog.properties.raw_description : undefined) ||
    "";

  return (
    <ToastProvider>
      <DogDetailErrorBoundary dogSlug={dogSlug}>
        {/* SEO: Schema.org structured data for search engines */}
        <DogSchema dog={dog} />
        <div
          data-testid="dog-detail-container"
          // Phones: cancel Layout's main padding so the photo runs edge to edge.
          // From md, the padding leaves room for the fixed prev/next-dog arrows.
          className="-mx-4 -mt-8 max-w-6xl pb-28 sm:mx-auto sm:mt-0 sm:px-6 sm:pt-4 md:px-12 lg:pb-12 lg:pt-6"
        >
          {/* The breadcrumb is the way back on larger screens; phones get the
              back button over the photo (#489) */}
          <div className="hidden sm:block">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          <div className="px-4 sm:px-0">
            <RetiredListingNotice active={dog?.active} />
          </div>

          {/* Phones: photo, facts, story. Desktop: photo and story on the left,
              the facts and adopt button in a sticky panel on the right. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-10">
            <div className="relative lg:col-start-1 lg:row-start-1" data-testid="hero-section">
              {/* Swipe-to-navigate is scoped to the photo so it never covers
                    the action buttons or adoption CTA. */}
              <Suspense fallback={null}>
                <SwipeNavigationOverlay
                  key={dogSlug}
                  dogSlug={dogSlug ?? ""}
                  gestures={gallery.length <= 1}
                  navigationRef={dogNavigation}
                />
              </Suspense>

              <DogGallery
                key={`gallery-${dog.id}`}
                dogId={dog.id}
                dogName={dog.name}
                images={gallery}
                onSwipePastStart={() => dogNavigation.current.prev?.()}
                onSwipePastEnd={() => dogNavigation.current.next?.()}
              />

              <div className="pointer-events-none absolute inset-x-3 top-3 z-[3] flex justify-between sm:hidden">
                <button
                  type="button"
                  onClick={() => router.back()}
                  aria-label="Back"
                  className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="back-button"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="pointer-events-auto rounded-full bg-white/90 text-gray-900 shadow-sm">
                  <ShareButton
                    url={typeof window !== "undefined" ? window.location.href : ""}
                    title={`Meet ${dog.name} - Available for Adoption`}
                    text={`${dog.name} is a ${formatBreed(dog) || "lovely dog"} looking for a forever home.`}
                    variant="ghost"
                    size="icon"
                    compact
                    className="h-10 w-10 rounded-full text-gray-900 hover:bg-white"
                  />
                </div>
              </div>
            </div>

            <aside
              aria-label={`${dog.name} at a glance`}
              className="px-4 sm:px-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
            >
              <div className="lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-6 lg:shadow-sm lg:dark:bg-gray-900">
                <DogFactsPanel
                  dog={dog}
                  breedHref={isInitialDog && breedPageSlug ? `/breeds/${breedPageSlug}` : null}
                />
              </div>
            </aside>

            <div className="grid gap-8 px-4 sm:px-0 lg:col-start-1 lg:row-start-2">
              {description && (
                <section aria-label="About the Dog" data-testid="about-section">
                  <h2 className="mb-3 font-display text-2xl font-semibold text-ink">About {dog.name}</h2>
                  <DogDescription
                    description={description}
                    dogName={dog.name}
                    organizationName={dog.organization?.name}
                    className="mt-0"
                  />
                </section>
              )}

              {/* Each heading is gated by the same predicate its component
                    uses, so a heading can never render above an empty body.
                    "Good with" lives in the panel as "Lives with". */}
              {(hasPersonalitySection(dog.dog_profiler_data) ||
                hasEnergyTrainabilitySection(dog.dog_profiler_data) ||
                hasActivitiesSection(dog.dog_profiler_data)) && (
                <section aria-label="Personality and Behavioral Information" className="grid gap-6">
                  {hasPersonalitySection(dog.dog_profiler_data) && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-ink">Personality</h3>
                      <PersonalityTraits profilerData={dog.dog_profiler_data} />
                    </div>
                  )}

                  {hasEnergyTrainabilitySection(dog.dog_profiler_data) && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-ink">Energy & Training</h3>
                      <EnergyTrainability profilerData={dog.dog_profiler_data} />
                    </div>
                  )}

                  {hasActivitiesSection(dog.dog_profiler_data) && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-ink">Activities & Quirks</h3>
                      <ActivitiesQuirks profilerData={dog.dog_profiler_data} />
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 px-4 sm:px-0">
            {dog.organization && (
              <div data-testid="organization-container">
                <OrganizationCard
                  organization={{
                    ...dog.organization,
                    id: dog.organization.id ?? 0,
                  }}
                  size="medium"
                  secondaryDogsLink
                />
              </div>
            )}

            <SimilarDogsSection
              key={dog.id}
              dog={dog}
              initialDogs={isInitialDog ? initialSimilarDogs : undefined}
            />
          </div>
        </div>

        <MobileAdoptBar dog={dog} />
      </DogDetailErrorBoundary>
    </ToastProvider>
  );
}
