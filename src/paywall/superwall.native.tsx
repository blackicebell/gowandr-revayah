import React, { useCallback } from 'react';
import { Alert, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import { SuperwallProvider, usePlacement } from 'expo-superwall';
import { PLUS_ENTITLEMENT_ID } from './revenueCat';

export const SUPERWALL_PUBLIC_API_KEYS = {
  android: 'pk_lflFN_ubLdaeuc_XRmBLl',
  ios: 'pk_Mcdwakwx-f0inNWAhHZH_',
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
  disabledStyle?: StyleProp<ViewStyle>;
  source?: string;
  onComplete?: () => void;
};

type SuperwallUpgradePromptOptions = {
  source?: string;
  reason?: string;
  onComplete?: () => void;
};

function hasRealSuperwallKey(key?: string) {
  return typeof key === 'string' && key.startsWith('pk_') && !key.includes('REPLACE_WITH');
}

export function isSuperwallConfigured() {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? hasRealSuperwallKey(SUPERWALL_PUBLIC_API_KEYS[Platform.OS]) : false;
}

export function SuperwallRoot({ children }: SuperwallRootProps) {
  return (
    <SuperwallProvider
      apiKeys={SUPERWALL_PUBLIC_API_KEYS}
      options={{ shouldObservePurchases: true }}
      onConfigurationError={(error) => {
        console.warn('Superwall configuration failed', error);
      }}
    >
      {children}
    </SuperwallProvider>
  );
}

export function SuperwallUpgradeButton({ children, style, disabledStyle, source = 'app_header', onComplete }: SuperwallUpgradeButtonProps) {
  if (!isSuperwallConfigured()) {
    return (
      <Pressable
        onPress={() => {
          Alert.alert('Paywall key needed', 'Add the GoWandr Superwall key before testing this placement.');
        }}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <NativeSuperwallUpgradeButton style={style} disabledStyle={disabledStyle} source={source} onComplete={onComplete}>
      {children}
    </NativeSuperwallUpgradeButton>
  );
}

export function useSuperwallUpgradePrompt({ source = 'app_gate', reason, onComplete }: SuperwallUpgradePromptOptions = {}) {
  const { registerPlacement } = usePlacement({
    onDismiss: onComplete,
    onSkip: onComplete,
    onError: (error) => {
      const message = getSuperwallErrorMessage(error);
      Alert.alert('Paywall unavailable', message);
    },
  });

  return useCallback(async () => {
    if (!isSuperwallConfigured()) {
      Alert.alert('Paywall key needed', 'Add the GoWandr Superwall key before testing this placement.');
      return;
    }

    try {
      await registerPlacement({
        placement: SUPERWALL_PLACEMENTS.upgrade,
        params: {
          source,
          reason,
          entitlement: PLUS_ENTITLEMENT_ID,
        },
        feature: () => {
          onComplete?.();
        },
      });
    } catch (error) {
      const message = getSuperwallErrorMessage(error);
      Alert.alert('Paywall unavailable', message);
    }
  }, [onComplete, reason, registerPlacement, source]);
}

function NativeSuperwallUpgradeButton({ children, style, disabledStyle, source, onComplete }: SuperwallUpgradeButtonProps & { source: string }) {
  const { registerPlacement } = usePlacement({
    onDismiss: onComplete,
    onSkip: onComplete,
    onError: (error) => {
      const message = getSuperwallErrorMessage(error);
      Alert.alert('Paywall unavailable', message);
    },
  });
  const disabled = false;

  const showUpgrade = useCallback(async () => {
    if (disabled) return;

    try {
      await registerPlacement({
        placement: SUPERWALL_PLACEMENTS.upgrade,
        params: {
          source,
          entitlement: PLUS_ENTITLEMENT_ID,
        },
        feature: () => {
          onComplete?.();
        },
      });
    } catch (error) {
      const message = getSuperwallErrorMessage(error);
      Alert.alert('Paywall unavailable', message);
    }
  }, [disabled, onComplete, registerPlacement, source]);

  return (
    <Pressable onPress={showUpgrade} style={[style, disabled && disabledStyle]} disabled={disabled}>
      {children}
    </Pressable>
  );
}

function getSuperwallErrorMessage(error: unknown) {
  const message = (error as { message?: unknown } | undefined)?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Please try again in a moment.';
}
