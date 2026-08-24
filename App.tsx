import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';
import { androidTextReset, font, ThemeProvider, themes, useThemeColors } from './src/theme/colors';
import { ComparisonResponse, MatchupResultSummary, MatchupSession, PlanChecklistItem, PocketItem, TripDraft, TripIdea, VoteAnswer } from './src/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { EchoScreen } from './src/screens/EchoScreen';
import { EchoDetailScreen } from './src/screens/EchoDetailScreen';
import { AddIdeaScreen } from './src/screens/AddIdeaScreen';
import { CreateMatchupScreen } from './src/screens/CreateMatchupScreen';
import { VotingScreen } from './src/screens/VotingScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { SharedComparisonScreen } from './src/screens/SharedComparisonScreen';
import { ComparisonResultsScreen } from './src/screens/ComparisonResultsScreen';
import { TripLabScreen } from './src/screens/TripLabScreen';
import { PocketScreen } from './src/screens/PocketScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { NewTripScreen } from './src/screens/NewTripScreen';
import { loadTrips, saveTrips } from './src/storage/tripsStorage';
import { loadHasSeenOnboarding, saveHasSeenOnboarding } from './src/storage/onboardingStorage';
import { closeMatchupSession, deleteComparisonResponse, deleteMatchupSession, loadMatchupSession, submitComparisonResponse } from './src/backend/matchupSessions';
import { loadOwnedMatchupSessionIds, saveOwnedMatchupSessionIds } from './src/storage/matchupSessionStorage';
import { loadComparisonReadCounts, saveComparisonReadCounts } from './src/storage/comparisonReadStorage';
import { PremiumBackground } from './src/components/PremiumBackground';
import { PressableScale } from './src/components/PressableScale';
import { starterPhotos } from './src/data/starterPhotos';
import { RevenueCatProvider, useRevenueCat } from './src/paywall/RevenueCatProvider';
import { SuperwallRoot, SuperwallUpgradeButton, useSuperwallUpgradePrompt } from './src/paywall/superwall';
import { maybeRequestReviewAfterPocketSave } from './src/services/reviewPrompt';

type PatchedText = typeof Text & {
  defaultProps?: { style?: unknown };
  __gowandrAndroidTextReset?: boolean;
};

const AndroidText = Text as PatchedText;
if (Platform.OS === 'android' && !AndroidText.__gowandrAndroidTextReset) {
  const previousStyle = AndroidText.defaultProps?.style;
  AndroidText.defaultProps = {
    ...(AndroidText.defaultProps ?? {}),
    style: previousStyle
      ? [previousStyle, { backgroundColor: 'transparent', includeFontPadding: false }]
      : { backgroundColor: 'transparent', includeFontPadding: false },
  };
  AndroidText.__gowandrAndroidTextReset = true;
}

type Tab = 'home' | 'ideas' | 'matchup' | 'lab' | 'pocket';
const FREE_TRIP_DRAFT_LIMIT = 3;
const FREE_SHARED_COMPARISON_LIMIT = 1;

type Route =
  | { name: 'home' }
  | { name: 'echo' }
  | { name: 'newTrip' }
  | { name: 'editTrip'; tripId: string }
  | { name: 'detail'; tripId: string }
  | { name: 'addIdea'; tripId: string; initialLink?: string }
  | { name: 'editIdea'; tripId: string; ideaId: string }
  | { name: 'createMatchup' }
  | { name: 'voting'; tripIds: string[]; matchupName: string }
  | { name: 'sharedVoting'; sessionId: string }
  | { name: 'sessionResults'; sessionId: string }
  | { name: 'results'; tripIds: string[]; votes: VoteAnswer[]; matchupName: string }
  | { name: 'lab'; tripId?: string }
  | { name: 'pocket'; tripId?: string; quickCaptureRequest?: number };

export default function App() {
  return (
    <SuperwallRoot>
      <RevenueCatProvider>
        <AppContent />
      </RevenueCatProvider>
    </SuperwallRoot>
  );
}

function AppContent() {
  const [fontsLoaded, fontError] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });
  const [route, setRoute] = useState<Route>(() => {
    const sharedSessionId = Platform.OS === 'web' ? getWebMatchupId() : undefined;
    return sharedSessionId ? { name: 'sharedVoting', sessionId: sharedSessionId } : { name: 'home' };
  });
  const [trips, setTrips] = useState<TripDraft[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [hasLoadedTrips, setHasLoadedTrips] = useState(false);
  const [momentumMessage, setMomentumMessage] = useState<string | undefined>();
  const [pendingFirstLink, setPendingFirstLink] = useState<string | undefined>();
  const [sharedSession, setSharedSession] = useState<MatchupSession | undefined>();
  const [sharedSessionLoading, setSharedSessionLoading] = useState(false);
  const [sharedSessionMessage, setSharedSessionMessage] = useState<string | undefined>();
  const [ownedSessionIds, setOwnedSessionIds] = useState<string[]>([]);
  const [ownedSessions, setOwnedSessions] = useState<MatchupSession[]>([]);
  const [ownedSessionsLoading, setOwnedSessionsLoading] = useState(false);
  const [comparisonReadCounts, setComparisonReadCounts] = useState<Record<string, number>>({});
  const theme = themes.green;
  const { isPlus, refreshCustomerInfo } = useRevenueCat();
  const showPlusUpgrade = useSuperwallUpgradePrompt({
    source: 'plus_gate',
    reason: 'free_limit',
    onComplete: () => {
      refreshCustomerInfo().catch(() => undefined);
    },
  });
  const routeProgress = useRef(new Animated.Value(1)).current;
  const canRenderApp = fontsLoaded || !!fontError || Platform.OS !== 'ios';

  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      const [savedTrips, seenOnboarding, savedSessionIds, savedReadCounts] = await Promise.all([
        loadTrips(),
        loadHasSeenOnboarding(),
        loadOwnedMatchupSessionIds(),
        loadComparisonReadCounts(),
      ]);
      if (!isMounted) return;
      if (savedTrips) setTrips(savedTrips.map(normalizeTripDraft));
      setOwnedSessionIds(savedSessionIds);
      setComparisonReadCounts(savedReadCounts);
      setHasSeenOnboarding(seenOnboarding);
      setHasLoadedTrips(true);
    }
    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasLoadedTrips) {
      saveTrips(trips).catch(() => undefined);
    }
  }, [hasLoadedTrips, trips]);

  useEffect(() => {
    if (hasLoadedTrips) {
      saveOwnedMatchupSessionIds(ownedSessionIds).catch(() => undefined);
    }
  }, [hasLoadedTrips, ownedSessionIds]);

  useEffect(() => {
    if (hasLoadedTrips) {
      saveComparisonReadCounts(comparisonReadCounts).catch(() => undefined);
    }
  }, [comparisonReadCounts, hasLoadedTrips]);

  useEffect(() => {
    if (!hasLoadedTrips || !ownedSessionIds.length) {
      setOwnedSessions([]);
      return;
    }

    let isMounted = true;
    async function loadSessions(showLoading = false) {
      if (showLoading) setOwnedSessionsLoading(true);
      let sessions: Array<MatchupSession | undefined> = [];
      try {
        sessions = await Promise.all(ownedSessionIds.map((sessionId) => loadMatchupSession(sessionId)));
      } catch {
        sessions = [];
      }
      if (!isMounted) return;
      setOwnedSessions(sessions.filter(Boolean) as MatchupSession[]);
      setOwnedSessionsLoading(false);
    }

    loadSessions(true);
    const timer = setInterval(() => loadSessions(false), 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [hasLoadedTrips, ownedSessionIds]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const matchupId = getWebMatchupId();
    if (matchupId) setRoute({ name: 'sharedVoting', sessionId: matchupId });
  }, []);

  useEffect(() => {
    if (!hasLoadedTrips) return;
    const today = getTodayDateString();
    let changed = false;
    const cleanedTrips = trips.map((trip) => {
      if (trip.finalPlan && trip.planEndDate && trip.planEndDate < today) {
        changed = true;
        return { ...trip, finalPlan: false, planCompletedAt: today };
      }
      return trip;
    });
    if (changed) setTrips(cleanedTrips);
  }, [hasLoadedTrips, trips]);

  useEffect(() => {
    routeProgress.setValue(0);
    Animated.timing(routeProgress, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [route, routeProgress]);

  useEffect(() => {
    if (!momentumMessage) return undefined;
    const timer = setTimeout(() => setMomentumMessage(undefined), 3200);
    return () => clearTimeout(timer);
  }, [momentumMessage]);

  useEffect(() => {
    if (route.name !== 'sessionResults') return;
    const session = ownedSessions.find((item) => item.id === route.sessionId);
    if (!session) return;
    const inputCount = getSessionInputCount(session);
    setComparisonReadCounts((current) => {
      if ((current[session.id] ?? 0) >= inputCount) return current;
      return { ...current, [session.id]: inputCount };
    });
  }, [ownedSessions, route]);

  const selectedTrip = useMemo(() => {
    if (route.name !== 'detail' && route.name !== 'addIdea' && route.name !== 'editTrip' && route.name !== 'editIdea') return undefined;
    return trips.find((trip) => trip.id === route.tripId);
  }, [route, trips]);

  const selectedIdea = useMemo(() => {
    if (route.name !== 'editIdea') return undefined;
    return selectedTrip?.ideas.find((idea) => idea.id === route.ideaId);
  }, [route, selectedTrip]);

  const finalPlanTrip = useMemo(() => trips.find((trip) => trip.finalPlan) ?? undefined, [trips]);
  const pocketTrip = useMemo(() => {
    if (route.name === 'pocket' && route.tripId) return trips.find((trip) => trip.id === route.tripId);
    if (finalPlanTrip) return finalPlanTrip;
    return trips.length === 1 ? trips[0] : undefined;
  }, [finalPlanTrip, route, trips]);
  const canPreviewPocket = isPlus || __DEV__ || process.env.EXPO_PUBLIC_POCKET_DESIGN_PREVIEW === 'true';
  const hasReachedFreeTripLimit = !isPlus && trips.length >= FREE_TRIP_DRAFT_LIMIT;
  const hasReachedFreeComparisonLimit = !isPlus && ownedSessionIds.length >= FREE_SHARED_COMPARISON_LIMIT;

  const showUpgradeForLimit = (message: string) => {
    setMomentumMessage(message);
    showPlusUpgrade().catch(() => undefined);
  };

  const startNewTripDraft = (initialLink?: string) => {
    if (hasReachedFreeTripLimit) {
      showUpgradeForLimit('You have 3 trip ideas saved. Upgrade to keep every trip you start.');
      return;
    }
    const cleanInitialLink = typeof initialLink === 'string' ? initialLink : undefined;
    setPendingFirstLink(cleanInitialLink);
    setRoute({ name: 'newTrip' });
  };

  const upgradeForMoreComparisons = () => {
    showUpgradeForLimit('You have used your free friend comparison. Upgrade to keep asking for input.');
  };

  useEffect(() => {
    if (route.name !== 'sharedVoting') return;
    let isMounted = true;
    const sessionId = route.sessionId;

    async function loadSession() {
      setSharedSessionLoading(true);
      setSharedSessionMessage(undefined);
      let session: MatchupSession | undefined;
      try {
        session = await Promise.race([
          loadMatchupSession(sessionId),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 8000)),
        ]);
      } catch (error) {
        session = undefined;
      }
      if (!isMounted) return;
      setSharedSession(session);
      setSharedSessionLoading(false);
      if (!session) setSharedSessionMessage('This shared comparison link could not be found. Ask the trip owner to send a fresh link.');
    }

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [route]);

  const createTrip = (trip: TripDraft) => {
    if (hasReachedFreeTripLimit) {
      showUpgradeForLimit('You have 3 trip ideas saved. Upgrade to keep every trip you start.');
      return;
    }
    const normalizedTrip = normalizeTripDraft(trip);
    setTrips((current) => [normalizedTrip, ...current]);
    setMomentumMessage(pendingFirstLink ? 'Trip saved. Add the copied link next.' : 'Saved. Now add the first idea that made this trip feel possible.');
    if (pendingFirstLink) {
      setRoute({ name: 'addIdea', tripId: normalizedTrip.id, initialLink: pendingFirstLink });
      setPendingFirstLink(undefined);
      return;
    }
    setRoute({ name: 'detail', tripId: normalizedTrip.id });
  };

  const updateTrip = (trip: TripDraft) => {
    const normalizedTrip = normalizeTripDraft(trip);
    setTrips((current) => current.map((item) => (item.id === normalizedTrip.id ? normalizedTrip : item)));
    setRoute({ name: 'detail', tripId: normalizedTrip.id });
  };

  const confirmDeleteTrip = (trip: TripDraft) => {
    Alert.alert('Delete trip?', `${trip.title} and its saved ideas will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setTrips((current) => current.filter((item) => item.id !== trip.id));
          setRoute({ name: 'echo' });
        },
      },
    ]);
  };

  const addIdea = (tripId: string, idea: TripIdea) => {
    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? { ...trip, ideas: [idea, ...trip.ideas] } : trip)),
    );
    const targetTrip = trips.find((trip) => trip.id === tripId);
    if (targetTrip && targetTrip.ideas.length === 0) setMomentumMessage('Nice. This idea is taking shape.');
    setRoute({ name: 'detail', tripId });
  };

  const updateIdea = (tripId: string, idea: TripIdea) => {
    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? { ...trip, ideas: trip.ideas.map((item) => (item.id === idea.id ? idea : item)) } : trip)),
    );
    setRoute({ name: 'detail', tripId });
  };

  const confirmDeleteIdea = (tripId: string, idea: TripIdea) => {
    Alert.alert('Delete saved idea?', `${idea.title} will be removed from this trip.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setTrips((current) =>
            current.map((trip) => (trip.id === tripId ? { ...trip, ideas: trip.ideas.filter((item) => item.id !== idea.id) } : trip)),
          );
          setRoute({ name: 'detail', tripId });
        },
      },
    ]);
  };

  const moveTripToPlan = (tripId: string, result?: MatchupResultSummary) => {
    const tripTitle = trips.find((trip) => trip.id === tripId)?.title;
    setTrips((current) =>
      current.map((trip) => ({
        ...trip,
        finalPlan: trip.id === tripId,
        latestMatchupResult: trip.id === tripId && result ? result : trip.latestMatchupResult,
        planChecklist: trip.id === tripId ? trip.planChecklist ?? buildDefaultChecklist(trip) : trip.planChecklist,
      })),
    );
    if (tripTitle) setMomentumMessage(`Decision made. ${tripTitle} is your trip.`);
    setRoute({ name: 'lab', tripId });
  };

  const undoFinalPlan = (tripId: string) => {
    Alert.alert('Change committed trip?', 'This trip will go back to your trip ideas. Your checklist and dates will stay saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change Trip',
        onPress: () => {
          setTrips((current) => current.map((trip) => (trip.id === tripId ? { ...trip, finalPlan: false } : trip)));
          setRoute({ name: 'lab' });
        },
      },
    ]);
  };

  const updatePlanChecklist = (tripId: string, checklist: PlanChecklistItem[]) => {
    const previous = trips.find((trip) => trip.id === tripId)?.planChecklist ?? [];
    const previousDone = previous.filter((item) => item.done).length;
    const nextDone = checklist.filter((item) => item.done).length;
    setTrips((current) => current.map((trip) => (trip.id === tripId ? { ...trip, planChecklist: checklist } : trip)));
    if (previousDone === 0 && nextDone > 0) setMomentumMessage('Good. The plan has its first real step done.');
  };

  const updatePlanDates = (tripId: string, dates: { startDate?: string; endDate?: string }) => {
    const today = getTodayDateString();
    const hasEnded = Boolean(dates.endDate && dates.endDate < today);
    setTrips((current) =>
      current.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              planStartDate: dates.startDate,
              planEndDate: dates.endDate,
              planCompletedAt: hasEnded ? today : trip.planCompletedAt,
              finalPlan: hasEnded ? false : trip.finalPlan,
            }
          : trip,
      ),
    );
    if (hasEnded) setRoute({ name: 'lab' });
  };

  const addPocketItem = (tripId: string, item: PocketItem) => {
    const totalPocketItems = trips.reduce((count, trip) => count + (trip.pocketItems?.length ?? 0), 0) + 1;
    setTrips((current) =>
      current.map((trip) => {
        if (trip.id !== tripId) return trip;
        const pocketItems = [item, ...(trip.pocketItems ?? [])];
        return { ...trip, pocketItems };
      }),
    );
    setMomentumMessage('Saved to Pocket.');
    maybeRequestReviewAfterPocketSave(totalPocketItems).catch(() => undefined);
  };

  const updatePocketItem = (tripId: string, item: PocketItem) => {
    setTrips((current) =>
      current.map((trip) =>
        trip.id === tripId ? { ...trip, pocketItems: (trip.pocketItems ?? []).map((currentItem) => (currentItem.id === item.id ? item : currentItem)) } : trip,
      ),
    );
    setMomentumMessage('Pocket card updated.');
  };

  const deletePocketItem = (tripId: string, itemId: string) => {
    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? { ...trip, pocketItems: (trip.pocketItems ?? []).filter((item) => item.id !== itemId) } : trip)),
    );
  };

  const openFastAdd = (tripId?: string, initialLink?: string) => {
    const cleanTripId = typeof tripId === 'string' ? tripId : undefined;
    const cleanInitialLink = typeof initialLink === 'string' ? initialLink : undefined;
    if (cleanTripId) {
      setRoute({ name: 'addIdea', tripId: cleanTripId, initialLink: cleanInitialLink });
      return;
    }
    if (trips.length === 1) {
      setRoute({ name: 'addIdea', tripId: trips[0].id, initialLink: cleanInitialLink });
      return;
    }
    if (trips.length > 1) {
      setMomentumMessage(cleanInitialLink ? 'Choose the trip draft where this copied link belongs.' : 'Choose the trip draft where this saved link belongs.');
      setRoute({ name: 'echo' });
      return;
    }
    startNewTripDraft();
  };

  const rememberMatchupSession = async (sessionId: string) => {
    setOwnedSessionIds((current) => [sessionId, ...current.filter((item) => item !== sessionId)]);
    const session = await loadMatchupSession(sessionId);
    if (session) setOwnedSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
  };

  const refreshOwnedSessions = async () => {
    if (!ownedSessionIds.length) return;
    setOwnedSessionsLoading(true);
    try {
      const sessions = await Promise.all(ownedSessionIds.map((sessionId) => loadMatchupSession(sessionId)));
      setOwnedSessions(sessions.filter(Boolean) as MatchupSession[]);
    } catch {
      setMomentumMessage('Could not refresh shared reads. Check your connection and try again.');
    }
    setOwnedSessionsLoading(false);
  };

  const deleteOwnedSession = async (sessionId: string) => {
    setOwnedSessionIds((current) => current.filter((item) => item !== sessionId));
    setOwnedSessions((current) => current.filter((item) => item.id !== sessionId));
    setComparisonReadCounts((current) => {
      if (current[sessionId] === undefined) return current;
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
    deleteMatchupSession(sessionId).catch(() => undefined);
  };

  const markSessionRead = (sessionId: string) => {
    const session = ownedSessions.find((item) => item.id === sessionId);
    const inputCount = getSessionInputCount(session);
    setComparisonReadCounts((current) => {
      if ((current[sessionId] ?? 0) >= inputCount) return current;
      return { ...current, [sessionId]: inputCount };
    });
  };

  const openSessionResults = (sessionId: string) => {
    markSessionRead(sessionId);
    setRoute({ name: 'sessionResults', sessionId });
  };

  const submitSharedInput = async (sessionId: string, response: ComparisonResponse) => {
    const saved = await submitComparisonResponse(sessionId, response);
    if (!saved) return false;
    setSharedSession((current) =>
      current?.id === sessionId
        ? { ...current, responses: [response, ...(current.responses ?? []).filter((item) => item.browserId !== response.browserId)] }
        : current,
    );
    return true;
  };

  const deleteOwnedResponse = async (sessionId: string, responseId: string) => {
    setOwnedSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, responses: (session.responses ?? []).filter((response) => response.id !== responseId) } : session,
      ),
    );
    deleteComparisonResponse(sessionId, responseId).catch(() => refreshOwnedSessions());
  };

  const closeOwnedSession = async (sessionId: string) => {
    setOwnedSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, status: 'closed', updatedAt: new Date().toISOString() } : session,
      ),
    );
    closeMatchupSession(sessionId).catch(() => refreshOwnedSessions());
  };

  const renderRoute = () => {
    if (route.name === 'home') {
      return <HomeScreen trips={trips} onOpenTrip={(tripId) => setRoute({ name: 'detail', tripId })} onStartDraft={startNewTripDraft} onStartMatchup={() => setRoute({ name: 'createMatchup' })} onAddIdea={openFastAdd} onOpenPlan={() => setRoute({ name: 'lab' })} />;
    }

    if (route.name === 'echo') {
      return <EchoScreen trips={trips} onOpenTrip={(tripId) => setRoute({ name: 'detail', tripId })} onCreateTrip={startNewTripDraft} onCreateMatchup={() => setRoute({ name: 'createMatchup' })} />;
    }

    if (route.name === 'newTrip') {
      return <NewTripScreen onBack={() => { setPendingFirstLink(undefined); setRoute({ name: 'echo' }); }} onCreate={createTrip} />;
    }

    if (route.name === 'editTrip' && selectedTrip) {
      return <NewTripScreen initialTrip={selectedTrip} onBack={() => setRoute({ name: 'detail', tripId: selectedTrip.id })} onCreate={createTrip} onUpdate={updateTrip} onDelete={() => confirmDeleteTrip(selectedTrip)} />;
    }

    if (route.name === 'detail' && selectedTrip) {
      return <EchoDetailScreen trip={selectedTrip} onBack={() => setRoute({ name: 'echo' })} onAddIdea={() => setRoute({ name: 'addIdea', tripId: selectedTrip.id })} onEditTrip={() => setRoute({ name: 'editTrip', tripId: selectedTrip.id })} onDeleteTrip={() => confirmDeleteTrip(selectedTrip)} onEditIdea={(ideaId) => setRoute({ name: 'editIdea', tripId: selectedTrip.id, ideaId })} onDeleteIdea={(idea) => confirmDeleteIdea(selectedTrip.id, idea)} onCompare={() => setRoute({ name: 'createMatchup' })} onMoveToPlan={() => moveTripToPlan(selectedTrip.id)} />;
    }

    if (route.name === 'addIdea' && selectedTrip) {
      return <AddIdeaScreen trip={selectedTrip} initialLink={route.initialLink} onBack={() => setRoute({ name: 'detail', tripId: selectedTrip.id })} onSave={(idea) => addIdea(selectedTrip.id, idea)} />;
    }

    if (route.name === 'editIdea' && selectedTrip && selectedIdea) {
      return <AddIdeaScreen trip={selectedTrip} initialIdea={selectedIdea} onBack={() => setRoute({ name: 'detail', tripId: selectedTrip.id })} onSave={(idea) => updateIdea(selectedTrip.id, idea)} onDelete={() => confirmDeleteIdea(selectedTrip.id, selectedIdea)} />;
    }

    if (route.name === 'createMatchup') {
      return (
        <CreateMatchupScreen
          trips={trips}
          ownedSessions={ownedSessions}
          ownedSessionsLoading={ownedSessionsLoading}
          comparisonReadCounts={comparisonReadCounts}
          onBack={() => setRoute({ name: 'home' })}
          onStart={(tripIds, matchupName) => setRoute({ name: 'voting', tripIds, matchupName })}
          onSessionCreated={rememberMatchupSession}
          onRefreshSessions={refreshOwnedSessions}
          onOpenSessionResults={openSessionResults}
          onDeleteSession={deleteOwnedSession}
          canCreateSharedComparison={!hasReachedFreeComparisonLimit}
          onUpgradeRequired={upgradeForMoreComparisons}
        />
      );
    }

    if (route.name === 'voting') {
      return <VotingScreen trips={trips.filter((trip) => route.tripIds.includes(trip.id))} matchupName={route.matchupName} onCancel={() => setRoute({ name: 'createMatchup' })} onComplete={(votes) => setRoute({ name: 'results', tripIds: route.tripIds, votes, matchupName: route.matchupName })} />;
    }

    if (route.name === 'sharedVoting') {
      if (sharedSessionLoading) return <SharedVotingStatus title="Loading shared link" body="Opening the trip comparison..." />;
      if (sharedSessionMessage || !sharedSession) return <SharedVotingStatus title="Shared link unavailable" body={sharedSessionMessage ?? 'This comparison is not available right now.'} />;
      return (
        <SharedComparisonScreen session={sharedSession} onSubmit={(response) => submitSharedInput(sharedSession.id, response)} />
      );
    }

    if (route.name === 'results') {
      return <ResultsScreen trips={trips.filter((trip) => route.tripIds.includes(trip.id))} votes={route.votes} matchupName={route.matchupName} onRestart={() => setRoute({ name: 'createMatchup' })} onMoveToPlan={moveTripToPlan} />;
    }

    if (route.name === 'sessionResults') {
      const session = ownedSessions.find((item) => item.id === route.sessionId);
      if (!session) return <SharedVotingStatus title="Results not loaded" body="Refresh the voting inbox and try again." />;
      return (
        <ComparisonResultsScreen
          session={session}
          onBack={() => setRoute({ name: 'createMatchup' })}
          onDeleteResponse={(responseId) => deleteOwnedResponse(session.id, responseId)}
          onCloseComparison={() => closeOwnedSession(session.id)}
          onCommitTrip={moveTripToPlan}
        />
      );
    }

    if (route.name === 'lab') {
      const labTrip = trips.find((trip) => trip.id === route.tripId && trip.finalPlan) ?? finalPlanTrip;
      return <TripLabScreen trip={labTrip} trips={trips} isPlus={isPlus} onUpgradeRequired={() => showUpgradeForLimit('Upgrade to unlock the full Plan experience.')} onBack={() => setRoute({ name: 'home' })} onSelectTrip={(tripId) => moveTripToPlan(tripId)} onUndoFinalPlan={undoFinalPlan} onUpdateChecklist={updatePlanChecklist} onUpdateDates={updatePlanDates} />;
    }

    if (route.name === 'pocket') {
      return (
        <PocketScreen
          trip={pocketTrip}
          trips={trips}
          isPlus={canPreviewPocket}
          isDesignPreview={!isPlus && canPreviewPocket}
          quickCaptureRequest={route.quickCaptureRequest}
          onBack={() => setRoute({ name: 'home' })}
          onSelectTrip={(tripId) => setRoute({ name: 'pocket', tripId })}
          onCreateTrip={() => startNewTripDraft()}
          onUpgradeRequired={() => showUpgradeForLimit('Upgrade to unlock Pocket for flight, hotel, and booking screenshots.')}
          onAddItem={addPocketItem}
          onUpdateItem={updatePocketItem}
          onDeleteItem={deletePocketItem}
        />
      );
    }

    return null;
  };

  const finishOnboarding = (nextScreen: 'home' | 'newTrip' = 'home') => {
    setHasSeenOnboarding(true);
    if (nextScreen === 'newTrip') setRoute({ name: 'newTrip' });
    else setRoute({ name: 'home' });
    saveHasSeenOnboarding().catch(() => undefined);
  };

  if (!canRenderApp) {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.safeArea, { backgroundColor: theme.canvas }]}>
          <View style={styles.loadingState}>
            <Image source={require('./assets/brand/gowandr-logo-full-color.png')} style={styles.loadingLogo} resizeMode="contain" />
            <Text style={styles.loadingText}>Opening GoWandr...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (hasSeenOnboarding === false && route.name !== 'sharedVoting') {
    return (
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <OnboardingScreen onFinish={finishOnboarding} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  const isPublicSharedRoute = route.name === 'sharedVoting';
  const hidesBottomNav =
    route.name === 'newTrip' ||
    route.name === 'editTrip' ||
    route.name === 'addIdea' ||
    route.name === 'editIdea' ||
    route.name === 'voting' ||
    route.name === 'results';

  return (
    <SafeAreaProvider>
    <ThemeProvider value={theme}>
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.safeArea, { backgroundColor: theme.canvasDeep }]}>
      <ExpoStatusBar style="dark" />
      <View style={[styles.shell, { backgroundColor: theme.canvas }]}>
        <PremiumBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setRoute({ name: 'home' })} style={[styles.logoShell, { borderColor: 'rgba(255,255,255,0.78)' }]}>
            <Image source={require('./assets/brand/gowandr-logo-full-color.png')} style={styles.logo} resizeMode="contain" />
            <LogoShimmer />
          </TouchableOpacity>
          {!isPublicSharedRoute && (
            <SuperwallUpgradeButton source="app_header" style={styles.plusButton} disabledStyle={styles.plusButtonDisabled}>
              <Text style={styles.plusButtonText}>Plus</Text>
            </SuperwallUpgradeButton>
          )}
        </View>
        {!!momentumMessage && (
          <View style={styles.momentumBanner}>
            <Text style={styles.momentumBannerText}>{momentumMessage}</Text>
          </View>
        )}
        <ScrollView style={styles.content} contentContainerStyle={[styles.contentInner, isPublicSharedRoute && styles.publicContentInner]} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: routeProgress, transform: [{ translateY: routeProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          {renderRoute()}
          </Animated.View>
        </ScrollView>
        {!isPublicSharedRoute && !hidesBottomNav && (
          <View style={[styles.bottomNav, { backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.88)', borderColor: 'rgba(32,38,35,0.06)' }]}>
            <NavItem label="Home" active={isRouteName(route.name, ['home'])} onPress={() => setRoute({ name: 'home' })} />
            <NavItem label="Trips" active={isRouteName(route.name, ['echo', 'detail', 'addIdea', 'editIdea', 'newTrip', 'editTrip'])} onPress={() => setRoute({ name: 'echo' })} />
            <NavItem label="Compare" active={isRouteName(route.name, ['createMatchup', 'voting', 'sessionResults', 'results'])} onPress={() => setRoute({ name: 'createMatchup' })} />
            <NavItem label="Plan" active={isRouteName(route.name, ['lab'])} onPress={() => setRoute({ name: 'lab' })} />
            <NavItem label="Pocket" active={isRouteName(route.name, ['pocket'])} onPress={() => setRoute({ name: 'pocket' })} />
          </View>
        )}
        {route.name === 'pocket' && pocketTrip && (pocketTrip.pocketItems?.length ?? 0) > 0 && canPreviewPocket && (
          <TouchableOpacity
            onPress={() => setRoute({ name: 'pocket', tripId: pocketTrip.id, quickCaptureRequest: Date.now() })}
            style={styles.pocketFloatingCapture}
          >
            <Text style={styles.pocketFloatingCaptureText}>+ Add to Pocket</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}

function buildDefaultChecklist(trip: TripDraft): PlanChecklistItem[] {
  const base = [
    { title: 'Confirm dates', category: 'Logistics' },
    { title: 'Set budget range', category: 'Logistics' },
    { title: 'Book flights or transport', category: 'Logistics' },
    { title: 'Book stay', category: 'Reservations' },
    { title: 'Save anchor reservations', category: 'Reservations' },
    { title: 'Check passport / visa needs', category: 'Documents' },
    { title: 'Check health, shots, or travel advisories', category: 'Documents' },
    { title: 'Plan airport / arrival transport', category: 'Logistics' },
    { title: 'Pack essentials', category: 'Packing' },
    {
      title: trip.companionType === 'Solo' ? 'Share plan with a trusted person' : 'Share committed plan with the people going',
      category: trip.companionType === 'Solo' ? 'Safety share' : 'Group coordination',
    },
  ];

  return base.map((item, index) => ({ id: `check-${Date.now()}-${index}`, title: item.title, done: false, category: item.category }));
}

function normalizeTripDraft(trip: TripDraft): TripDraft {
  const fallbackHeroImage = starterPhotos[0]?.uri ?? '';

  return {
    ...trip,
    subtitle: trip.subtitle ?? '',
    heroImage: trip.heroImage || fallbackHeroImage,
    tags: Array.isArray(trip.tags) ? trip.tags : [],
    pace: trip.pace ?? 'Balanced',
    companionType: trip.companionType ?? 'Friends',
    ideas: Array.isArray(trip.ideas) ? trip.ideas : [],
    planChecklist: Array.isArray(trip.planChecklist) ? trip.planChecklist : [],
    pocketItems: Array.isArray(trip.pocketItems) ? trip.pocketItems : [],
  };
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWebMatchupId() {
  if (typeof window === 'undefined') return undefined;
  const routeMatch = window.location.pathname.match(/^\/c\/([^/?#]+)/);
  if (routeMatch?.[1]) return decodeURIComponent(routeMatch[1]);
  const params = new URLSearchParams(window.location.search);
  return params.get('matchup') ?? undefined;
}

function getSessionInputCount(session?: MatchupSession) {
  if (!session) return 0;
  return (session.responses?.length ?? 0) || (session.votes?.length ?? 0);
}

function SharedVotingStatus({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.sharedStatus}>
      <Text style={styles.sharedStatusTitle}>{title}</Text>
      <Text style={styles.sharedStatusBody}>{body}</Text>
    </View>
  );
}

function isRouteName(name: Route['name'], matches: Route['name'][]) {
  return matches.includes(name);
}

function NavItem({ label, active, onPress }: { label: Tab | string; active: boolean; onPress: () => void }) {
  const theme = useThemeColors();
  return (
    <PressableScale onPress={onPress} containerStyle={styles.navItemShell} style={[styles.navItem, active && styles.navItemActive]}>
      <Text style={[styles.navText, { color: active ? '#0F1115' : 'rgba(15,17,21,0.58)', fontFamily: font.semibold }]}>{label}</Text>
      <View style={[styles.navIndicator, { backgroundColor: active ? theme.teal : 'transparent' }]} />
    </PressableScale>
  );
}

function LogoShimmer() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return <Animated.View pointerEvents="none" style={[styles.logoShimmer, { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.01, 0.05] }) }]} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  shell: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 4, paddingBottom: 6 },
  logoShell: { borderRadius: 18, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, overflow: 'hidden', shadowColor: '#6ED8B5', shadowOpacity: 0.20, shadowRadius: 11, shadowOffset: { width: 0, height: 0 } },
  logo: { width: 108, height: 27 },
  logoShimmer: { position: 'absolute', top: 0, bottom: 0, width: 42, left: 28, backgroundColor: '#A8F0D4', transform: [{ skewX: '-18deg' }] },
  plusButton: { position: 'absolute', right: 28, minHeight: 34, minWidth: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 17, paddingHorizontal: 14, backgroundColor: '#202623', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  plusButtonDisabled: { opacity: 0.55 },
  plusButtonText: { ...androidTextReset, color: '#FFFFFF', fontFamily: font.semibold, fontWeight: '700', fontSize: 12.5, lineHeight: 16, letterSpacing: 0 },
  momentumBanner: { marginHorizontal: 28, marginBottom: 10, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: 'rgba(168,240,212,0.64)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)' },
  momentumBannerText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 13.5, lineHeight: 18, textAlign: 'center' },
  sharedStatus: { borderRadius: 26, padding: 22, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginTop: 24 },
  sharedStatusTitle: { color: '#202623', fontFamily: font.heading, fontWeight: '700', fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  sharedStatusBody: { color: 'rgba(32,38,35,0.66)', fontFamily: font.body, fontWeight: '400', fontSize: 15, lineHeight: 22, marginTop: 8 },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 220 : 210 },
  publicContentInner: { paddingBottom: 64 },
  bottomNav: { position: 'absolute', width: '92%', maxWidth: 430, alignSelf: 'center', bottom: Platform.OS === 'ios' ? 10 : 12, minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  navItemShell: { flex: 1, alignItems: 'center' },
  navItem: { width: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 3 },
  navItemActive: { backgroundColor: Platform.OS === 'android' ? '#CFF8E9' : 'rgba(168,240,212,0.54)' },
  navText: { ...androidTextReset, fontWeight: '600', fontSize: 12, lineHeight: 14, letterSpacing: 0, textAlign: 'center' },
  navIndicator: { width: 22, height: 4, borderRadius: 999, marginTop: 4 },
  pocketFloatingCapture: { position: 'absolute', right: 30, bottom: Platform.OS === 'ios' ? 82 : 86, minHeight: 48, borderRadius: 999, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#173A33', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  pocketFloatingCaptureText: { ...androidTextReset, color: '#FFFFFF', fontFamily: font.semibold, fontWeight: '800', fontSize: 13.5 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingLogo: { width: 150, height: 38 },
  loadingText: { marginTop: 14, color: '#137D68', fontSize: 14, fontWeight: '600' },
});
