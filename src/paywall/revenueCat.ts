import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesOffering, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { CustomerCenterCallbacks, PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_API_KEYS = {
  android: 'goog_HGOuiFnOxZexAYewiNlaKoUhTLG',
  ios: 'appl_EfdvxypPuXSXRlOapFYqPfaUePx',
};

export const REVENUECAT_API_KEY = Platform.OS === 'ios' || Platform.OS === 'android' ? REVENUECAT_API_KEYS[Platform.OS] : undefined;
export const PLUS_ENTITLEMENT_ID = 'GoWandr Plus';
export const PRODUCT_IDS = {
  yearly: 'yearly',
  monthly: 'monthly',
};

let isConfigured = false;

function hasRealRevenueCatKey(key?: string) {
  return typeof key === 'string' && (key.startsWith('goog_') || key.startsWith('appl_') || key.startsWith('test_'));
}

export function isRevenueCatSupportedPlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function isRevenueCatConfigured() {
  return isRevenueCatSupportedPlatform() && hasRealRevenueCatKey(REVENUECAT_API_KEY);
}

export function customerHasPlus(customerInfo: unknown) {
  const entitlements = (customerInfo as { entitlements?: { active?: Record<string, unknown> } } | undefined)?.entitlements?.active;
  return Boolean(entitlements?.[PLUS_ENTITLEMENT_ID]);
}

export function getCurrentOffering(offerings?: PurchasesOfferings | null): PurchasesOffering | null {
  return offerings?.current ?? null;
}

export function getOfferingPackageByProductId(offering: PurchasesOffering | null | undefined, productId: string): PurchasesPackage | undefined {
  return offering?.availablePackages.find((item) => item.product.identifier === productId);
}

export function getRevenueCatErrorMessage(error: unknown) {
  if (!error) return 'Something went wrong with subscriptions. Please try again.';
  if ((error as { userCancelled?: boolean }).userCancelled) return 'Purchase cancelled.';
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code.trim()) return code;
  return 'Something went wrong with subscriptions. Please try again.';
}

export async function configureRevenueCat() {
  if (!isRevenueCatSupportedPlatform()) {
    return { configured: false, reason: 'unsupported-platform' };
  }

  const apiKey = REVENUECAT_API_KEY;
  if (!apiKey || !hasRealRevenueCatKey(apiKey)) {
    return { configured: false, reason: 'missing-api-key' };
  }

  if (isConfigured) {
    return { configured: true };
  }

  await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  isConfigured = true;

  return { configured: true };
}

export function addCustomerInfoUpdateListener(listener: (customerInfo: CustomerInfo) => void) {
  if (!isRevenueCatSupportedPlatform()) return () => undefined;

  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getRevenueCatAppUserId() {
  await configureRevenueCat();
  return Purchases.getAppUserID();
}

export async function fetchCustomerInfo() {
  await configureRevenueCat();
  const customerInfo = await Purchases.getCustomerInfo();
  return {
    customerInfo,
    isPlus: customerHasPlus(customerInfo),
  };
}

export async function fetchOfferings() {
  await configureRevenueCat();
  return Purchases.getOfferings();
}

export async function purchasePackage(packageToPurchase: PurchasesPackage) {
  await configureRevenueCat();
  const result = await Purchases.purchasePackage(packageToPurchase);
  return {
    ...result,
    isPlus: customerHasPlus(result.customerInfo),
  };
}

export async function restorePurchases() {
  await configureRevenueCat();
  const customerInfo = await Purchases.restorePurchases();
  return {
    customerInfo,
    isPlus: customerHasPlus(customerInfo),
  };
}

export async function presentPlusPaywall(offering?: PurchasesOffering | null) {
  await configureRevenueCat();
  const result = await RevenueCatUI.presentPaywall({
    offering: offering ?? undefined,
    displayCloseButton: true,
  });
  const customerInfo = await Purchases.getCustomerInfo();

  return {
    result,
    customerInfo,
    isPlus: customerHasPlus(customerInfo),
  };
}

export async function presentPlusPaywallIfNeeded(offering?: PurchasesOffering | null) {
  await configureRevenueCat();
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PLUS_ENTITLEMENT_ID,
    offering: offering ?? undefined,
    displayCloseButton: true,
  });
  const customerInfo = await Purchases.getCustomerInfo();

  return {
    result,
    customerInfo,
    isPlus: customerHasPlus(customerInfo),
  };
}

export async function presentCustomerCenter(callbacks: CustomerCenterCallbacks = {}) {
  await configureRevenueCat();
  return RevenueCatUI.presentCustomerCenter({ callbacks });
}

export { PAYWALL_RESULT };
