import React, { useState } from 'react';
import { ImageBackground, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SourceThumbnail, getSourceLabel } from '../components/SourceThumbnail';
import { androidTextReset, colors, font } from '../theme/colors';
import { TripDraft, VoteAnswer, VotePrompt } from '../types';

type PromptConfig = {
  id: VotePrompt;
  text: string;
  helper: string;
  reasons: string[];
  concerns: string[];
};

const prompts: PromptConfig[] = [
  {
    id: 'exciting',
    text: 'Which trip made you think, “I actually want to go”?',
    helper: 'Pick the experience that pulled you in after seeing the highlights.',
    reasons: ["I'm in", 'Best energy', 'Dream trip', 'Looks fun', 'Biggest memory'],
    concerns: ['Too expensive', 'Too much partying', 'Not relaxing enough', 'Safety concern', 'Dates unclear'],
  },
  {
    id: 'easy',
    text: 'Which trip feels easier to actually pull off?',
    helper: 'Think budget, timing, travel friction, and who can realistically go.',
    reasons: ['Easy yes', 'Dates work', 'Shorter travel', 'Lower lift', 'Fits budget', 'Everyone can go'],
    concerns: ['Dates unclear', 'Travel hassle', 'Needs budget check', 'Group schedules', 'Too much planning'],
  },
  {
    id: 'mood',
    text: 'Which trip fits the mood you are in right now?',
    helper: 'Think energy, pace, people, and the kind of memory you want.',
    reasons: ['Fits the vibe', 'Need this', 'Good energy', 'Right pace', 'Feels easy'],
    concerns: ['Wrong vibe', 'Too packed', 'Too quiet', 'Not enough anchors', 'Needs details'],
  },
  {
    id: 'regret',
    text: 'Which one would you regret skipping?',
    helper: 'This helps separate nice ideas from the trip people really want.',
    reasons: ['Would regret it', 'Once-in-a-while', 'Dream trip', 'Best memory', "I'm in", 'Feels worth it'],
    concerns: ['Too expensive', 'Hard to plan', 'Too far', 'Needs more clarity', 'Timing risk'],
  },
];

export function VotingScreen({ trips, matchupName, onCancel, onComplete }: { trips: TripDraft[]; matchupName: string; onCancel: () => void; onComplete: (votes: VoteAnswer[]) => void }) {
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState<VoteAnswer[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  const [phase, setPhase] = useState<'preview' | 'choose' | 'explain'>('preview');
  const [reaction, setReaction] = useState<string | undefined>();
  const [dealbreaker, setDealbreaker] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const prompt = prompts[step];
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);

  const chooseTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setPhase('explain');
  };

  const changePick = () => {
    setSelectedTripId(undefined);
    setPhase('choose');
    setReaction(undefined);
    setDealbreaker(undefined);
    setReason('');
  };

  const submitWhy = () => {
    if (!selectedTripId) return;
    const commitment = dealbreaker ? 2 : reaction ? 4 : 3;
    const nextVotes = [...votes, { prompt: prompt.id, tripId: selectedTripId, reaction, dealbreaker, commitment, reason: reason.trim() || reaction }];
    setSelectedTripId(undefined);
    setPhase('choose');
    setReaction(undefined);
    setDealbreaker(undefined);
    setReason('');
    if (step >= prompts.length - 1) onComplete(nextVotes);
    else {
      setVotes(nextVotes);
      setStep((current) => current + 1);
    }
  };

  return (
    <View>
      <Text style={styles.kicker}>{matchupName}</Text>
      {phase === 'preview' ? (
        <>
          <Text style={styles.title}>Watch the highlights first.</Text>
          <Text style={styles.helper}>You are comparing the saved links and ideas, not just destination names. Skim each trip, then decide what pulls you.</Text>
          <View style={styles.playlists}>
            {trips.map((trip) => (
              <TripHighlightPreview key={trip.id} trip={trip} />
            ))}
          </View>
          <View style={styles.bottomActions}>
            <Button label="Start comparison" onPress={() => setPhase('choose')} />
            <TextAction label="Cancel" onPress={onCancel} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>{prompt.text}</Text>
          <Text style={styles.helper}>{prompt.helper}</Text>
          <Text style={styles.progress}>Question {step + 1} of {prompts.length}</Text>

      {phase === 'choose' ? (
        <View>
          <View style={styles.cards}>
            {trips.map((trip) => (
              <TouchableOpacity key={trip.id} onPress={() => chooseTrip(trip.id)} style={styles.voteCard}>
                <ImageBackground source={{ uri: trip.heroImage }} style={styles.image} imageStyle={styles.imageRadius}>
                  <View style={styles.shade} />
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{trip.title}</Text>
                    <Text style={styles.cardMeta}>{trip.tags.slice(0, 3).join(' • ')}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.bottomActions}>
            <TextAction label="Cancel" onPress={onCancel} />
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.whyCard}>
            <Text style={styles.whyLabel}>You picked</Text>
            <Text style={styles.whyTitle}>{selectedTrip?.title}</Text>
            <Text style={styles.whyBody}>What made this one win for you?</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Example: easier for everyone, better food, dates work..." placeholderTextColor="rgba(32,38,35,0.48)" style={styles.reasonInput} multiline />
          </View>

          <View style={styles.choiceSection}>
            <Text style={styles.label}>Quick reason</Text>
            <Text style={styles.sectionHint}>Tap one if it explains your pick.</Text>
            <View style={styles.wrap}>
              {prompt.reasons.map((item) => (
                <Chip key={item} label={item} active={reaction === item} onPress={() => setReaction(reaction === item ? undefined : item)} />
              ))}
            </View>
          </View>

          <View style={styles.choiceSection}>
            <Text style={styles.label}>Concern, if any</Text>
            <Text style={styles.sectionHint}>Optional. Leave blank if there is no blocker.</Text>
            <View style={styles.wrap}>
              {prompt.concerns.map((item) => (
                <Chip key={item} label={item} active={dealbreaker === item} onPress={() => setDealbreaker(dealbreaker === item ? undefined : item)} />
              ))}
            </View>
          </View>

          <View style={styles.whyActions}>
            <TouchableOpacity onPress={changePick} style={styles.changePick}>
              <Text style={styles.changePickText}>Change trip choice</Text>
            </TouchableOpacity>
            <Button label={step >= prompts.length - 1 ? 'See Results' : 'Next Question'} disabled={!reason.trim() && !reaction} onPress={submitWhy} />
            <TextAction label="Cancel" onPress={onCancel} />
          </View>
        </View>
      )}
        </>
      )}
    </View>
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.textAction}>
      <Text style={styles.textActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TripHighlightPreview({ trip }: { trip: TripDraft }) {
  const highlights = trip.ideas.length ? trip.ideas.slice(0, 3) : [];
  return (
    <View style={styles.playlistCard}>
      <ImageBackground source={{ uri: trip.heroImage }} style={styles.playlistHero} imageStyle={styles.playlistHeroImage}>
        <View style={styles.playlistShade} />
        <View style={styles.playlistHeroCopy}>
          <Text style={styles.playlistCount}>{trip.ideas.length || 1} highlights</Text>
          <Text style={styles.playlistTitle}>{trip.title}</Text>
          <Text style={styles.playlistMeta}>{trip.tags.slice(0, 3).join(' / ')}</Text>
        </View>
      </ImageBackground>
      <View style={styles.highlightRow}>
        {(highlights.length ? highlights : [{ id: 'empty', title: 'Add saved links to make this trip easier to feel.', priority: 'Maybe' as const, tags: [], category: 'Other' as const }]).map((idea) => (
          <TouchableOpacity key={idea.id} disabled={!idea.link} onPress={() => openInspirationLink(idea.link)} style={[styles.highlightCard, idea.link && styles.highlightCardLinked]}>
            <SourceThumbnail link={idea.link} priority={idea.priority} />
            <Text numberOfLines={1} style={styles.highlightTitle}>{idea.title}</Text>
            <Text numberOfLines={1} style={styles.highlightSource}>{formatHighlightSource(idea.link)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function openInspirationLink(link?: string) {
  if (!link) return;
  const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  Linking.openURL(normalized).catch(() => undefined);
}

function formatHighlightSource(link?: string) {
  const label = getSourceLabel(link);
  return link ? `Open ${label}` : label;
}

const styles = StyleSheet.create({
  kicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', textTransform: 'uppercase', fontSize: 12, marginTop: 10 },
  title: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 31, lineHeight: 37, marginTop: 6, letterSpacing: -0.4 },
  helper: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 15, lineHeight: 22, marginTop: 8 },
  progress: { ...androidTextReset, color: colors.muted, fontFamily: font.semibold, fontWeight: '600', marginTop: 10, marginBottom: 18 },
  playlists: { gap: 16 },
  playlistCard: { borderRadius: 26, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', padding: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  playlistHero: { minHeight: 170, justifyContent: 'flex-end', borderRadius: 20, overflow: 'hidden' },
  playlistHeroImage: { borderRadius: 20 },
  playlistShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  playlistHeroCopy: { padding: 15 },
  playlistCount: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  playlistTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 24, lineHeight: 29, marginTop: 4 },
  playlistMeta: { ...androidTextReset, color: 'rgba(255,255,255,0.86)', fontFamily: font.body, fontSize: 13, lineHeight: 18, marginTop: 4, textTransform: 'capitalize' },
  highlightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  highlightCard: { flex: 1, minWidth: '30%', borderRadius: 18, overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  highlightCardLinked: { borderColor: 'rgba(47,175,138,0.18)' },
  highlightTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '700', fontSize: 12, marginHorizontal: 9, marginTop: 8 },
  highlightSource: { ...androidTextReset, color: colors.tealDark, fontFamily: font.body, fontWeight: '500', fontSize: 11, marginHorizontal: 9, marginTop: 2, marginBottom: 9 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  voteCard: { width: '48%', borderRadius: 24, overflow: 'hidden', backgroundColor: colors.charcoal, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  image: { minHeight: 216, justifyContent: 'flex-end' },
  imageRadius: { borderRadius: 24 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.24)' },
  cardCopy: { padding: 16 },
  cardTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 23, lineHeight: 27 },
  cardMeta: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, opacity: 0.92, fontWeight: '600', marginTop: 5, textTransform: 'capitalize', fontSize: 12 },
  whyCard: { borderRadius: 24, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', padding: 18, borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  whyLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', textTransform: 'uppercase', fontSize: 11 },
  whyTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 27, marginTop: 4, letterSpacing: -0.25 },
  whyBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 15, lineHeight: 21, marginTop: 6, marginBottom: 12 },
  reasonInput: { minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.68)', color: colors.charcoal, fontFamily: font.body, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  choiceSection: { marginTop: 24 },
  label: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 18, marginBottom: 5, letterSpacing: -0.12 },
  sectionHint: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10 },
  whyActions: { gap: 11, marginTop: 22, marginBottom: 112 },
  changePick: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  changePickText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 14 },
  textAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textActionLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 14 },
  bottomActions: { gap: 11, marginTop: 18, marginBottom: 112 },
});
