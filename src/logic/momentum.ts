import { calculateClarityScore } from './clarityScore';
import { PlanChecklistItem, TripDraft } from '../types';

export type MomentumStatus = 'Just started' | 'Taking shape' | 'Ready to compare' | 'Strong option' | 'Committed' | 'Preparing' | 'Ready to book' | 'Past trip';

export type NextBestStep = {
  title: string;
  reason: string;
  effort: string;
  cta: string;
  intent: 'addIdea' | 'addMore' | 'brief' | 'compare' | 'commit' | 'dates' | 'checklist' | 'share' | 'past';
};

export type MomentumStage = 'Idea' | 'Brief' | 'Compared' | 'Committed' | 'Preparing';

export function getMomentumStatus(trip: TripDraft): MomentumStatus {
  if (trip.planCompletedAt) return 'Past trip';
  if (trip.finalPlan && hasEssentialPrepDone(trip.planChecklist)) return 'Ready to book';
  if (trip.finalPlan) return 'Preparing';
  if (trip.latestMatchupResult) return 'Strong option';
  if (trip.ideas.length >= 3 && hasTripBrief(trip)) return 'Ready to compare';
  if (trip.ideas.length >= 2) return 'Taking shape';
  return 'Just started';
}

export function getNextBestStep(trip: TripDraft): NextBestStep {
  const checklist = trip.planChecklist ?? [];
  const firstOpenTask = checklist.find((item) => !item.done);

  if (trip.planCompletedAt) {
    return {
      title: 'Archive or recap this trip',
      reason: 'The dates have passed, so this can stay saved without sitting in your active plan.',
      effort: '2 minutes',
      cta: 'Review trip',
      intent: 'past',
    };
  }

  if (!trip.ideas.length) {
    return {
      title: 'Add the links that made this trip feel possible.',
      reason: 'Paste a TikTok, Instagram, YouTube, or blog link into this draft.',
      effort: '2 minutes',
      cta: 'Add links',
      intent: 'addIdea',
    };
  }

  if (trip.ideas.length <= 2) {
    return {
      title: 'Add a few more links or ideas',
      reason: 'A couple more saves will make this easier to compare with your other options.',
      effort: '5 minutes',
      cta: 'Add more',
      intent: 'addMore',
    };
  }

  if (!hasTripBrief(trip)) {
    return {
      title: 'Shape this into a trip brief',
      reason: 'A clear mood, pace, and audience turns scattered saves into a real option.',
      effort: '4 minutes',
      cta: 'Shape brief',
      intent: 'brief',
    };
  }

  if (!trip.latestMatchupResult && !trip.finalPlan) {
    return {
      title: 'Compare this trip',
      reason: 'See whether this is the option that feels most worth planning.',
      effort: 'Under a minute',
      cta: 'Compare',
      intent: 'compare',
    };
  }

  if (trip.latestMatchupResult && !trip.finalPlan) {
    return {
      title: 'Commit to this trip',
      reason: 'The decision is close. Move it into Plan when it is the one you want to make real.',
      effort: '1 minute',
      cta: 'Commit',
      intent: 'commit',
    };
  }

  if (trip.finalPlan && (!trip.planStartDate || !trip.planEndDate)) {
    return {
      title: 'Choose travel dates',
      reason: 'Dates make the trip easier to plan, share, and protect.',
      effort: '5 minutes',
      cta: 'Start',
      intent: 'dates',
    };
  }

  if (trip.finalPlan && checklist.length && !checklist.some((item) => item.done)) {
    return {
      title: 'Start your prep checklist',
      reason: 'One practical task gives this trip momentum without turning it into work.',
      effort: '10 minutes',
      cta: 'Start',
      intent: 'checklist',
    };
  }

  if (trip.finalPlan && firstOpenTask) {
    return {
      title: firstOpenTask.title,
      reason: 'Finish the next small thing so the plan keeps moving.',
      effort: '10 minutes',
      cta: 'Mark done',
      intent: 'checklist',
    };
  }

  return {
    title: 'Share your plan',
    reason: trip.companionType === 'Solo' ? 'Send the essentials to someone you trust.' : 'Give everyone the same simple version of the plan.',
    effort: '2 minutes',
    cta: 'Share',
    intent: 'share',
  };
}

export function getMomentumStages(trip: TripDraft): { label: MomentumStage; complete: boolean; current: boolean }[] {
  const compared = Boolean(trip.latestMatchupResult || trip.finalPlan);
  const committed = Boolean(trip.finalPlan || trip.planCompletedAt);
  const preparing = Boolean(trip.finalPlan && ((trip.planChecklist?.some((item) => item.done) ?? false) || trip.planStartDate || trip.planEndDate));
  const stages: { label: MomentumStage; complete: boolean }[] = [
    { label: 'Idea', complete: trip.ideas.length > 0 },
    { label: 'Brief', complete: hasTripBrief(trip) },
    { label: 'Compared', complete: compared },
    { label: 'Committed', complete: committed },
    { label: 'Preparing', complete: preparing },
  ];
  const currentIndex = stages.findIndex((stage) => !stage.complete);
  const activeIndex = currentIndex === -1 ? stages.length - 1 : currentIndex;
  return stages.map((stage, index) => ({ ...stage, current: index === activeIndex }));
}

export function getMomentumCard(trips: TripDraft[]) {
  const activeTrip = chooseActiveTrip(trips);
  if (!activeTrip) {
    return {
      trip: undefined,
      eyebrow: 'Momentum',
      title: 'Start a trip draft for the links you keep saving.',
      body: 'Paste favorite TikTok, Instagram, YouTube, or blog links as you find them.',
      cta: 'Start a Trip Draft',
      intent: 'newTrip' as const,
    };
  }

  const status = getMomentumStatus(activeTrip);
  const next = getNextBestStep(activeTrip);
  return {
    trip: activeTrip,
    eyebrow: status,
    title: getMomentumCardTitle(activeTrip, status, next),
    body: status === 'Just started' ? next.reason : next.title,
    cta: next.cta,
    intent: next.intent,
  };
}

function chooseActiveTrip(trips: TripDraft[]) {
  const finalPlan = trips.find((trip) => trip.finalPlan);
  if (finalPlan) return finalPlan;
  const compared = trips.find((trip) => trip.latestMatchupResult);
  if (compared) return compared;
  return [...trips].sort((left, right) => {
    const leftScore = calculateClarityScore(left).score + left.ideas.length * 4;
    const rightScore = calculateClarityScore(right).score + right.ideas.length * 4;
    return rightScore - leftScore;
  })[0];
}

function getMomentumCardTitle(trip: TripDraft, status: MomentumStatus, next: NextBestStep) {
  if (status === 'Preparing') return `You committed to ${trip.title}. Now let's make it real.`;
  if (status === 'Ready to book') return `${trip.title} has the essentials in place.`;
  if (status === 'Strong option') return `${trip.title} is your strongest option. Ready to commit?`;
  if (status === 'Ready to compare') return `${trip.title} has ${trip.ideas.length} saved ideas. Ready to compare it?`;
  if (status === 'Taking shape') return `Nice. ${trip.title} is taking shape.`;
  if (status === 'Past trip') return `${trip.title} is saved as a past trip.`;
  return next.title;
}

function hasTripBrief(trip: TripDraft) {
  return trip.title.trim().length > 2 && trip.subtitle.trim().length > 8 && trip.tags.length >= 2 && Boolean(trip.pace && trip.companionType);
}

function hasEssentialPrepDone(checklist?: PlanChecklistItem[]) {
  if (!checklist?.length) return false;
  const doneCount = checklist.filter((item) => item.done).length;
  return doneCount >= Math.min(5, checklist.length);
}
