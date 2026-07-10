import React from 'react';
import { Alert, Pressable, StyleProp, ViewStyle } from 'react-native';

export const SUPERWALL_PUBLIC_API_KEYS = {
  android: '',
  ios: '',
};

export const SUPERWALL_PLACEMENTS = {
  upgrade: 'upgrade',
};

type SuperwallRootProps = {
  children: React.ReactNode;
};

type SuperwallUpgradeButtonProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

type SuperwallUpgradePromptOptions = {
  source?: string;
  reason?: string;
  onComplete?: () => void;
};

export function isSuperwallConfigured() {
  return false;
}

export function SuperwallRoot({ children }: SuperwallRootProps) {
  return <>{children}</>;
}

export function SuperwallUpgradeButton({ children, style }: SuperwallUpgradeButtonProps) {
  return (
    <Pressable
      onPress={() => {
        Alert.alert('Native build needed', 'Superwall paywalls open in Android and iOS builds, not the web preview.');
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export function useSuperwallUpgradePrompt(_options: SuperwallUpgradePromptOptions = {}) {
  return React.useCallback(async () => {
    Alert.alert('Native build needed', 'Superwall paywalls open in Android and iOS builds, not the web preview.');
  }, []);
}
