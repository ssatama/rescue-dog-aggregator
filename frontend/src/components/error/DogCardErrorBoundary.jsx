/**
 * Error Boundary specifically for Dog Cards
 */
import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "../ui/Icon";
import { reportError } from "../../utils/logger";

class DogCardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error });

    reportError(error, {
      context: "DogCard render error",
      componentStack: errorInfo.componentStack,
      dogId: this.props.dogId,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card
          className="overflow-hidden flex flex-col h-full bg-red-50 border-red-200"
          data-testid="error-dog-card"
        >
          <CardHeader className="p-4 text-center">
            <Icon
              name="alert-triangle"
              size="large"
              className="text-red-500 mx-auto mb-2"
            />
          </CardHeader>

          <CardContent className="p-4 flex flex-col flex-grow text-center">
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error Loading Dog
            </h3>
            <p className="text-sm text-red-600 mb-4 flex-grow">
              We couldn&apos;t load this dog&apos;s information. Please try again later.
            </p>
          </CardContent>

          <CardFooter className="p-4 pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-red-300 text-red-700 hover:bg-red-100"
              onClick={this.handleRetry}
            >
              <Icon name="refresh" size="small" className="mr-2" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default DogCardErrorBoundary;
