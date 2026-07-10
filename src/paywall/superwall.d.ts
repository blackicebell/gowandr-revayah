import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export const SUPERWALL_PUBLIC_API_KEYS: {
  android: string;
  ios: string;
};

export const SUPERWALL_PLACEMENTS: {
  upgrade: string;
};

export function isSuperwallConfigured(): boolean;

export function SuperwallRoot(props: { children: React.ReactNode }): React.ReactElement;

export function SuperwallUpgradeButton(props: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  source?: string;
  onComplete?: () => void;
}): React.ReactElement;

export function useSuperwallUpgradePrompt(options?: {
  source?: string;
  reason?: string;
  onComplete?: () => void;
}): () => Promise<void>;
