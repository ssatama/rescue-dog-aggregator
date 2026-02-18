export default function Loading({ className }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={className || "flex justify-center items-center min-h-[200px]"}
      data-testid="loading"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
}
