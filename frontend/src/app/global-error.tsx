"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import {
  isChunkLoadError,
  clearCacheAndReload,
} from "@/lib/chunkLoadError";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    if (!isChunkError) {
      Sentry.captureException(error);
    }
  }, [error, isChunkError]);

  if (isChunkError) {
    return (
      <html lang="en">
        <body>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              padding: "2rem",
              fontFamily: "system-ui, sans-serif",
              textAlign: "center",
              backgroundColor: "#f9fafb",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "0.75rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                maxWidth: "400px",
              }}
            >
              <div
                style={{
                  fontSize: "3rem",
                  marginBottom: "1rem",
                }}
              >
                🔄
              </div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                New Version Available
              </h1>
              <p
                style={{
                  color: "#6b7280",
                  marginBottom: "1.5rem",
                  lineHeight: "1.5",
                }}
              >
                We&apos;ve updated the site. Please refresh to get the latest
                version.
              </p>
              <button
                onClick={clearCacheAndReload}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2563eb")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#3b82f6")
                }
              >
                Refresh Now
              </button>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "0.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              maxWidth: "400px",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              😔
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "#111827",
              }}
            >
              Something Went Wrong
            </h1>
            <p
              style={{
                color: "#6b7280",
                marginBottom: "1.5rem",
                lineHeight: "1.5",
              }}
            >
              We&apos;re sorry, but something unexpected happened. Our team has
              been notified.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={reset}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  backgroundColor: "#e5e7eb",
                  color: "#374151",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
