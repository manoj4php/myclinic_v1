import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClinicLogoText } from '@/components/Logo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <ClinicLogoText size="md" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Oops! Something went wrong
                </h1>
                
                <p className="text-gray-600 mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified and is working to fix the issue.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={this.handleReload} variant="default">
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline">
                    Go to Dashboard
                  </Button>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-8 text-left">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                      Error Details (Development Mode)
                    </summary>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm font-medium text-red-600 mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                      {this.state.errorInfo && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-red-600 mb-2">Component Stack:</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;