/**
 * Enhanced error boundary specifically for dog detail pages
 * Provides graceful error handling with retry options and user-friendly messages
 */
import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { reportError } from '../../utils/logger';

class DogDetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    reportError('DogDetailErrorBoundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      dogId: this.props.dogId,
    });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const canRetry = retryCount < 3;

      return (
        <div className="max-w-4xl mx-auto p-4" data-testid="dog-detail-error-boundary">
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Something went wrong
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                We're having trouble loading this dog's information. This might be a temporary issue.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Try Again {retryCount > 0 && `(${retryCount}/3)`}
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleGoBack}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Go Back
                </Button>
                
                <Button 
                  asChild
                  variant="outline" 
                  size="sm"
                  className="flex items-center"
                >
                  <a href="/dogs">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Browse All Dogs
                  </a>
                </Button>
              </div>

              {!canRetry && (
                <p className="mt-4 text-sm text-gray-600">
                  If this problem persists, please try refreshing the page or contact support.
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Helpful suggestions */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-medium text-orange-900 mb-2">While you're here:</h3>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Browse other available dogs</li>
              <li>• Search by breed or location</li>
              <li>• Learn about our rescue partners</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DogDetailErrorBoundary;