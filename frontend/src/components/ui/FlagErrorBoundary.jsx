import React from 'react';

/**
 * Error boundary specifically for flag loading failures
 * Provides fallback UI when flag service is unavailable
 */
class FlagErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log flag loading errors for monitoring in development only
    if (process.env.NODE_ENV !== 'production') console.warn('Flag loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback to text-based country display
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-xs text-gray-500 px-1 py-0.5 rounded bg-gray-100">
            {this.props.countryCode || '??'}
          </span>
          {this.props.countryName && (
            <span className="text-sm">{this.props.countryName}</span>
          )}
        </span>
      );
    }

    return this.props.children;
  }
}

export default FlagErrorBoundary;