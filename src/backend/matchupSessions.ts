import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from '@firebase/firestore';
import { getFirebaseRuntime, hasFirebaseConfig } from './firebase';
import { ComparisonResponse, ComparisonTrip, MatchupSession, TripDraft, VoteAnswer } from '../types';
import { getOwnerDeviceId } from '../storage/identityStorage';
import { getPublicCoverImageUrlForTrip } from '../utils/publicCoverImages';

const MATCHUP_SESSIONS_COLLECTION = 'comparisons';

export function isSharedVotingConfigured() {
  return hasFirebaseConfig();
}

export function buildMatchupShareUrl(sessionId: string) {
  const runtimeOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
  const baseUrl = runtimeOrigin || 'https://gowandr2.web.app';
  return `${baseUrl.replace(/\/$/, '')}/c/${encodeURIComponent(sessionId)}`;
}

export async function createMatchupSession(matchupName: string, trips: TripDraft[]) {
  const runtime = getFirebaseRuntime();
  if (!runtime) return undefined;

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const ownerDeviceId = await getOwnerDeviceId();
  const payload = {
    matchupName,
    trips: trips.map(toComparisonTrip),
    createdAt: now,
    updatedAt: now,
    expiresAt,
    status: 'open',
    ownerId: ownerDeviceId,
    ownerDeviceId,
    createdAtServer: serverTimestamp(),
    votes: [],
  };
  const sessionRef = await addDoc(collection(runtime.db, MATCHUP_SESSIONS_COLLECTION), payload);
  return sessionRef.id;
}

export async function loadMatchupSession(sessionId: string): Promise<MatchupSession | undefined> {
  const runtime = getFirebaseRuntime();
  if (!runtime) return undefined;

  const snapshot = await getDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId));
  if (!snapshot.exists()) return undefined;
  const data = snapshot.data() as Omit<MatchupSession, 'id'> & { trips: ComparisonTrip[]; ownerId?: string };
  const responsesSnapshot = await getDocs(collection(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId, 'responses'));
  const responses = responsesSnapshot.docs.map((responseDoc) => {
    const response = responseDoc.data() as Omit<ComparisonResponse, 'id'>;
    return { ...response, id: responseDoc.id };
  });
  const comparisonTrips = data.trips ?? [];
  return {
    id: snapshot.id,
    matchupName: data.matchupName,
    trips: comparisonTrips.map(toTripDraft),
    comparisonTrips,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    expiresAt: data.expiresAt,
    status: data.status ?? 'open',
    ownerDeviceId: data.ownerDeviceId ?? data.ownerId,
    votes: data.votes ?? [],
    responses,
  };
}

export async function submitMatchupVotes(sessionId: string, votes: VoteAnswer[]) {
  const runtime = getFirebaseRuntime();
  if (!runtime) return false;

  await updateDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId), {
    votes: arrayUnion(votes),
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function submitComparisonResponse(sessionId: string, response: ComparisonResponse) {
  const runtime = getFirebaseRuntime();
  if (!runtime) return false;

  await setDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId, 'responses', response.browserId), {
    ...response,
    id: response.browserId,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId), {
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function deleteComparisonResponse(sessionId: string, responseId: string) {
  const runtime = getFirebaseRuntime();
  if (!runtime) return false;

  await deleteDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId, 'responses', responseId));
  await updateDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId), {
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function closeMatchupSession(sessionId: string) {
  const runtime = getFirebaseRuntime();
  if (!runtime) return false;

  await updateDoc(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId), {
    status: 'closed',
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function deleteMatchupSession(sessionId: string) {
  const runtime = getFirebaseRuntime();
  if (!runtime) return false;

  const responseDocs = await getDocs(collection(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId, 'responses'));
  const batch = writeBatch(runtime.db);
  responseDocs.docs.forEach((responseDoc) => batch.delete(responseDoc.ref));
  batch.delete(doc(runtime.db, MATCHUP_SESSIONS_COLLECTION, sessionId));
  await batch.commit();
  return true;
}

function toComparisonTrip(trip: TripDraft): ComparisonTrip {
  const highlights = trip.ideas
    .filter((idea) => idea.priority !== 'Skip')
    .slice(0, 5)
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
      note: idea.note,
      link: idea.link,
      category: idea.category,
      priority: idea.priority,
    }));

  return removeUndefinedDeep({
    id: trip.id,
    title: trip.title,
    subtitle: trip.subtitle,
    coverImageUrl: getPublicCoverImageUrlForTrip(trip),
    mood: trip.tags[0] ?? 'Travel',
    pace: trip.pace,
    companionType: trip.companionType,
    highlights,
  }) as ComparisonTrip;
}

function toTripDraft(trip: ComparisonTrip): TripDraft {
  return {
    id: trip.id,
    title: trip.title,
    subtitle: trip.subtitle,
    heroImage: trip.coverImageUrl ?? '',
    tags: [trip.mood],
    pace: trip.pace,
    companionType: trip.companionType,
    ideas: trip.highlights.map((highlight) => ({
      id: highlight.id,
      title: highlight.title,
      note: highlight.note,
      link: highlight.link,
      category: highlight.category,
      priority: highlight.priority,
      tags: [],
    })),
  };
}

function removeUndefinedDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedDeep);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)]),
    );
  }

  return value;
}
