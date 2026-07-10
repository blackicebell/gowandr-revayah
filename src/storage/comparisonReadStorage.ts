import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPARISON_READ_COUNTS_KEY = 'gowandr:comparisonReadCounts';

export async function loadComparisonReadCounts(): Promise<Record<string, number>> {
  try {
    const value = await AsyncStorage.getItem(COMPARISON_READ_COUNTS_KEY);
    if (!value) return {};

    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, count]) => typeof count === 'number' && Number.isFinite(count)),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function saveComparisonReadCounts(readCounts: Record<string, number>) {
  await AsyncStorage.setItem(COMPARISON_READ_COUNTS_KEY, JSON.stringify(readCounts));
}
