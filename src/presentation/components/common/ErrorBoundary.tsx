import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Theme } from '../../theme/adaptiveTheme';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetError: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render(): ReactNode {
    const { hasError, error, showDetails } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback({ error, resetError: this.resetError });
      }
      if (fallback) {
        return fallback;
      }

      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <AlertTriangle size={36} color="#000000" strokeWidth={2.5} />
              </View>

              <Text style={styles.title}>ALGO HA SALIDO MAL</Text>
              <Text style={styles.subtitle}>
                La aplicación ha encontrado un problema inesperado. Puedes intentar recuperar el estado presionando el botón de abajo.
              </Text>

              <View style={styles.errorBox}>
                <Text style={styles.errorMessage} numberOfLines={showDetails ? undefined : 3}>
                  {error.message || String(error)}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver detalles del error"
                  onPress={this.toggleDetails}
                  style={styles.detailsToggle}
                >
                  <Text style={styles.detailsToggleText}>
                    {showDetails ? 'OCULTAR DETALLES' : 'VER DETALLES TÉCNICOS'}
                  </Text>
                  {showDetails ? (
                    <ChevronUp size={14} color="#000000" strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={14} color="#000000" strokeWidth={2.5} />
                  )}
                </Pressable>

                {showDetails && error.stack && (
                  <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                    <Text style={styles.stackText}>{error.stack}</Text>
                  </ScrollView>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reintentar"
                onPress={this.resetError}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <RefreshCw size={16} color="#000000" strokeWidth={3} />
                <Text style={styles.retryButtonText}>REINTENTAR</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFE600',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFE600',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    padding: 24,
    alignItems: 'center',
    ...Theme.shadows.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE600',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Theme.shadows.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.radius.sm,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#DC2626',
    lineHeight: 16,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.4,
  },
  stackScroll: {
    maxHeight: 140,
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    padding: 8,
  },
  stackText: {
    fontSize: 10,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    color: '#38BDF8',
    lineHeight: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00E5FF',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    borderRadius: Theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Theme.shadows.sm,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  pressed: {
    ...Theme.pressed,
  },
});
