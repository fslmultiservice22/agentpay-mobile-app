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

    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private getErrorMessage(): { title: string; subtitle: string; icon: string } {
    const errorStr = this.state.error?.message?.toLowerCase() || '';
    const stackStr = this.state.errorInfo?.componentStack?.toLowerCase() || '';

    // Payment / card related errors
    if (
      errorStr.includes('payment') ||
      errorStr.includes('card') ||
      errorStr.includes('stripe') ||
      errorStr.includes('transaction') ||
      errorStr.includes('declined') ||
      errorStr.includes('credit') ||
      stackStr.includes('credit') ||
      stackStr.includes('card') ||
      stackStr.includes('payment') ||
      stackStr.includes('wallet')
    ) {
      return {
        title: 'Pagamento non disponibile',
        subtitle: 'La carta \u00e8 in modalit\u00e0 test. I pagamenti reali saranno disponibili dopo l\'attivazione da parte di Stripe (1-5 giorni lavorativi). Nel frattempo puoi utilizzare tutte le altre funzionalit\u00e0 dell\'app.',
        icon: '\uD83D\uDCB3',
      };
    }

    // Network errors
    if (
      errorStr.includes('network') ||
      errorStr.includes('fetch') ||
      errorStr.includes('timeout') ||
      errorStr.includes('connection')
    ) {
      return {
        title: 'Errore di connessione',
        subtitle: 'Impossibile raggiungere il server. Verifica la tua connessione internet e riprova.',
        icon: '\uD83D\uDCE1',
      };
    }

    // Default generic error
    return {
      title: 'Si \u00e8 verificato un errore',
      subtitle: 'Si \u00e8 verificato un errore imprevisto. Prova a tornare alla schermata principale.',
      icon: '\u26A0\uFE0F',
    };
  }

  render() {
    if (this.state.hasError) {
      const { title, subtitle, icon } = this.getErrorMessage();

      return (
        <View className="flex-1 bg-background items-center justify-center p-6">
          <ScrollView className="flex-1 w-full" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            {/* Error Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-error/20 rounded-full items-center justify-center mb-4">
                <Text className="text-4xl">{icon}</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2 text-center">{title}</Text>
              <Text className="text-sm text-muted text-center leading-relaxed px-4">
                {subtitle}
              </Text>
            </View>

            {/* Error Details (Development only) */}
            {__DEV__ && this.state.error && (
              <View className="bg-surface rounded-lg p-4 mb-6 border border-error/30">
                <Text className="text-xs font-mono text-error mb-2">Dettagli errore:</Text>
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
                <Text className="text-white font-semibold">Riprova</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  this.resetError();
                }}
                className="bg-surface rounded-lg py-3 items-center border border-border"
              >
                <Text className="text-foreground font-semibold">Torna alla Home</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
