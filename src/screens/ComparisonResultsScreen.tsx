import React, { useMemo } from 'react';
import { Alert, ImageBackground, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { androidTextReset, colors, font } from '../theme/colors';
import { ComparisonResponse, MatchupResultSummary, MatchupSession } from '../types';

export function ComparisonResultsScreen({
  session,
  onBack,
  onDeleteResponse,
  onCloseComparison,
  onCommitTrip,
}: {
  session: MatchupSession;
  onBack: () => void;
  onDeleteResponse: (responseId: string) => void;
  onCloseComparison: () => void;
  onCommitTrip: (tripId: string, result: MatchupResultSummary) => void;
}) {
  const results = useMemo(() => summarizeComparison(session), [session]);
  const leader = results.tripResults[0];

  const confirmDeleteResponse = (response: ComparisonResponse) => {
    Alert.alert('Delete response?', `${response.voterName}'s input will be removed from this comparison.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteResponse(response.id) },
    ]);
  };

  const confirmClose = () => {
    Alert.alert('Close shared link?', 'Friends will no longer be able to add input, but you can still review the results.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close Link', onPress: onCloseComparison },
    ]);
  };

  const shareResults = () => {
    Share.share({
      message: leader
        ? `GoWandr read for ${session.matchupName}\n\nStrongest momentum: ${leader.trip.title}\n${results.totalResponses} responses shared input.\n\nTop concern: ${results.topConcerns[0]?.label ?? 'No major blocker yet.'}`
        : `GoWandr read for ${session.matchupName}\n\nNo responses yet. Share the link to get input.`,
    }).catch(() => undefined);
  };

  if (!leader) {
    return (
      <View>
        <Text style={styles.back} onPress={onBack}>Back to Compare</Text>
        <Text style={styles.kicker}>Get a read</Text>
        <Text style={styles.title}>No input yet</Text>
        <Text style={styles.body}>Once friends open the shared link and answer, their responses will show here.</Text>
        <View style={styles.actions}>
          <Button label="Share Results Later" variant="secondary" onPress={shareResults} />
          <Button label={session.status === 'closed' ? 'Link Closed' : 'Close Shared Link'} variant="secondary" disabled={session.status === 'closed'} onPress={confirmClose} />
        </View>
      </View>
    );
  }

  const summaryText = `${leader.trip.title} has the strongest momentum from ${results.totalResponses} ${results.totalResponses === 1 ? 'response' : 'responses'}.`;

  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back to Compare</Text>
      <Text style={styles.kicker}>{session.status === 'closed' ? 'Closed read' : 'Open read'}</Text>
      <Text style={styles.title}>Review the input.</Text>
      <Text style={styles.body}>{summaryText}</Text>

      <ImageBackground source={{ uri: leader.trip.coverImageUrl }} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.shade} />
        <View style={styles.momentumPill}>
          <Text style={styles.momentumText}>Strongest momentum</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{leader.trip.title}</Text>
          <Text style={styles.heroMeta}>{leader.count} selected / {leader.likedHighlights} highlight likes</Text>
        </View>
      </ImageBackground>

      <View style={styles.grid}>
        <StatCard label="Responses" value={`${results.totalResponses}`} />
        <StatCard label="Leading trip" value={leader.trip.title} />
        <StatCard label="Top concern" value={results.topConcerns[0]?.label ?? 'None yet'} />
        <StatCard label="Liked highlights" value={`${results.totalHighlightLikes}`} />
      </View>

      <Section title="Trip momentum">
        {results.tripResults.map((item) => (
          <View key={item.trip.id} style={styles.resultRow}>
            <View style={styles.resultCopy}>
              <Text style={styles.resultTitle}>{item.trip.title}</Text>
              <Text style={styles.resultMeta}>{item.count} selected / {item.likedHighlights} highlight likes</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${results.totalResponses ? (item.count / results.totalResponses) * 100 : 0}%` }]} />
            </View>
          </View>
        ))}
      </Section>

      <Section title="Reasons by trip">
        {results.tripResults.map((item) => (
          <View key={item.trip.id} style={styles.reasonGroup}>
            <Text style={styles.reasonTrip}>{item.trip.title}</Text>
            {item.reasons.length ? item.reasons.map((reason, index) => <Text key={`${item.trip.id}-${index}`} style={styles.reasonText}>“{reason}”</Text>) : <Text style={styles.emptyLine}>No reasons yet.</Text>}
          </View>
        ))}
      </Section>

      <Section title="Concerns">
        {results.topConcerns.length ? (
          <View style={styles.concernWrap}>
            {results.topConcerns.map((concern) => (
              <View key={concern.label} style={styles.concernPill}>
                <Text style={styles.concernText}>{concern.label} · {concern.count}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyLine}>No concerns flagged yet.</Text>
        )}
      </Section>

      <Section title="Responses">
        {session.responses?.map((response) => {
          const trip = results.tripResults.find((item) => item.trip.id === response.selectedTripId)?.trip;
          return (
            <View key={response.id} style={styles.responseCard}>
              <View style={styles.responseTop}>
                <View style={styles.responseCopy}>
                  <Text style={styles.responseName}>{response.voterName}</Text>
                  <Text style={styles.responseTrip}>{trip?.title ?? 'Trip'} {response.concernChips.length ? `/ ${response.concernChips.join(', ')}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDeleteResponse(response)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {!!response.reason && <Text style={styles.responseReason}>“{response.reason}”</Text>}
            </View>
          );
        })}
      </Section>

      <View style={styles.actions}>
        <Button label={`Commit to ${leader.trip.title}`} onPress={() => onCommitTrip(leader.trip.id, { matchupName: session.matchupName, groupMatch: Math.round((leader.count / Math.max(results.totalResponses, 1)) * 100), summary: summaryText, decidedAt: new Date().toISOString() })} />
        <Button label="Share Results" variant="secondary" onPress={shareResults} />
        <Button label={session.status === 'closed' ? 'Shared Link Closed' : 'Close Shared Link'} variant="secondary" disabled={session.status === 'closed'} onPress={confirmClose} />
      </View>
    </View>
  );
}

function summarizeComparison(session: MatchupSession) {
  const trips = session.comparisonTrips ?? [];
  const responses = session.responses ?? [];
  const tripResults = trips
    .map((trip) => {
      const selectedResponses = responses.filter((response) => response.selectedTripId === trip.id);
      const highlightIds = new Set(trip.highlights.map((highlight) => highlight.id));
      const likedHighlights = responses.reduce((count, response) => count + response.likedHighlightIds.filter((id) => highlightIds.has(id)).length, 0);
      return {
        trip,
        count: selectedResponses.length,
        reasons: selectedResponses.map((response) => response.reason).filter(Boolean) as string[],
        likedHighlights,
      };
    })
    .sort((a, b) => b.count - a.count || b.likedHighlights - a.likedHighlights);

  const concernCounts = new Map<string, number>();
  responses.forEach((response) => response.concernChips.forEach((chip) => concernCounts.set(chip, (concernCounts.get(chip) ?? 0) + 1)));
  const topConcerns = Array.from(concernCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalResponses: responses.length,
    totalHighlightLikes: responses.reduce((count, response) => count + response.likedHighlightIds.length, 0),
    tripResults,
    topConcerns,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', paddingVertical: 10 },
  kicker: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, marginTop: 4 },
  title: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 34, lineHeight: 40, letterSpacing: -0.4, marginTop: 6 },
  body: { color: colors.muted, fontFamily: font.body, fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 18 },
  hero: { minHeight: 260, borderRadius: 28, overflow: 'hidden', justifyContent: 'space-between', marginBottom: 16 },
  heroImage: { borderRadius: 28 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  momentumPill: { alignSelf: 'flex-end', margin: 14, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Platform.OS === 'android' ? '#A8F0D4' : 'rgba(168,240,212,0.92)' },
  momentumText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  heroCopy: { padding: 18 },
  heroTitle: { color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 30, lineHeight: 35 },
  heroMeta: { color: 'rgba(255,255,255,0.88)', fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '48%', minHeight: 98, borderRadius: 20, padding: 14, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  statLabel: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  statValue: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 17, lineHeight: 22, marginTop: 8 },
  section: { borderRadius: 24, padding: 17, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 14 },
  sectionTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 21, letterSpacing: -0.2, marginBottom: 12 },
  resultRow: { gap: 8, marginBottom: 13 },
  resultCopy: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  resultTitle: { flex: 1, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '700', fontSize: 15 },
  resultMeta: { color: colors.muted, fontFamily: font.body, fontSize: 12.5 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.07)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: '#6ED8B5' },
  reasonGroup: { borderRadius: 18, padding: 13, backgroundColor: 'rgba(168,240,212,0.20)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.10)', marginBottom: 10 },
  reasonTrip: { color: colors.charcoal, fontFamily: font.semibold, fontWeight: '700', fontSize: 15, marginBottom: 5 },
  reasonText: { color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  emptyLine: { color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19 },
  concernWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  concernPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  concernText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '600', fontSize: 12.5 },
  responseCard: { borderRadius: 18, padding: 13, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', marginBottom: 10 },
  responseTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  responseCopy: { flex: 1 },
  responseName: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16 },
  responseTrip: { color: colors.muted, fontFamily: font.body, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  responseReason: { color: colors.charcoal, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 9 },
  deleteButton: { minHeight: 32, justifyContent: 'center' },
  deleteText: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '600', fontSize: 12.5 },
  actions: { gap: 10, marginTop: 4, marginBottom: 120 },
});
