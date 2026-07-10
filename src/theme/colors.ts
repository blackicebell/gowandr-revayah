import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';

export type ThemeName = 'green' | 'pink' | 'blue';

export type AppColors = {
  name: ThemeName;
  label: string;
  canvas: string;
  canvasDeep: string;
  paper: string;
  paperSoft: string;
  cloud: string;
  mist: string;
  teal: string;
  tealDark: string;
  accent: string;
  accentSoft: string;
  sky: string;
  coral: string;
  sun: string;
  charcoal: string;
  muted: string;
  line: string;
  white: string;
  danger: string;
  glass: string;
};

export const themes: Record<ThemeName, AppColors> = {
  green: {
    name: 'green',
    label: 'Mint Luxe',
    canvas: '#EEF8F4',
    canvasDeep: '#D8F4EA',
    paper: 'rgba(255,255,255,0.72)',
    paperSoft: 'rgba(255,255,255,0.52)',
    cloud: 'rgba(255,255,255,0.38)',
    mist: 'rgba(15,17,21,0.52)',
    teal: '#A8F0D4',
    tealDark: '#137D68',
    accent: '#6ED8B5',
    accentSoft: 'rgba(168,240,212,0.28)',
    sky: '#6ED8B5',
    coral: '#2FAF8A',
    sun: '#A8F0D4',
    charcoal: '#202623',
    muted: 'rgba(0,0,0,0.65)',
    line: 'rgba(255,255,255,0.22)',
    white: '#FFFFFF',
    danger: '#D95E4F',
    glass: 'rgba(255,255,255,0.12)',
  },
  pink: {
    name: 'pink',
    label: 'Rose',
    canvas: '#160A12',
    canvasDeep: '#080306',
    paper: '#23101C',
    paperSoft: '#321827',
    cloud: '#442337',
    mist: '#E8BCD4',
    teal: '#FF8FC7',
    tealDark: '#E45F9D',
    accent: '#FFD166',
    accentSoft: '#4A2B36',
    sky: '#F5D7E8',
    coral: '#FF9C74',
    sun: '#FFE28A',
    charcoal: '#FFF6FB',
    muted: '#C9A1B7',
    line: '#4B2A3B',
    white: '#FFFFFF',
    danger: '#FF776F',
    glass: 'rgba(255,255,255,0.09)',
  },
  blue: {
    name: 'blue',
    label: 'Ocean',
    canvas: '#07111F',
    canvasDeep: '#030710',
    paper: '#0E1B2E',
    paperSoft: '#142641',
    cloud: '#1E3557',
    mist: '#AFC8E8',
    teal: '#68C7FF',
    tealDark: '#3D96D8',
    accent: '#A9F0D1',
    accentSoft: '#183D52',
    sky: '#C9E5FF',
    coral: '#FFB38F',
    sun: '#F6D365',
    charcoal: '#F4F8FF',
    muted: '#9BB1CC',
    line: '#263E60',
    white: '#FFFFFF',
    danger: '#FF837B',
    glass: 'rgba(255,255,255,0.09)',
  },
};

export const colors = themes.green;

export const font = {
  heading: Platform.select({
    ios: 'InterTight_700Bold',
    android: undefined,
    web: 'InterTight_700Bold, Satoshi, Neue Montreal, Inter Tight, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: undefined,
  }),
  body: Platform.select({
    ios: 'InterTight_400Regular',
    android: undefined,
    web: 'InterTight_400Regular, Switzer, Inter Tight, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: undefined,
  }),
  medium: Platform.select({
    ios: 'InterTight_500Medium',
    android: undefined,
    web: 'InterTight_500Medium, Switzer, Inter Tight, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: undefined,
  }),
  semibold: Platform.select({
    ios: 'InterTight_600SemiBold',
    android: undefined,
    web: 'InterTight_600SemiBold, Satoshi, Switzer, Inter Tight, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: undefined,
  }),
  family: Platform.select({
    ios: 'InterTight_400Regular',
    android: undefined,
    web: 'InterTight_400Regular, Switzer, Inter Tight, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: undefined,
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    default: undefined,
  }),
};

export const androidTextReset =
  Platform.OS === 'android'
    ? {
        backgroundColor: 'transparent' as const,
        includeFontPadding: false,
        textAlignVertical: 'center' as const,
      }
    : {};

export const ThemeContext = createContext<AppColors>(themes.green);

export function ThemeProvider({ value, children }: { value: AppColors; children: React.ReactNode }) {
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useThemeColors() {
  return useContext(ThemeContext);
}
