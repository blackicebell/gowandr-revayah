import { ComparisonTrip, TripDraft } from '../types';

const PUBLIC_COVER_IMAGES = {
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
  city: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1400&q=80',
  food: 'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=1400&q=80',
  island: 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=1400&q=80',
  outdoors: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  nightOut: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=80',
};

export function getPublicCoverImageUrlForTrip(trip: TripDraft) {
  if (isPublicImageUrl(trip.heroImage)) return trip.heroImage;

  return getPublicCoverFromText(
    `${trip.title} ${trip.subtitle} ${trip.tags.join(' ')} ${trip.pace} ${trip.companionType} ${trip.ideas
      .map((idea) => `${idea.title} ${idea.category} ${idea.note ?? ''}`)
      .join(' ')}`,
  );
}

export function getPublicCoverImageUrlForComparison(trip: Pick<ComparisonTrip, 'title' | 'subtitle' | 'mood' | 'pace' | 'coverImageUrl' | 'highlights'>) {
  if (trip.coverImageUrl && isPublicImageUrl(trip.coverImageUrl)) return trip.coverImageUrl;

  return getPublicCoverFromText(
    `${trip.title} ${trip.subtitle} ${trip.mood} ${trip.pace} ${trip.highlights.map((highlight) => `${highlight.title} ${highlight.category} ${highlight.note ?? ''}`).join(' ')}`,
  );
}

function isPublicImageUrl(value?: string) {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  return !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value);
}

function getPublicCoverFromText(rawText: string) {
  const text = rawText.toLowerCase();

  if (/night|club|party|birthday|celebration|music|jazz|bar/.test(text)) return PUBLIC_COVER_IMAGES.nightOut;
  if (/food|restaurant|dinner|brunch|breakfast|lunch|taco|market|coffee|wine/.test(text)) return PUBLIC_COVER_IMAGES.food;
  if (/city|urban|downtown|rooftop|mexico|miami|new orleans|paris|istanbul|accra|abuja|amsterdam/.test(text)) return PUBLIC_COVER_IMAGES.city;
  if (/mountain|outdoor|hike|adventure|nature|boat|lake/.test(text)) return PUBLIC_COVER_IMAGES.outdoors;
  if (/island|jamaica|reset|slow|romantic|resort|relax/.test(text)) return PUBLIC_COVER_IMAGES.island;
  return PUBLIC_COVER_IMAGES.beach;
}
