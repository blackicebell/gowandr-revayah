import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleProp, ViewStyle } from 'react-native';
import { CustomerInfo, PurchasesOffering, PurchasesOfferings } from 'react-native-purchases';
import {
  addCustomerInfoUpdateListener,
  configureRevenueCat,
  customerHasPlus,
  fetchCustomerInfo,
  fetchOfferings,
  getCurrentOffering,
  getRevenueCatAppUserId,
  getRevenueCatErrorMessage,
  isRevenueCatSupportedPlatform,
  presentCustomerCenter,
  presentPlusPaywall,
  presentPlusPaywallIfNeeded,
  restorePurchases,
} from './revenueCat';

type RevenueCatContextValue = {
  appUserId?: string;
  customerInfo?: CustomerInfo;
  offerings?: PurchasesOfferings;
  currentOffering?: PurchasesOffering | null;
  isPlus: boolean;
  loading: boolean;
  paywallLoading: boolean;
  error?: string;
  refreshCustomerInfo: () => Promise<CustomerInfo | undefined>;
  showPlusPaywall: (force?: boolean) => Promise<CustomerInfo | undefined>;
  restorePlusPurchases: () => Promise<CustomerInfo | undefined>;
  openCustomerCenter: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatContextValue | undefined>(undefined);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [appUserId, setAppUserId] = useState<string | undefined>();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | undefined>();
  const [offerings, setOfferings] = useState<PurchasesOfferings | undefined>();
  const [loading, setLoading] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refreshCustomerInfo = useCallback(async () => {
    if (!isRevenueCatSupportedPlatform()) return undefined;

    try {
      const result = await fetchCustomerInfo();
      setCustomerInfo(result.customerInfo);
      setError(undefined);
      return result.customerInfo;
    } catch (refreshError) {
      const message = getRevenueCatErrorMessage(refreshError);
      setError(message);
      return undefined;
    }
  }, []);

  const refreshOfferings = useCallback(async () => {
    if (!isRevenueCatSupportedPlatform()) return undefined;

    try {
      const nextOfferings = await fetchOfferings();
      setOfferings(nextOfferings);
      setError(undefined);
      return nextOfferings;
    } catch (offeringsError) {
      const message = getRevenueCatErrorMessage(offeringsError);
      setError(message);
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!isRevenueCatSupportedPlatform()) return undefined;

    let isMounted = true;
    let removeCustomerInfoListener: (() => void) | undefined;

    async function loadSubscriptionState() {
      setLoading(true);

      try {
        const config = await configureRevenueCat();
        if (!config.configured) {
          if (isMounted) setError('Subscriptions are not configured for this build yet.');
          return;
        }

        removeCustomerInfoListener = addCustomerInfoUpdateListener((updatedCustomerInfo) => {
          if (!isMounted) return;
          setCustomerInfo(updatedCustomerInfo);
        });

        const [userId, customerResult, nextOfferings] = await Promise.all([
          getRevenueCatAppUserId(),
          fetchCustomerInfo(),
          fetchOfferings().catch((offeringsError) => {
            console.warn('RevenueCat offerings unavailable', offeringsError);
            return undefined;
          }),
        ]);

        if (!isMounted) return;
        setAppUserId(userId);
        setCustomerInfo(customerResult.customerInfo);
        if (nextOfferings) setOfferings(nextOfferings);
        setError(undefined);
      } catch (loadError) {
        if (!isMounted) return;
        setError(getRevenueCatErrorMessage(loadError));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSubscriptionState();

    return () => {
      isMounted = false;
      removeCustomerInfoListener?.();
    };
  }, []);

  const showPlusPaywall = useCallback(
    async (force = true) => {
      if (!isRevenueCatSupportedPlatform()) {
        Alert.alert('Native build needed', 'RevenueCat paywalls open in Android and iOS builds, not the web preview.');
        return undefined;
      }

      if (paywallLoading) return customerInfo;
      setPaywallLoading(true);

      try {
        const currentOffering = getCurrentOffering(offerings) ?? getCurrentOffering(await refreshOfferings());
        const result = force ? await presentPlusPaywall(currentOffering) : await presentPlusPaywallIfNeeded(currentOffering);
        setCustomerInfo(result.customerInfo);
        setError(undefined);
        return result.customerInfo;
      } catch (paywallError) {
        const message = getRevenueCatErrorMessage(paywallError);
        setError(message);
        if (message !== 'Purchase cancelled.') Alert.alert('Paywall unavailable', message);
        return undefined;
      } finally {
        setPaywallLoading(false);
      }
    },
    [customerInfo, offerings, paywallLoading, refreshOfferings],
  );

  const restorePlusPurchases = useCallback(async () => {
    if (!isRevenueCatSupportedPlatform()) {
      Alert.alert('Native build needed', 'Purchases can be restored in Android and iOS builds.');
      return undefined;
    }

    setPaywallLoading(true);
    try {
      const result = await restorePurchases();
      setCustomerInfo(result.customerInfo);
      setError(undefined);
      Alert.alert('Restore complete', result.isPlus ? 'GoWandr Plus is active.' : 'No active GoWandr Plus purchase was found.');
      return result.customerInfo;
    } catch (restoreError) {
      const message = getRevenueCatErrorMessage(restoreError);
      setError(message);
      Alert.alert('Restore failed', message);
      return undefined;
    } finally {
      setPaywallLoading(false);
    }
  }, []);

  const openCustomerCenter = useCallback(async () => {
    if (!isRevenueCatSupportedPlatform()) {
      Alert.alert('Native build needed', 'Customer Center opens in Android and iOS builds.');
      return;
    }

    try {
      await presentCustomerCenter({
        onRestoreCompleted: ({ customerInfo: restoredInfo }) => {
          setCustomerInfo(restoredInfo);
          setError(undefined);
        },
        onRestoreFailed: ({ error: restoreError }) => {
          setError(getRevenueCatErrorMessage(restoreError));
        },
      });
      await refreshCustomerInfo();
    } catch (customerCenterError) {
      const message = getRevenueCatErrorMessage(customerCenterError);
      setError(message);
      Alert.alert('Customer Center unavailable', message);
    }
  }, [refreshCustomerInfo]);

  const value = useMemo(
    () => ({
      appUserId,
      customerInfo,
      offerings,
      currentOffering: getCurrentOffering(offerings),
      isPlus: customerHasPlus(customerInfo),
      loading,
      paywallLoading,
      error,
      refreshCustomerInfo,
      showPlusPaywall,
      restorePlusPurchases,
      openCustomerCenter,
    }),
    [appUserId, customerInfo, error, loading, offerings, openCustomerCenter, paywallLoading, refreshCustomerInfo, restorePlusPurchases, showPlusPaywall],
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) throw new Error('useRevenueCat must be used inside RevenueCatProvider');
  return context;
}

export function RevenueCatPaywallButton({
  children,
  style,
  disabledStyle,
  source,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  source?: string;
}) {
  const { paywallLoading, showPlusPaywall } = useRevenueCat();

  return (
    <Pressable
      onPress={() => {
        showPlusPaywall(true).catch(() => undefined);
      }}
      style={[style, paywallLoading && disabledStyle]}
      disabled={paywallLoading}
      accessibilityRole="button"
      accessibilityLabel={source ? `Open GoWandr Plus from ${source}` : 'Open GoWandr Plus'}
    >
      {children}
    </Pressable>
  );
}
