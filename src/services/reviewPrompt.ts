import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

type ReviewPromptState = {
  pocketSaveCount: number;
  lastPromptedAt?: string;
};

const REVIEW_PROMPT_STATE_KEY = 'gowandr:reviewPromptState';
const MIN_POCKET_SAVES_BEFORE_PROMPT = 3;
const REVIEW_PROMPT_COOLDOWN_DAYS = 90;

export async function maybeRequestReviewAfterPocketSave(totalPocketItems: number) {
  if (Platform.OS === 'web') return;

  const state = await loadReviewPromptState();
  const nextState = {
    ...state,
    pocketSaveCount: Math.max(state.pocketSaveCount + 1, totalPocketItems),
  };

  if (!canAskForReview(nextState)) {
    await saveReviewPromptState(nextState);
    return;
  }

  const hasReviewAction = await StoreReview.hasAction();
  if (!hasReviewAction) {
    await saveReviewPromptState(nextState);
    return;
  }

  const promptedState = {
    ...nextState,
    lastPromptedAt: new Date().toISOString(),
  };
  await saveReviewPromptState(promptedState);

  setTimeout(() => {
    StoreReview.requestReview().catch(() => undefined);
  }, 1200);
}

async function loadReviewPromptState(): Promise<ReviewPromptState> {
  try {
    const value = await AsyncStorage.getItem(REVIEW_PROMPT_STATE_KEY);
    if (!value) return { pocketSaveCount: 0 };
    const parsed = JSON.parse(value) as Partial<ReviewPromptState>;
    return {
      pocketSaveCount: typeof parsed.pocketSaveCount === 'number' ? parsed.pocketSaveCount : 0,
      lastPromptedAt: typeof parsed.lastPromptedAt === 'string' ? parsed.lastPromptedAt : undefined,
    };
  } catch {
    return { pocketSaveCount: 0 };
  }
}

async function saveReviewPromptState(state: ReviewPromptState) {
  await AsyncStorage.setItem(REVIEW_PROMPT_STATE_KEY, JSON.stringify(state));
}

function canAskForReview(state: ReviewPromptState) {
  if (state.pocketSaveCount < MIN_POCKET_SAVES_BEFORE_PROMPT) return false;
  if (!state.lastPromptedAt) return true;

  const lastPrompted = new Date(state.lastPromptedAt).getTime();
  if (Number.isNaN(lastPrompted)) return true;

  const cooldownMs = REVIEW_PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - lastPrompted >= cooldownMs;
}
