export type IdeaCategory = 'Food' | 'Stay' | 'Beach' | 'Nightlife' | 'Culture' | 'Adventure' | 'Shopping' | 'Photo Spot' | 'Relax' | 'Other';

export type IdeaPriority = 'Must-do' | 'Maybe' | 'Skip';

export type TripIdea = {
  id: string;
  title: string;
  note?: string;
  link?: string;
  needsLabel?: boolean;
  category: IdeaCategory;
  tags: string[];
  priority: IdeaPriority;
  imageUrl?: string;
};

export type MatchupResultSummary = {
  matchupName: string;
  groupMatch: number;
  summary: string;
  decidedAt: string;
};

export type PlanChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  category?: string;
};

export type PocketItemType = 'flight' | 'stay' | 'ticket' | 'reservation' | 'transport' | 'document' | 'note' | 'other';

export type PocketItem = {
  id: string;
  type: PocketItemType;
  title: string;
  date?: string;
  endDate?: string;
  time?: string;
  airline?: string;
  from?: string;
  to?: string;
  place?: string;
  city?: string;
  confirmation?: string;
  link?: string;
  note?: string;
  screenshotUri?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type TripDraft = {
  id: string;
  title: string;
  subtitle: string;
  heroImage: string;
  tags: string[];
  pace: 'Relaxed' | 'Balanced' | 'Packed';
  companionType: 'Solo' | 'Couple' | 'Friends' | 'Family' | 'Group';
  ideas: TripIdea[];
  finalPlan?: boolean;
  planStartDate?: string;
  planEndDate?: string;
  planCompletedAt?: string;
  latestMatchupResult?: MatchupResultSummary;
  planChecklist?: PlanChecklistItem[];
  pocketItems?: PocketItem[];
};

export type VotePrompt = 'exciting' | 'easy' | 'mood' | 'commit' | 'memorable' | 'groupFit' | 'regret';

export type VoteAnswer = {
  prompt: VotePrompt;
  tripId: string;
  reaction?: string;
  dealbreaker?: string;
  commitment: number;
  reason?: string;
  voterName?: string;
};

export type ComparisonStatus = 'open' | 'closed';

export type ComparisonHighlight = {
  id: string;
  title: string;
  note?: string;
  link?: string;
  category: IdeaCategory;
  priority: IdeaPriority;
};

export type ComparisonTrip = {
  id: string;
  title: string;
  subtitle: string;
  coverImageUrl?: string;
  mood: string;
  pace: TripDraft['pace'];
  companionType: TripDraft['companionType'];
  highlights: ComparisonHighlight[];
};

export type ComparisonResponse = {
  id: string;
  voterName: string;
  selectedTripId: string;
  reason?: string;
  concernChips: string[];
  likedHighlightIds: string[];
  createdAt: string;
  updatedAt?: string;
  browserId: string;
};

export type MatchupSession = {
  id: string;
  matchupName: string;
  trips: TripDraft[];
  comparisonTrips?: ComparisonTrip[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  status?: ComparisonStatus;
  ownerDeviceId?: string;
  votes: VoteAnswer[][];
  responses?: ComparisonResponse[];
};
