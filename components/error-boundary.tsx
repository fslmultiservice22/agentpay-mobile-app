import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service (e.g., Sentry, Firebase)
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-background items-center justify-center p-6">
          <ScrollView className="flex-1 w-full" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            {/* Error Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-error/20 rounded-full items-center justify-center mb-4">
                <Text className="text-4xl">⚠️</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2">Oops! Something went wrong</Text>
              <Text className="text-sm text-muted text-center">
                We encountered an unexpected error. Please try again.
              </Text>
            </View>

            {/* Error Details (Development only) */}
            {__DEV__ && this.state.error && (
              <View className="bg-surface rounded-lg p-4 mb-6 border border-error/30">
                <Text className="text-xs font-mono text-error mb-2">Error Details:</Text>
                <Text className="text-xs font-mono text-foreground mb-4">{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text className="text-xs font-mono text-muted">{this.state.errorInfo.componentStack}</Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View className="gap-3">
              <TouchableOpacity
                onPress={this.resetError}
                className="bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  // Navigate to home
                  this.resetError();
                }}
                className="bg-surface rounded-lg py-3 items-center border border-border"
              >
                <Text className="text-foreground font-semibold">Go to Home</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
