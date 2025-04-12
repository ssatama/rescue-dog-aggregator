export default function Loading() {
  return (
    // Added data-testid here if needed for tests
    <div className="flex justify-center items-center min-h-[200px]" data-testid="loading">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}