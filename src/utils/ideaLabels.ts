import { TripIdea } from '../types';

export function getSourceName(link?: string) {
  const value = link?.toLowerCase().trim() ?? '';
  if (!value) return 'Note';
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
  if (value.includes('tiktok.com')) return 'TikTok';
  if (value.includes('instagram.com')) return 'Instagram';
  return getDomainName(link) ?? 'Website';
}

export function buildUnlabeledIdeaTitle(link: string, existingIdeas: TripIdea[]) {
  const source = getSourceName(link);
  const matchingCount = existingIdeas.filter((idea) => getSourceName(idea.link) === source && idea.needsLabel).length;
  const suffix = matchingCount ? ` ${matchingCount + 1}` : '';
  return `Unlabeled ${source} link${suffix}`;
}

export function isUnlabeledIdea(idea: TripIdea) {
  return Boolean(idea.needsLabel);
}

function getDomainName(link?: string) {
  if (!link?.trim()) return undefined;

  try {
    const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    const host = new URL(normalized).hostname.replace(/^www\./, '');
    const firstPart = host.split('.')[0];
    if (!firstPart) return undefined;
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  } catch {
    return undefined;
  }
}
