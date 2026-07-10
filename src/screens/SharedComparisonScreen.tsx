import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Linking, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SourceThumbnail, getSourceLabel } from '../components/SourceThumbnail';
import { getComparisonBrowserId } from '../storage/identityStorage';
import { androidTextReset, colors, font } from '../theme/colors';
import { ComparisonResponse, MatchupSession } from '../types';
import { getPublicCoverImageUrlForComparison } from '../utils/publicCoverImages';

const concernChips = ['Too expensive', 'Hard to coordinate', 'Flights may be annoying', 'Not my vibe', 'Dates may be tricky', 'Too packed', 'Too slow'];

export function SharedComparisonScreen({
  session,
  onSubmit,
}: {
  session: MatchupSession;
  onSubmit: (response: ComparisonResponse) => Promise<boolean>;
}) {
  const [browserId, setBrowserId] = useState<string | undefined>();
  const [voterName, setVoterName] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [likedHighlightIds, setLikedHighlightIds] = useState<string[]>([]);
  const [failedCoverIds, setFailedCoverIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const trips = session.comparisonTrips ?? [];
  const existingResponse = useMemo(() => session.responses?.find((response) => response.browserId === browserId), [browserId, session.responses]);
  const closedReason = getClosedReason(session);

  useEffect(() => {
    getComparisonBrowserId().then(setBrowserId).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!existingResponse) return;
    setVoterName(existingResponse.voterName);
    setSelectedTripId(existingResponse.selectedTripId);
    setReason(existingResponse.reason ?? '');
    setConcerns(existingResponse.concernChips ?? []);
    setLikedHighlightIds(existingResponse.likedHighlightIds ?? []);
  }, [existingResponse]);

  const toggleConcern = (chip: string) => {
    setConcerns((current) => (current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]));
  };

  const toggleHighlight = (highlightId: string) => {
    setLikedHighlightIds((current) => (current.includes(highlightId) ? current.filter((item) => item !== highlightId) : [...current, highlightId]));
  };

  const markCoverFailed = (tripId: string) => {
    setFailedCoverIds((current) => (current.includes(tripId) ? current : [...current, tripId]));
  };

  const submit = async () => {
    if (!browserId) return;
    if (!voterName.trim()) {
      setError('Add your name or nickname so the trip owner knows who responded.');
      return;
    }
    if (!selectedTripId) {
      setError('Choose the trip that pulls you most.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    const now = new Date().toISOString();
    const saved = await onSubmit({
      id: browserId,
      browserId,
      voterName: voterName.trim(),
      selectedTripId,
      reason: reason.trim(),
      concernChips: concerns,
      likedHighlightIds,
      createdAt: existingResponse?.createdAt ?? now,
      updatedAt: now,
    });
    setSubmitting(false);
    if (!saved) {
      setError('Your input could not be saved. Check your connection and try again.');
      return;
    }
    setSubmitted(true);
  };

  if (closedReason) {
    return (
      <View style={styles.closedCard}>
        <Text style={styles.kicker}>Get a read</Text>
        <Text style={styles.title}>This comparison is closed.</Text>
        <Text style={styles.body}>{closedReason}</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.closedCard}>
        <Text style={styles.kicker}>Thanks</Text>
        <Text style={styles.title}>Your input was added.</Text>
        <Text style={styles.body}>The trip owner will see which option has the strongest momentum.</Text>
        <Button label="Edit your input" variant="secondary" onPress={() => setSubmitted(false)} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.kicker}>Get a read</Text>
      <Text style={styles.title}>Your friend wants your input.</Text>
      <Text style={styles.body}>Review the highlights, then pick the trip that pulls you most. No login needed.</Text>

      <TextInput value={voterName} onChangeText={setVoterName} placeholder="Name or nickname" placeholderTextColor="rgba(32,38,35,0.48)" style={styles.input} />

      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>Review the highlights first.</Text>
        <Text style={styles.guideBody}>Favorite anything that stands out. Then choose the trip you would actually take.</Text>
      </View>

      <View style={styles.tripList}>
        {trips.map((trip, tripIndex) => {
          const coverImageUrl = failedCoverIds.includes(trip.id) ? getPublicCoverImageUrlForComparison({ ...trip, coverImageUrl: undefined }) : getPublicCoverImageUrlForComparison(trip);
          const isSelectedTrip = selectedTripId === trip.id;

          return (
          <View key={trip.id} style={[styles.tripCard, isSelectedTrip && styles.tripCardSelected]}>
            <TouchableOpacity onPress={() => setSelectedTripId(trip.id)} activeOpacity={0.86}>
              <ImageBackground source={{ uri: coverImageUrl }} onError={() => markCoverFailed(trip.id)} style={[styles.hero, isSelectedTrip && styles.heroSelected]} imageStyle={styles.heroImage}>
                <View style={styles.shade} />
                {isSelectedTrip && (
                  <View style={styles.selectedPill}>
                    <Text style={styles.selectedPillText}>Selected</Text>
                  </View>
                )}
                <View style={styles.heroCopy}>
                  <Text style={styles.tripMeta}>{trip.mood} / {trip.pace}</Text>
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                  <Text numberOfLines={2} style={styles.tripSubtitle}>{trip.subtitle}</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
            <View style={styles.stepBlock}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Review the highlights.</Text>
                <Text style={styles.stepHint}>{tripIndex === 0 ? "Tap the heart on moments you'd actually do." : "Favorite anything that feels worth doing."}</Text>
              </View>
            </View>
            <View style={styles.highlightGrid}>
              {trip.highlights.map((highlight) => {
                const isLiked = likedHighlightIds.includes(highlight.id);
                return (
                  <Pressable
                    key={highlight.id}
                    onPress={() => toggleHighlight(highlight.id)}
                    style={({ pressed }) => [styles.highlightCard, isLiked && styles.highlightCardLiked, pressed && styles.highlightCardPressed]}
                  >
                    <View style={[styles.heartBadge, isLiked && styles.heartBadgeLiked]}>
                      <Text style={[styles.heartText, isLiked && styles.heartTextLiked]}>{isLiked ? '♥' : '♡'}</Text>
                    </View>
                    <SourceThumbnail link={highlight.link} priority={highlight.priority} />
                    <Text numberOfLines={2} style={styles.highlightTitle}>{highlight.title}</Text>
                    {!!highlight.note && <Text numberOfLines={2} style={styles.highlightNote}>{highlight.note}</Text>}
                    <Text numberOfLines={1} style={[styles.highlightSource, !highlight.link && styles.highlightSourceMuted]} onPress={() => openLink(highlight.link)}>
                      {highlight.link ? `Open ${getSourceLabel(highlight.link)}` : highlight.category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.favoriteWhy}>Favorite the moments you'd actually do. We'll show your friend which ideas stood out most.</Text>
            <View style={styles.stepBlock}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Choose this trip if it feels stronger.</Text>
              </View>
            </View>
            <Pressable onPress={() => setSelectedTripId(trip.id)} style={({ pressed }) => [styles.choiceCard, isSelectedTrip && styles.choiceCardSelected, pressed && styles.choiceCardPressed]}>
              <View style={[styles.radioOuter, isSelectedTrip && styles.radioOuterSelected]}>
                {isSelectedTrip && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.choiceText, isSelectedTrip && styles.choiceTextSelected]}>I'd choose {trip.title}</Text>
            </Pressable>
          </View>
        );
        })}
      </View>

      {selectedTripId && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Why this one?</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="Optional reason, like best food, easiest plan, better vibe..." placeholderTextColor="rgba(32,38,35,0.48)" style={styles.reasonInput} multiline />
          <Text style={styles.formTitle}>Any concern?</Text>
          <Text style={styles.formHint}>Optional. Choose anything that could block the trip.</Text>
          <View style={styles.chipWrap}>
            {concernChips.map((chip) => (
              <Chip key={chip} label={chip} active={concerns.includes(chip)} onPress={() => toggleConcern(chip)} />
            ))}
          </View>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Button label={submitting ? 'Saving...' : existingResponse ? 'Update Input' : 'Share Input'} disabled={submitting || !selectedTripId} onPress={submit} />
      </View>
    </View>
  );
}

function getClosedReason(session: MatchupSession) {
  if (session.status === 'closed') return 'The trip owner has already closed this link.';
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) return 'This shared link expired after 7 days.';
  return undefined;
}

function openLink(link?: string) {
  if (!link) return;
  const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  Linking.openURL(normalized).catch(() => undefined);
}

const styles = StyleSheet.create({
  kicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, marginTop: 8 },
  title: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 34, lineHeight: 40, letterSpacing: -0.4, marginTop: 6 },
  body: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 18 },
  input: { minHeight: 52, borderRadius: 18, paddingHorizontal: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', color: colors.charcoal, fontFamily: font.body, fontSize: 15, marginBottom: 16 },
  guideCard: { borderRadius: 22, padding: 16, backgroundColor: Platform.OS === 'android' ? '#EAFBF5' : 'rgba(221,249,239,0.74)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)', marginBottom: 16 },
  guideTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  guideBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 5 },
  tripList: { gap: 22 },
  tripCard: { borderRadius: 28, padding: 14, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  tripCardSelected: { borderColor: '#2FAF8A', shadowColor: '#2FAF8A', shadowOpacity: 0.18, elevation: 5 },
  hero: { minHeight: 184, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 22 },
  heroSelected: { borderWidth: 2, borderColor: '#6ED8B5' },
  heroImage: { borderRadius: 22 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  selectedPill: { position: 'absolute', top: 12, right: 12, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: '#A8F0D4' },
  selectedPillText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 11 },
  heroCopy: { padding: 16 },
  tripMeta: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tripTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 26, lineHeight: 31, marginTop: 4 },
  tripSubtitle: { ...androidTextReset, color: 'rgba(255,255,255,0.88)', fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  stepBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15, marginBottom: 10 },
  stepNumber: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF9EF', borderWidth: 1, borderColor: 'rgba(47,175,138,0.24)' },
  stepNumberText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  stepCopy: { flex: 1 },
  stepTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 15.5, lineHeight: 20 },
  stepHint: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  highlightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4, marginBottom: 12 },
  highlightCard: { width: '31%', minHeight: 166, borderRadius: 18, overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  highlightCardLiked: { backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.35)', borderColor: '#2FAF8A', shadowColor: '#2FAF8A', shadowOpacity: 0.16 },
  highlightCardPressed: { transform: [{ scale: 0.98 }] },
  heartBadge: { position: 'absolute', top: 8, right: 8, zIndex: 4, width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  heartBadgeLiked: { backgroundColor: '#A8F0D4', borderColor: '#2FAF8A' },
  heartText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.heading, fontWeight: '700', fontSize: 17, lineHeight: 20 },
  heartTextLiked: { color: '#173A33' },
  highlightTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '700', fontSize: 12, lineHeight: 16, marginHorizontal: 9, marginTop: 8 },
  highlightNote: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontFamily: font.body, fontWeight: '500', fontSize: 10.5, lineHeight: 14, marginHorizontal: 9, marginTop: 4 },
  highlightSource: { ...androidTextReset, color: colors.tealDark, fontFamily: font.body, fontWeight: '500', fontSize: 10.5, marginHorizontal: 9, marginTop: 3, marginBottom: 9 },
  highlightSourceMuted: { color: 'rgba(32,38,35,0.50)' },
  favoriteWhy: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 12.5, lineHeight: 18, marginBottom: 2 },
  choiceCard: { minHeight: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.88)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  choiceCardSelected: { backgroundColor: '#DDF9EF', borderColor: '#2FAF8A' },
  choiceCardPressed: { transform: [{ scale: 0.99 }] },
  radioOuter: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(32,38,35,0.22)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  radioOuterSelected: { borderColor: '#2FAF8A' },
  radioInner: { width: 12, height: 12, borderRadius: 999, backgroundColor: '#2FAF8A' },
  choiceText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16, lineHeight: 21, flex: 1 },
  choiceTextSelected: { color: '#137D68' },
  formCard: { borderRadius: 26, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginTop: 18 },
  formTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 19, letterSpacing: -0.15, marginTop: 4 },
  formHint: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  reasonInput: { minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.68)', color: colors.charcoal, fontFamily: font.body, padding: 14, fontSize: 15, textAlignVertical: 'top', marginVertical: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  error: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '600', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 14 },
  actions: { marginTop: 16, marginBottom: 120 },
  closedCard: { borderRadius: 28, padding: 22, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginTop: 18, gap: 12 },
});
