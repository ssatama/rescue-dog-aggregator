interface NetworkInfo {
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export function getNetworkInfo(): NetworkInfo {
  if (typeof navigator === "undefined" || !navigator.connection) {
    return {
      effectiveType: "unknown",
      downlink: null,
      rtt: null,
      saveData: false,
    };
  }

  const connection = navigator.connection;
  return {
    effectiveType: connection.effectiveType || "unknown",
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false,
  };
}

export function isSlowConnection(): boolean {
  const { effectiveType, downlink, saveData } = getNetworkInfo();

  if (saveData) {
    return true;
  }

  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return true;
  }

  if (downlink !== null && downlink < 1) {
    return true;
  }

  return false;
}

export function getAdaptiveImageQuality(): string {
  const { effectiveType, downlink, saveData } = getNetworkInfo();

  if (saveData) {
    return "q_60";
  }

  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return "q_60";
  }

  if (downlink !== null && downlink < 0.5) {
    return "q_60";
  }

  if (effectiveType === "3g" || (downlink !== null && downlink < 2)) {
    return "q_75";
  }

  return "q_auto";
}

interface ImageDimensions {
  width: number;
  height: number;
}

export function getAdaptiveImageDimensions(context = "catalog"): ImageDimensions {
  const isSlowNet = isSlowConnection();

  const dimensions: Record<string, { fast: ImageDimensions; slow: ImageDimensions }> = {
    hero: {
      fast: { width: 900, height: 400 },
      slow: { width: 675, height: 300 },
    },
    catalog: {
      fast: { width: 400, height: 300 },
      slow: { width: 300, height: 225 },
    },
    thumbnail: {
      fast: { width: 200, height: 200 },
      slow: { width: 150, height: 150 },
    },
  };

  const contextDimensions = dimensions[context] || dimensions.catalog;
  return isSlowNet ? contextDimensions.slow : contextDimensions.fast;
}

export function getAdaptiveTimeout(): number {
  const { effectiveType, rtt } = getNetworkInfo();

  let timeout = 15000;

  switch (effectiveType) {
    case "slow-2g":
      timeout = 30000;
      break;
    case "2g":
      timeout = 25000;
      break;
    case "3g":
      timeout = 20000;
      break;
    case "4g":
      timeout = 10000;
      break;
  }

  if (rtt !== null) {
    if (rtt > 1000) {
      timeout += 10000;
    } else if (rtt < 100) {
      timeout = Math.max(timeout - 5000, 5000);
    }
  }

  return timeout;
}

export function shouldUseProgressiveLoading(): boolean {
  const { saveData } = getNetworkInfo();

  if (saveData) {
    return false;
  }

  return isSlowConnection();
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  backoffMultiplier: number;
}

export function getAdaptiveRetryConfig(): RetryConfig {
  const isSlowNet = isSlowConnection();
  const { effectiveType } = getNetworkInfo();

  return {
    maxRetries: isSlowNet ? 3 : 2,
    baseDelay: effectiveType === "2g" ? 2000 : 1000,
    backoffMultiplier: 2,
  };
}

export function onNetworkChange(callback: (info: NetworkInfo) => void): () => void {
  if (typeof navigator === "undefined" || !navigator.connection) {
    return () => {};
  }

  const connection = navigator.connection;

  const handleChange = (): void => {
    callback(getNetworkInfo());
  };

  connection.addEventListener("change", handleChange);

  return () => {
    connection.removeEventListener("change", handleChange);
  };
}

export function preloadImagesAdaptive(urls: string[], context = "catalog"): void {
  if (!Array.isArray(urls) || urls.length === 0) return;

  const isSlowNet = isSlowConnection();

  if (isSlowNet) {
    return;
  }

  const maxPreload =
    getNetworkInfo().effectiveType === "4g"
      ? urls.length
      : Math.min(urls.length, 3);

  urls.slice(0, maxPreload).forEach((url) => {
    if (!url || typeof url !== "string") return;

    try {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;

      if (context === "hero") {
        link.setAttribute("imagesizes", "(max-width: 768px) 100vw, 800px");
      }

      document.head.appendChild(link);
    } catch (error: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Preload failed for:", url, error);
      }
    }
  });
}

interface LoadingStrategy {
  loading: "eager" | "lazy";
  useProgressive: boolean;
  quality: string;
  dimensions: ImageDimensions;
  timeout: number;
  retry: RetryConfig;
  skipOptimizations: boolean;
}

export function getLoadingStrategy(context = "catalog"): LoadingStrategy {
  const isSlowNet = isSlowConnection();
  const { saveData } = getNetworkInfo();

  return {
    loading: context === "hero" && !isSlowNet ? "eager" : "lazy",
    useProgressive: shouldUseProgressiveLoading(),
    quality: getAdaptiveImageQuality(),
    dimensions: getAdaptiveImageDimensions(context),
    timeout: getAdaptiveTimeout(),
    retry: getAdaptiveRetryConfig(),
    skipOptimizations: saveData,
  };
}
