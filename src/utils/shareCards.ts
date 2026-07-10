import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { MatchupResult } from '../logic/matchupScore';
import { TripDraft, TripIdea } from '../types';

function topIdeaLines(ideas: TripIdea[], fallback = 'Save a few must-dos first.') {
  const topIdeas = ideas.filter((idea) => idea.priority === 'Must-do').slice(0, 3);
  if (!topIdeas.length) return fallback;
  return topIdeas.map((idea, index) => `${index + 1}. ${idea.title}`).join('\n');
}

export function shareTripCard(trip: TripDraft, photoUri?: string, prompt = 'Would you make this the move?') {
  return Share.share({
    url: photoUri ?? trip.heroImage,
    message: `${prompt}\n\nI'm shaping this GoWandr trip: ${trip.title}\n\n${trip.subtitle}\n\nTop highlights:\n${topIdeaLines(trip.ideas, 'Save a few highlights first.')}`,
  }).catch(() => undefined);
}

export async function shareImageFile(uri: string, title = 'Share GoWandr card') {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        dialogTitle: title,
        mimeType: 'image/png',
        UTI: 'public.png',
      });
      return;
    }
    await Share.share({ url: uri });
  } catch {
    // Sharing is best-effort because target apps differ in how they accept images.
  }
}

export function shareTripPlan(trip: TripDraft, pace: TripDraft['pace'], topIdeas: TripIdea[]) {
  return Share.share({
    message: `${trip.title} plan\nPace: ${pace}\n\nTop highlights:\n${topIdeaLines(topIdeas, 'Choose one anchor to start.')}\n\nMade with GoWandr.`,
  }).catch(() => undefined);
}

export function shareMatchupInvite(matchupName: string, trips: TripDraft[], shareUrl?: string) {
  const tripList = trips.map((trip, index) => `${index + 1}. ${trip.title}`).join('\n');
  return Share.share({
    url: shareUrl,
    message: shareUrl
      ? `Help me get a read on these GoWandr trip ideas for ${matchupName}.\n\n${tripList}\n\nOpen the link, skim the highlights, and share which trip pulls you most:\n${shareUrl}\n\nNo login needed.`
      : `Help me get a read on these GoWandr trip ideas for ${matchupName}.\n\n${tripList}\n\nReply with the trip that pulls you most, why it feels right, and any concern. No login needed.`,
  }).catch(() => undefined);
}

export function shareMatchupResult(matchupName: string, winner: MatchupResult, groupMatch: number, explanation: string) {
  return Share.share({
    url: winner.trip.heroImage,
    message: `GoWandr decision for ${matchupName}:\n\nWe're leaning toward ${winner.trip.title}.\n${groupMatch}% decision confidence\n\n${explanation}\n\nNext step: prepare the trip plan.`,
  }).catch(() => undefined);
}
