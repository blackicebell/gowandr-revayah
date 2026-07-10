import React, { useEffect, useState } from 'react';
import { ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { EchoCard } from '../components/EchoCard';
import { PressableScale } from '../components/PressableScale';
import { starterImageUris } from '../data/imageAssets';
import { getMomentumCard } from '../logic/momentum';
import { androidTextReset, colors, font, useThemeColors } from '../theme/colors';
import { TripDraft } from '../types';
import { getSourceName } from '../utils/ideaLabels';

export function HomeScreen({
  trips,
  onOpenTrip,
  onStartDraft,
  onStartMatchup,
  onAddIdea,
  onOpenPlan,
}: {
  trips: TripDraft[];
  onOpenTrip: (tripId: string) => void;
  onStartDraft: (initialLink?: string) => void;
  onStartMatchup: () => void;
  onAddIdea: (tripId?: string, initialLink?: string) => void;
  onOpenPlan: () => void;
}) {
  const theme = useThemeColors();
  const momentum = getMomentumCard(trips);
  const [clipboardLink, setClipboardLink] = useState<string | undefined>();
  const [choosingClipboardTrip, setChoosingClipboardTrip] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkClipboard() {
      if (Platform.OS === 'web') return;
      try {
        const value = (await Clipboard.getStringAsync()).trim();
        if (isMounted && isLikelyTravelLink(value)) setClipboardLink(value);
      } catch {
        // Clipboard access should never block Home.
      }
    }
    checkClipboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const addClipboardLink = () => {
    if (!clipboardLink) return;
    if (!trips.length) {
      onStartDraft(clipboardLink);
      setClipboardLink(undefined);
      return;
    }
    if (trips.length > 1) {
      setChoosingClipboardTrip(true);
      return;
    }
    onAddIdea(trips[0].id, clipboardLink);
    setClipboardLink(undefined);
  };

  const addClipboardLinkToTrip = (tripId: string) => {
    if (!clipboardLink) return;
    onAddIdea(tripId, clipboardLink);
    setChoosingClipboardTrip(false);
    setClipboardLink(undefined);
  };
  const continueMomentum = () => {
    if (!momentum.trip) {
      onStartDraft();
      return;
    }
    if (momentum.intent === 'compare') {
      onStartMatchup();
      return;
    }
    if (momentum.intent === 'dates' || momentum.intent === 'checklist' || momentum.intent === 'share') {
      onOpenPlan();
      return;
    }
    if (momentum.intent === 'addIdea' || momentum.intent === 'addMore') {
      onAddIdea(momentum.trip.id);
      return;
    }
    onOpenTrip(momentum.trip.id);
  };

  return (
    <View>
      <ImageBackground source={{ uri: starterImageUris.coast }} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={['rgba(3,8,6,0.28)', 'rgba(3,8,6,0.18)', 'rgba(3,8,6,0.76)']} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}>
          <View style={styles.copyBlock}>
            <Text style={[styles.kicker, { color: theme.accent, fontFamily: font.semibold }]}>Collect. Compare. Commit.</Text>
            <Text style={[styles.title, { fontFamily: font.heading }]}>Collect the ideas. Choose the trip.</Text>
            <Text style={[styles.body, { fontFamily: font.body }]}>Save what you find, shape it into real options, and move toward the trip that feels worth doing.</Text>
          </View>
        </View>
      </ImageBackground>
      <View style={styles.heroActions}>
        <HeroButton label="New Trip Draft" tone="primary" onPress={() => onStartDraft()} />
      </View>

      {!!clipboardLink && (
        <View style={styles.clipboardWrap}>
          <TouchableOpacity activeOpacity={0.86} onPress={addClipboardLink} style={styles.clipboardCard}>
            <View style={styles.clipboardCopy}>
              <Text style={[styles.clipboardKicker, { fontFamily: font.semibold }]}>{getSourceName(clipboardLink)} link copied</Text>
              <Text style={[styles.clipboardTitle, { fontFamily: font.heading }]}>{trips.length > 1 ? 'Which trip should this go in?' : trips.length ? 'Add it to your trip draft?' : 'Start a draft for this link?'}</Text>
            </View>
            <View style={styles.clipboardAction}>
              <Text style={[styles.clipboardActionText, { fontFamily: font.semibold }]}>{trips.length > 1 ? 'Choose' : trips.length ? 'Add' : 'Start'}</Text>
            </View>
          </TouchableOpacity>
          {choosingClipboardTrip && trips.length > 1 && (
            <View style={styles.tripChooser}>
              <View style={styles.tripChooserHeader}>
                <Text style={[styles.tripChooserTitle, { fontFamily: font.heading }]}>Choose a trip draft</Text>
                <TouchableOpacity onPress={() => setChoosingClipboardTrip(false)} style={styles.tripChooserDismiss}>
                  <Text style={[styles.tripChooserDismissText, { fontFamily: font.semibold }]}>Close</Text>
                </TouchableOpacity>
              </View>
              {trips.slice(0, 5).map((trip) => (
                <TouchableOpacity key={trip.id} activeOpacity={0.82} onPress={() => addClipboardLinkToTrip(trip.id)} style={styles.tripChoice}>
                  <ImageBackground source={{ uri: trip.heroImage }} style={styles.tripChoiceImage} imageStyle={styles.tripChoiceImageRadius} />
                  <View style={styles.tripChoiceCopy}>
                    <Text numberOfLines={1} style={[styles.tripChoiceTitle, { fontFamily: font.heading }]}>{trip.title}</Text>
                    <Text numberOfLines={1} style={[styles.tripChoiceMeta, { fontFamily: font.body }]}>{trip.ideas.length} saved {trip.ideas.length === 1 ? 'idea' : 'ideas'}</Text>
                  </View>
                  <Text style={[styles.tripChoiceAction, { fontFamily: font.semibold }]}>Add</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <PressableScale onPress={continueMomentum} style={[styles.momentumCard, { backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : theme.paper, borderColor: Platform.OS === 'android' ? 'rgba(32,38,35,0.08)' : theme.line }]}>
        <View style={styles.momentumTop}>
          <Text style={[styles.momentumEyebrow, { fontFamily: font.semibold }]}>{momentum.eyebrow}</Text>
        </View>
        <Text style={[styles.momentumTitle, { fontFamily: font.heading }]}>{momentum.title}</Text>
        <Text style={[styles.momentumBody, { fontFamily: font.body }]}>Next: {momentum.body}</Text>
        <View style={styles.momentumCta}>
          <Text style={[styles.momentumCtaText, { fontFamily: font.semibold }]}>{momentum.cta}</Text>
        </View>
      </PressableScale>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={[styles.sectionTitle, { color: theme.charcoal, fontFamily: font.heading }]}>Your Trip Ideas</Text>
          <Text style={[styles.sectionHint, { color: theme.muted, fontFamily: font.body }]}>Planning alone or with people, GoWandr helps you choose what's worth doing.</Text>
        </View>
        <Text style={[styles.sectionMeta, { color: theme.muted, fontFamily: font.semibold }]}>{trips.length} drafts</Text>
      </View>
      {trips.slice(0, 3).map((trip) => (
        <EchoCard key={trip.id} trip={trip} onPress={() => onOpenTrip(trip.id)} />
      ))}
    </View>
  );
}

function isLikelyTravelLink(value: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  const lower = value.toLowerCase();
  return ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'maps.google', 'tripadvisor', 'airbnb', 'booking.com'].some((host) => lower.includes(host)) || /^https?:\/\/[^ ]+\.[^ ]+/.test(value);
}

function HeroButton({ label, onPress, tone = 'secondary' }: { label: string; onPress: () => void; tone?: 'primary' | 'secondary' }) {
  const isPrimary = tone === 'primary';
  return (
    <PressableScale onPress={onPress} containerStyle={isPrimary ? undefined : styles.heroButtonHalf} style={[styles.heroButton, isPrimary ? styles.heroPrimary : styles.heroSecondary]}>
      {isPrimary ? (
        <LinearGradient colors={['#A8F0D4', '#6ED8B5', '#2FAF8A']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroButtonFill}>
          <Text style={[styles.heroPrimaryText, { fontFamily: font.semibold }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={[styles.heroSecondaryText, { fontFamily: font.semibold }]}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 314, justifyContent: 'flex-end', borderRadius: 30, overflow: 'hidden', marginTop: 4, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  heroImage: { borderRadius: 34 },
  heroCopy: { padding: 22, gap: 18 },
  copyBlock: { gap: 8 },
  kicker: { color: colors.sun, fontWeight: '600', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: '#F8F8F6', fontWeight: '700', fontSize: 33, lineHeight: 39, letterSpacing: -0.36, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  body: { color: 'rgba(248,248,246,0.92)', fontSize: 14.5, lineHeight: 21, maxWidth: 390, fontWeight: '400', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  heroActions: { gap: 10, marginBottom: 16 },
  heroButtonHalf: { flex: 1 },
  heroButton: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroPrimary: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  heroSecondary: { backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.055, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  heroButtonFill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heroPrimaryText: { ...androidTextReset, color: '#173A33', fontWeight: '600', fontSize: 15 },
  heroSecondaryText: { ...androidTextReset, color: '#26302C', fontWeight: '600', fontSize: 14, textAlign: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'transparent', paddingHorizontal: Platform.OS === 'android' ? 2 : 0 },
  clipboardWrap: { marginBottom: 16, gap: 10 },
  clipboardCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 16, backgroundColor: Platform.OS === 'android' ? '#10231D' : 'rgba(16,35,29,0.95)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.18)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  clipboardCopy: { flex: 1, minWidth: 0 },
  clipboardKicker: { ...androidTextReset, color: '#A8F0D4', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  clipboardTitle: { ...androidTextReset, color: '#F8F8F6', fontWeight: '800', fontSize: 18, lineHeight: 23, marginTop: 5 },
  clipboardAction: { minHeight: 40, minWidth: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#A8F0D4' },
  clipboardActionText: { ...androidTextReset, color: '#173A33', fontWeight: '800', fontSize: 12.5 },
  tripChooser: { gap: 10, borderRadius: 22, padding: 14, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#173A33', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  tripChooserHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tripChooserTitle: { ...androidTextReset, flex: 1, color: '#202623', fontWeight: '800', fontSize: 17, lineHeight: 22 },
  tripChooserDismiss: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 4 },
  tripChooserDismissText: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 12.5 },
  tripChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderRadius: 18, padding: 9, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.76)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  tripChoiceImage: { width: 48, height: 48, borderRadius: 15, overflow: 'hidden', backgroundColor: '#DDF9EF' },
  tripChoiceImageRadius: { borderRadius: 15 },
  tripChoiceCopy: { flex: 1, minWidth: 0 },
  tripChoiceTitle: { ...androidTextReset, color: '#202623', fontWeight: '800', fontSize: 15.5, lineHeight: 20 },
  tripChoiceMeta: { ...androidTextReset, color: 'rgba(32,38,35,0.58)', fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  tripChoiceAction: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 12.5, paddingHorizontal: 8 },
  momentumCard: { borderRadius: 24, padding: 18, borderWidth: 1, shadowColor: '#173A33', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4, gap: 10, marginBottom: 16, overflow: 'hidden' },
  momentumTop: { flexDirection: 'row', alignItems: 'center' },
  momentumEyebrow: { ...androidTextReset, color: '#137D68', fontWeight: '700', fontSize: 11, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  momentumTitle: { ...androidTextReset, color: colors.charcoal, fontWeight: '700', fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  momentumBody: { ...androidTextReset, color: colors.muted, fontSize: 14.5, lineHeight: 21 },
  momentumCta: { alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: Platform.OS === 'android' ? '#CFF8E9' : 'rgba(168,240,212,0.56)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)' },
  momentumCtaText: { ...androidTextReset, color: '#173A33', fontWeight: '700', fontSize: 12.5, backgroundColor: Platform.OS === 'android' ? '#CFF8E9' : 'transparent', paddingHorizontal: Platform.OS === 'android' ? 2 : 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginTop: 22, marginBottom: 14 },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: colors.charcoal, fontWeight: '700', fontSize: 22, letterSpacing: -0.22 },
  sectionHint: { fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  sectionMeta: { color: colors.muted, fontWeight: '600', fontSize: 12, paddingTop: 6 },
  matchupBox: { borderRadius: 24, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4, gap: 14 },
  matchupCopy: { gap: 5 },
  boxTitle: { fontWeight: '700', fontSize: 22, letterSpacing: -0.22 },
  boxBody: { fontSize: 14.5, lineHeight: 21 },
});
