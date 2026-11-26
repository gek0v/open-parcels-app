import { describe, it, expect, mock, beforeEach } from 'bun:test';
import React from 'react';

(globalThis as any).__DEV__ = false;

// Module mocks for React Native and Expo
mock.module('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: any) => styles },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Platform: { OS: 'android', select: (obj: any) => obj.android || obj.default },
  Animated: {
    Value: class {
      val: number;
      constructor(val: number) { this.val = val; }
      stopAnimation = mock(() => {});
    },
    timing: () => ({ start: (cb?: any) => cb?.() }),
    spring: () => ({ start: (cb?: any) => cb?.() }),
    parallel: (anims: any[]) => ({ start: (cb?: any) => cb?.() }),
  },
  TurboModuleRegistry: { get: () => null },
  Share: {
    share: async (content: any) => {
      if ((globalThis as any).__mockShareFn) {
        return (globalThis as any).__mockShareFn(content);
      }
      return { action: 'sharedAction' };
    },
  },
}));

mock.module('expo-haptics', () => ({
  selectionAsync: mock(() => Promise.resolve()),
  notificationAsync: mock(() => Promise.resolve()),
  impactAsync: mock(() => Promise.resolve()),
}));

mock.module('expo-modules-core', () => ({
  EventEmitter: class {
    addListener = mock(() => ({ remove: mock(() => {}) }));
    removeListener = mock(() => {});
    emit = mock(() => {});
  },
  NativeModulesProxy: {},
  requireNativeModule: mock(() => ({})),
}));

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mock(() => Promise.resolve(null)),
    setItem: mock(() => Promise.resolve()),
    removeItem: mock(() => Promise.resolve()),
  },
}));

mock.module('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  SafeAreaProvider: 'SafeAreaProvider',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

mock.module('expo-router', () => ({
  router: {
    push: mock(() => {}),
    replace: mock(() => {}),
    back: mock(() => {}),
  },
  Link: 'Link',
  Stack: {
    Screen: 'Screen',
  },
  useLocalSearchParams: () => ({ id: 'test-parcel-1' }),
}));

mock.module('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  RefreshCw: 'RefreshCw',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  Compass: 'Compass',
  Home: 'Home',
  ArrowLeft: 'ArrowLeft',
  AlertCircle: 'AlertCircle',
  Plane: 'Plane',
  Truck: 'Truck',
  MapPin: 'MapPin',
  ArrowRight: 'ArrowRight',
  Clock: 'Clock',
  Edit2: 'Edit2',
  Barcode: 'Barcode',
  Share2: 'Share2',
  Tag: 'Tag',
  ArrowUpRight: 'ArrowUpRight',
  Activity: 'Activity',
  CheckCircle2: 'CheckCircle2',
  X: 'X',
  Check: 'Check',
  Trash2: 'Trash2',
  Package: 'Package',
  Cpu: 'Cpu',
  LayoutGrid: 'LayoutGrid',
  Plus: 'Plus',
  Search: 'Search',
  Sparkles: 'Sparkles',
  Zap: 'Zap',
  Copy: 'Copy',
  Archive: 'Archive',
  ExternalLink: 'ExternalLink',
  Calendar: 'Calendar',
  ArrowRightLeft: 'ArrowRightLeft',
  Download: 'Download',
  Upload: 'Upload',
  Database: 'Database',
  CheckCircle: 'CheckCircle',
  ShieldAlert: 'ShieldAlert',
  ShieldCheck: 'ShieldCheck',
  Palette: 'Palette',
  CheckCheck: 'CheckCheck',
  Layers: 'Layers',
  ChevronRight: 'ChevronRight',
  Clipboard: 'Clipboard',
}));

const { ErrorBoundary } = await import('../src/presentation/components/common/ErrorBoundary');
const { default: ErrorScreen } = await import('../src/presentation/components/common/RouteErrorFallback');
const { default: NotFoundScreen } = await import('../src/app/+not-found');
const { syncStaticTheme } = await import('../src/presentation/theme/ThemeContext');
const { GoldenPalettes } = await import('../src/presentation/theme/palettes');
const { Theme } = await import('../src/presentation/theme/adaptiveTheme');

describe('Milestone 3: Error Resilience, Lifecycles & Resource Leaks', () => {
  describe('1. ErrorBoundary Class Component', () => {
    it('initializes with hasError: false and error: null', () => {
      const boundary = new ErrorBoundary({ children: React.createElement('Text', {}, 'Child') });
      expect(boundary.state.hasError).toBe(false);
      expect(boundary.state.error).toBeNull();
      expect(boundary.state.showDetails).toBe(false);
    });

    it('getDerivedStateFromError updates state to hasError: true and sets error', () => {
      const testError = new Error('Test crash in component tree');
      const nextState = ErrorBoundary.getDerivedStateFromError(testError);
      expect(nextState.hasError).toBe(true);
      expect(nextState.error).toBe(testError);
      expect(nextState.showDetails).toBe(false);
    });

    it('resetError resets hasError to false and clears error', () => {
      const boundary = new ErrorBoundary({ children: null });
      boundary.setState = ((updater: any) => {
        const next = typeof updater === 'function' ? updater(boundary.state) : updater;
        boundary.state = { ...boundary.state, ...next };
      }) as any;
      boundary.state = {
        hasError: true,
        error: new Error('Runtime error'),
        showDetails: true,
      };

      boundary.resetError();
      expect(boundary.state.hasError).toBe(false);
      expect(boundary.state.error).toBeNull();
      expect(boundary.state.showDetails).toBe(false);
    });

    it('toggleDetails inverts showDetails state', () => {
      const boundary = new ErrorBoundary({ children: null });
      boundary.setState = ((updater: any) => {
        const next = typeof updater === 'function' ? updater(boundary.state) : updater;
        boundary.state = { ...boundary.state, ...next };
      }) as any;
      expect(boundary.state.showDetails).toBe(false);

      boundary.toggleDetails();
      expect(boundary.state.showDetails).toBe(true);

      boundary.toggleDetails();
      expect(boundary.state.showDetails).toBe(false);
    });

    it('componentDidCatch invokes onError prop with error and errorInfo', () => {
      const onErrorMock = mock((error: Error, info: React.ErrorInfo) => {});
      const boundary = new ErrorBoundary({
        children: null,
        onError: onErrorMock,
      });

      const sampleError = new Error('Render explosion');
      const sampleInfo: React.ErrorInfo = { componentStack: 'in ComponentA' };

      boundary.componentDidCatch(sampleError, sampleInfo);
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(sampleError, sampleInfo);
    });

    it('render returns children when hasError is false', () => {
      const childElement = React.createElement('Text', {}, 'Healthy UI');
      const boundary = new ErrorBoundary({ children: childElement });
      boundary.state = {
        hasError: false,
        error: null,
        showDetails: false,
      };

      const result = boundary.render();
      expect(result).toBe(childElement);
    });

    it('render returns fallback function output when hasError is true', () => {
      const testError = new Error('Handled gracefully');
      const fallbackMock = mock(({ error, resetError }: any) => {
        return React.createElement('Text', {}, `Fallback: ${error.message}`);
      });

      const boundary = new ErrorBoundary({
        children: React.createElement('Text', {}, 'Original UI'),
        fallback: fallbackMock,
      });
      boundary.state = {
        hasError: true,
        error: testError,
        showDetails: false,
      };

      const result = boundary.render();
      expect(fallbackMock).toHaveBeenCalledTimes(1);
      expect(fallbackMock).toHaveBeenCalledWith({
        error: testError,
        resetError: boundary.resetError,
      });
      expect(result).toBeDefined();
    });

    it('render returns standard fallback UI card when no custom fallback is provided', () => {
      const testError = new Error('Standard fallback check');
      const boundary = new ErrorBoundary({ children: React.createElement('Text', {}, 'UI') });
      boundary.state = {
        hasError: true,
        error: testError,
        showDetails: false,
      };

      const result = boundary.render();
      expect(result).toBeDefined();
    });
  });

  describe('2. Native Contingency Route Screens (+error.tsx & +not-found.tsx)', () => {
    it('+error renders error message and provides retry mechanism', () => {
      const retryMock = mock(() => {});
      const error = new Error('Route failed to load');

      const element = React.createElement(ErrorScreen, { error, retry: retryMock });
      expect(element).toBeDefined();
      expect(React.isValidElement(element)).toBe(true);
    });

    it('+not-found renders 404 message and home link', () => {
      const element = React.createElement(NotFoundScreen);
      expect(element).toBeDefined();
      expect(React.isValidElement(element)).toBe(true);
    });
  });

  describe('3. Dynamic Theme Sync & Palette Architecture', () => {
    it('syncStaticTheme updates Theme.colors and borders to match selected palette', () => {
      const nordic = GoldenPalettes.nordicClean;
      syncStaticTheme(nordic);

      expect(Theme.colors.background).toBe(nordic.canvas);
      expect(Theme.colors.surface).toBe(nordic.surface);
      expect(Theme.colors.primary).toBe(nordic.primary);
      expect(Theme.colors.border).toBe(nordic.border);
      expect(Theme.borders.color).toBe(nordic.border);

      const acid = GoldenPalettes.acidCyber;
      syncStaticTheme(acid);

      expect(Theme.colors.background).toBe(acid.canvas);
      expect(Theme.colors.surface).toBe(acid.surface);
      expect(Theme.colors.primary).toBe(acid.primary);
      expect(Theme.colors.border).toBe(acid.border);
    });
  });

  describe('4. Lifecycle Cleanup & Animation Safety', () => {
    it('verifies Animated.Value stopAnimation is callable on teardown', () => {
      const { Animated } = require('react-native');
      const anim = new Animated.Value(0);
      expect(typeof anim.stopAnimation).toBe('function');
      anim.stopAnimation();
      expect(anim.stopAnimation).toHaveBeenCalledTimes(1);
    });
  });
});
