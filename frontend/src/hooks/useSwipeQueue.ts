import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { fetchSwipeDogs, SwipeDog } from "../services/swipeApi";

interface UseSwipeQueueOptions {
  country?: string;
  sizes?: string[];
}

interface UseSwipeQueueResult {
  queue: SwipeDog[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  isPreloading: boolean;
  removeFromQueue: (dogId: number) => void;
  refetch: () => void;
}

const INITIAL_LOAD_SIZE = 20;
const PRELOAD_THRESHOLD = 5;
const MAX_QUEUE_SIZE = 30;

export function useSwipeQueue(filters: UseSwipeQueueOptions): UseSwipeQueueResult {
  const [queue, setQueue] = useState<SwipeDog[]>([]);
  const [offset, setOffset] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preloadingRef = useRef(false);
  const seenDogsRef = useRef<Set<number>>(new Set());

  // Generate SWR key
  const swrKey = filters.country
    ? JSON.stringify({ ...filters, limit: INITIAL_LOAD_SIZE, offset })
    : null;

  // Fetch data using SWR
  const { data, error: swrError, mutate, isLoading } = useSWR(
    swrKey,
    () => fetchSwipeDogs({
      country: filters.country,
      sizes: filters.sizes,
      limit: INITIAL_LOAD_SIZE,
      offset,
    }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Handle initial data load and preloading
  useEffect(() => {
    if (data && data.length > 0) {
      setQueue(prevQueue => {
        // Deduplicate dogs
        const newDogs = data.filter(dog => !seenDogsRef.current.has(dog.id));
        newDogs.forEach(dog => seenDogsRef.current.add(dog.id));
        
        // Combine with existing queue
        const combined = [...prevQueue, ...newDogs];
        
        // Limit queue size
        if (combined.length > MAX_QUEUE_SIZE) {
          // Remove oldest dogs that exceed the limit
          const trimmed = combined.slice(0, MAX_QUEUE_SIZE);
          // Update seen dogs set to only include dogs still in queue
          seenDogsRef.current = new Set(trimmed.map(d => d.id));
          return trimmed;
        }
        
        return combined;
      });
      
      setIsPreloading(false);
      preloadingRef.current = false;
    }
  }, [data]);

  // Handle errors
  useEffect(() => {
    if (swrError) {
      console.error("Failed to fetch swipe dogs:", swrError);
      setError("Failed to load dogs. Please try again.");
    } else {
      setError(null);
    }
  }, [swrError]);

  // Check if preload is needed
  useEffect(() => {
    if (
      queue.length <= PRELOAD_THRESHOLD &&
      queue.length > 0 &&
      !isLoading &&
      !preloadingRef.current &&
      !error
    ) {
      preloadingRef.current = true;
      setIsPreloading(true);
      setOffset(prev => prev + INITIAL_LOAD_SIZE);
    }
  }, [queue.length, isLoading, error]);

  // Remove dog from queue
  const removeFromQueue = useCallback((dogId: number) => {
    setQueue(prevQueue => prevQueue.filter(dog => dog.id !== dogId));
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    // Reset state
    setQueue([]);
    setOffset(0);
    seenDogsRef.current.clear();
    setError(null);
    
    // Trigger SWR refetch
    mutate();
  }, [mutate]);

  // Reset when filters change
  useEffect(() => {
    setQueue([]);
    setOffset(0);
    seenDogsRef.current.clear();
    setError(null);
    preloadingRef.current = false;
    setIsPreloading(false);
  }, [filters.country, filters.sizes?.join(",")]);

  return {
    queue,
    loading: isLoading && queue.length === 0,
    error,
    isEmpty: !isLoading && queue.length === 0 && !error,
    isPreloading,
    removeFromQueue,
    refetch,
  };
}