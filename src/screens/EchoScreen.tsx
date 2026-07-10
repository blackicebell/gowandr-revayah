import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EchoCard } from '../components/EchoCard';
import { PressableScale } from '../components/PressableScale';
import { getMomentumStatus, getNextBestStep } from '../logic/momentum';
import { androidTextReset, colors, font, useThemeColors } from '../theme/colors';
import { TripDraft } from '../types';

type MoodFilter = 'All' | 'Food' | 'Beach' | 'Reset' | 'Celebration' | 'Culture' | 'Adventure' | 'Romance';

const moodFilters: MoodFilter[] = ['All', 'Food', 'Beach', 'Reset', 'Celebration', 'Culture', 'Adventure', 'Romance'];

export function EchoScreen({
  trips,
  onOpenTrip,
  onCreateTrip,
  onCreateMatchup,
}: {
  trips: TripDraft[];
  onOpenTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onCreateMatchup: () => void;
}) {
  const theme = useThemeColors();
  const [filter, setFilter] = useState<MoodFilter>('All');
  const continueTrip = useMemo(() => chooseContinueTrip(trips), [trips]);
  const filteredTrips = useMemo(() => trips.filter((trip) => matchesMoodFilter(trip, filter)), [filter, trips]);

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.charcoal, fontFamily: font.heading }]}>Trip Ideas</Text>
        <Text style={[styles.body, { color: theme.muted, fontFamily: font.body }]}>Save travel links and ideas, shape them into options, and choose what is actually worth planning.</Text>
        <View style={styles.actions}>
          <BoardAction label="New Trip Idea" tone="primary" onPress={() => onCreateTrip()} />
        </View>
        {continueTrip && <ContinueWorkingCard trip={continueTrip} onOpenTrip={() => onOpenTrip(continueTrip.id)} onCreateMatchup={onCreateMatchup} />}
        <View style={styles.sectionIntro}>
          <View>
            <Text style={[styles.sectionLabel, { fontFamily: font.heading }]}>Your Trip Ideas</Text>
            <Text style={[styles.sectionHint, { fontFamily: font.body }]}>Recently updated first</Text>
          </View>
          <Text style={[styles.sectionCount, { fontFamily: font.semibold }]}>{trips.length} drafts</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {moodFilters.map((item) => (
            <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive, { fontFamily: font.semibold }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!trips.length ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { fontFamily: font.heading }]}>Start a trip draft for the links you keep saving.</Text>
          <Text style={[styles.emptyBody, { fontFamily: font.body }]}>Paste TikToks, Reels, YouTube videos, restaurants, and notes before the idea disappears.</Text>
          <BoardAction label="Create your first trip draft" tone="primary" onPress={() => onCreateTrip()} />
        </View>
      ) : !filteredTrips.length ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { fontFamily: font.heading }]}>Nothing here yet.</Text>
          <Text style={[styles.emptyBody, { fontFamily: font.body }]}>Try another mood or add a new trip idea.</Text>
        </View>
      ) : (
        <View style={styles.cardList}>
          {filteredTrips.map((trip) => (
            <EchoCard key={trip.id} trip={trip} onPress={() => onOpenTrip(trip.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

function ContinueWorkingCard({ trip, onOpenTrip, onCreateMatchup }: { trip: TripDraft; onOpenTrip: () => void; onCreateMatchup: () => void }) {
  const next = getNextBestStep(trip);
  const status = getMomentumStatus(trip);
  const canCompare = next.intent === 'compare' || status === 'Ready to compare' || status === 'Strong option';
  const cta = canCompare ? 'Compare Now' : next.cta;

  return (
    <PressableScale onPress={canCompare ? onCreateMatchup : onOpenTrip} style={styles.continueCard}>
      <View style={styles.continueCopy}>
        <Text style={[styles.continueEyebrow, { fontFamily: font.semibold }]}>Continue Working</Text>
        <Text style={[styles.continueTitle, { fontFamily: font.heading }]}>{trip.title}</Text>
        <Text style={[styles.continueBody, { fontFamily: font.body }]}>{getContinueMessage(trip, status)}</Text>
      </View>
      <View style={styles.continueMeta}>
        <Text style={[styles.continueStatus, { fontFamily: font.semibold }]}>{status}</Text>
        <View style={styles.continueButton}>
          <Text style={[styles.continueButtonText, { fontFamily: font.semibold }]}>{cta}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

function BoardAction({ label, tone, onPress }: { label: string; tone: 'primary' | 'secondary'; onPress: () => void }) {
  const isPrimary = tone === 'primary';
  return (
    <PressableScale onPress={onPress} style={[styles.boardButton, isPrimary ? styles.boardPrimary : styles.boardSecondary]}>
      {isPrimary ? (
        <LinearGradient colors={['#A8F0D4', '#6ED8B5', '#2FAF8A']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.boardButtonFill}>
          <Text style={[styles.boardPrimaryText, { fontFamily: font.semibold }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={[styles.boardSecondaryText, { fontFamily: font.semibold }]}>{label}</Text>
      )}
    </PressableScale>
  );
}

function chooseContinueTrip(trips: TripDraft[]) {
  if (!trips.length) return undefined;
  return [...trips].sort((left, right) => getTripPriority(right) - getTripPriority(left))[0];
}

function getTripPriority(trip: TripDraft) {
  const status = getMomentumStatus(trip);
  if (status === 'Ready to compare') return 90 + trip.ideas.length;
  if (status === 'Strong option') return 86 + trip.ideas.length;
  if (status === 'Taking shape') return 70 + trip.ideas.length;
  if (status === 'Just started') return 50 + trip.ideas.length;
  if (status === 'Preparing' || status === 'Ready to book') return 45;
  if (status === 'Committed') return 40;
  return 10;
}

function getContinueMessage(trip: TripDraft, status: string) {
  if (status === 'Ready to compare') return 'You have enough saved ideas to put this against another strong option.';
  if (status === 'Strong option') return 'This one already has momentum. Open it when you are ready to commit.';
  if (status === 'Taking shape') return 'Add one or two more highlights so it becomes easier to compare.';
  if (status === 'Just started') return 'Add a TikTok, Reel, YouTube video, restaurant, or note to make this feel real.';
  if (status === 'Preparing' || status === 'Ready to book') return 'This trip is in Plan. Keep the prep moving.';
  return `${trip.companionType} / ${trip.pace}`;
}

function matchesMoodFilter(trip: TripDraft, filter: MoodFilter) {
  if (filter === 'All') return true;
  const tags = trip.tags.map((tag) => tag.toLowerCase());
  if (filter === 'Food') return tags.includes('food');
  if (filter === 'Beach') return tags.includes('beach');
  if (filter === 'Reset') return tags.some((tag) => ['relax', 'reset', 'low-key', 'low key'].includes(tag));
  if (filter === 'Celebration') return tags.some((tag) => ['celebration', 'birthday', 'nightlife'].includes(tag));
  if (filter === 'Culture') return tags.includes('culture');
  if (filter === 'Adventure') return tags.some((tag) => ['adventure', 'nature', 'outdoors'].includes(tag));
  if (filter === 'Romance') return tags.some((tag) => ['romance', 'romantic', 'couple'].includes(tag)) || trip.companionType === 'Couple';
  return true;
}

const styles = StyleSheet.create({
  header: { paddingTop: 14, paddingBottom: 20 },
  title: { ...androidTextReset, color: colors.charcoal, fontWeight: '700', fontSize: 42, lineHeight: 50, letterSpacing: -0.42 },
  body: { ...androidTextReset, color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 8, marginBottom: 16, fontWeight: '400' },
  actions: { gap: 10 },
  boardButton: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boardPrimary: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  boardSecondary: { backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.20)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.30)', shadowColor: '#2FAF8A', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  boardButtonFill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  boardPrimaryText: { ...androidTextReset, color: '#173A33', fontWeight: '700', fontSize: 15 },
  boardSecondaryText: { ...androidTextReset, color: '#173A33', fontWeight: '700', fontSize: 15 },
  continueCard: { marginTop: 18, borderRadius: 26, padding: 18, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#173A33', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4, gap: 14 },
  continueCopy: { gap: 5 },
  continueEyebrow: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.55 },
  continueTitle: { ...androidTextReset, color: '#202623', fontWeight: '700', fontSize: 24, lineHeight: 29, letterSpacing: -0.24 },
  continueBody: { ...androidTextReset, color: 'rgba(32,38,35,0.66)', fontSize: 14.5, lineHeight: 21, fontWeight: '500' },
  continueMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  continueStatus: { ...androidTextReset, flex: 1, color: '#137D68', fontWeight: '700', fontSize: 12.5 },
  continueButton: { minHeight: 42, borderRadius: 999, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#C7F7E5' : 'rgba(168,240,212,0.74)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)' },
  continueButtonText: { ...androidTextReset, color: '#173A33', fontWeight: '700', fontSize: 13 },
  sectionIntro: { marginTop: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionLabel: { ...androidTextReset, color: '#202623', fontWeight: '700', fontSize: 23, lineHeight: 28, letterSpacing: -0.23 },
  sectionHint: { ...androidTextReset, color: 'rgba(32,38,35,0.58)', fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  sectionCount: { ...androidTextReset, color: 'rgba(32,38,35,0.54)', fontSize: 12.5, fontWeight: '700', paddingBottom: 3 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 12 },
  filterChip: { minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.68)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  filterChipActive: { backgroundColor: Platform.OS === 'android' ? '#CFF8E9' : 'rgba(168,240,212,0.66)', borderColor: 'rgba(47,175,138,0.22)' },
  filterText: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontWeight: '700', fontSize: 12.5 },
  filterTextActive: { color: '#173A33' },
  cardList: { paddingTop: 4 },
  emptyState: { borderRadius: 26, padding: 20, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4, gap: 12 },
  emptyTitle: { ...androidTextReset, color: colors.charcoal, fontSize: 23, lineHeight: 28, fontWeight: '700', letterSpacing: -0.23 },
  emptyBody: { ...androidTextReset, color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 4 },
});
