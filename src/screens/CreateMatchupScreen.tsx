import React, { useMemo, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { buildMatchupShareUrl, createMatchupSession } from '../backend/matchupSessions';
import { explainResult, scoreMatchup } from '../logic/matchupScore';
import { androidTextReset, colors, font } from '../theme/colors';
import { MatchupSession, TripDraft } from '../types';
import { shareImageFile, shareMatchupInvite, shareMatchupResult } from '../utils/shareCards';

export function CreateMatchupScreen({
  trips,
  ownedSessions,
  ownedSessionsLoading,
  comparisonReadCounts,
  canCreateSharedComparison = true,
  onBack,
  onStart,
  onSessionCreated,
  onRefreshSessions,
  onOpenSessionResults,
  onDeleteSession,
  onUpgradeRequired,
}: {
  trips: TripDraft[];
  ownedSessions: MatchupSession[];
  ownedSessionsLoading: boolean;
  comparisonReadCounts: Record<string, number>;
  canCreateSharedComparison?: boolean;
  onBack: () => void;
  onStart: (tripIds: string[], matchupName: string) => void;
  onSessionCreated: (sessionId: string) => void;
  onRefreshSessions: () => void;
  onOpenSessionResults: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpgradeRequired?: () => void;
}) {
  const initialSelected = trips.slice(0, Math.min(2, trips.length)).map((trip) => trip.id);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const selectedTrips = useMemo(() => trips.filter((trip) => selected.includes(trip.id)), [selected, trips]);
  const availableTrips = useMemo(() => trips.filter((trip) => !selected.includes(trip.id)), [selected, trips]);
  const [shareState, setShareState] = useState<'idle' | 'creating' | 'missingConfig'>('idle');
  const [sharePreview, setSharePreview] = useState<SharePreviewState | undefined>();
  const [flowStep, setFlowStep] = useState<'choose' | 'preparing' | 'decide' | 'intro' | 'finding' | 'curate'>('choose');
  const [showHistory, setShowHistory] = useState(false);
  const [includedHighlightIds, setIncludedHighlightIds] = useState<string[]>([]);

  const selectedTripNames = selectedTrips.map((trip) => trip.title).join(' / ');
  const eligibleHighlightIds = useMemo(
    () => selectedTrips.flatMap((trip) => trip.ideas.filter((idea) => idea.priority !== 'Skip').map((idea) => idea.id)),
    [selectedTrips],
  );

  const toggleTrip = (tripId: string) => {
    setSelected((current) => {
      if (current.includes(tripId)) return current.filter((id) => id !== tripId);
      if (current.length >= 4) return current;
      return [...current, tripId];
    });
  };

  const continueToDecision = () => {
    if (selectedTrips.length < 2) return;
    setFlowStep('preparing');
    setTimeout(() => setFlowStep('decide'), 520);
  };

  const startOwnComparison = () => {
    if (selectedTrips.length < 2) return;
    setFlowStep('intro');
  };

  const beginOwnComparison = () => {
    setFlowStep('finding');
    setTimeout(() => onStart(selected, 'Weekend Escape'), 520);
  };

  const openShareCuration = () => {
    if (selectedTrips.length < 2) return;
    if (!canCreateSharedComparison) {
      onUpgradeRequired?.();
      return;
    }
    setIncludedHighlightIds((current) => {
      const stillValid = current.filter((id) => eligibleHighlightIds.includes(id));
      return stillValid.length ? stillValid : eligibleHighlightIds;
    });
    setFlowStep('curate');
  };

  const toggleHighlight = (ideaId: string) => {
    setIncludedHighlightIds((current) => (current.includes(ideaId) ? current.filter((id) => id !== ideaId) : [...current, ideaId]));
  };

  const createCuratedShareLink = async () => {
    if (selectedTrips.length < 2) return;
    if (!canCreateSharedComparison) {
      onUpgradeRequired?.();
      return;
    }
    const curatedTrips = selectedTrips.map((trip) => ({
      ...trip,
      ideas: trip.ideas.filter((idea) => idea.priority !== 'Skip' && (includedHighlightIds.length === 0 || includedHighlightIds.includes(idea.id))),
    }));

    setShareState('creating');
    try {
      const sessionId = await createMatchupSession('Weekend Escape', curatedTrips);
      setShareState('idle');
      if (!sessionId) {
        setShareState('missingConfig');
        setSharePreview({ url: buildMatchupShareUrl('preview-only'), trips: curatedTrips, matchupName: 'Weekend Escape', previewOnly: true });
        return;
      }
      onSessionCreated(sessionId);
      setSharePreview({ url: buildMatchupShareUrl(sessionId), trips: curatedTrips, matchupName: 'Weekend Escape' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Firebase error.';
      console.warn('GoWandr shared voting setup failed:', message);
      setShareState('missingConfig');
      setSharePreview({ url: buildMatchupShareUrl('preview-only'), trips: curatedTrips, matchupName: 'Weekend Escape', previewOnly: true });
    }
  };

  if (trips.length < 2) {
    return (
      <View>
        <Text style={styles.back} onPress={onBack}>Back home</Text>
        <Text style={styles.title}>Choose Your Trip</Text>
        <Text style={styles.body}>You need at least two trip ideas before comparing.</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Start with one more option.</Text>
          <Text style={styles.emptyBody}>Comparison works best when you can feel the difference between two possible trips.</Text>
        </View>
      </View>
    );
  }

  if (flowStep === 'preparing') {
    return (
      <View style={styles.preparingScreen}>
        <View style={styles.preparingCard}>
          <Text style={styles.preparingLabel}>Preparing comparison</Text>
          <DecisionShortlistPreview trips={selectedTrips} compact />
          <Text style={styles.preparingBody}>Pulling your trip ideas into decision mode.</Text>
        </View>
      </View>
    );
  }

  if (flowStep === 'finding') {
    return (
      <View style={styles.preparingScreen}>
        <View style={styles.preparingCard}>
          <Text style={styles.preparingLabel}>Finding your strongest pull</Text>
          <DecisionShortlistPreview trips={selectedTrips} compact />
          <Text style={styles.preparingBody}>One quick feel-check at a time.</Text>
        </View>
      </View>
    );
  }

  if (flowStep === 'decide') {
    return (
      <View>
        <View style={styles.readyHeaderRow}>
          <Text style={styles.back} onPress={() => setFlowStep('choose')}>Back to trips</Text>
          <TouchableOpacity onPress={() => setShowHistory((current) => !current)} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroDecisionTitle}>You've narrowed it down.</Text>
        <Text style={styles.body}>You've done the hard part. Now choose which trip deserves to happen next.</Text>

        {showHistory && (
          <VotingInbox
            sessions={ownedSessions}
            readCounts={comparisonReadCounts}
            loading={ownedSessionsLoading}
            onRefresh={onRefreshSessions}
            onOpenResults={onOpenSessionResults}
            onDeleteSession={onDeleteSession}
          />
        )}

        <DecisionShortlistPreview trips={selectedTrips} />

        <View style={styles.decidePanel}>
          <Text style={styles.decideLabel}>Choose your path</Text>
          <Text style={styles.decideTitle}>How do you want to choose?</Text>
          <Text style={styles.decideBody}>Decide privately, or invite people in when another perspective would help.</Text>
          <View style={styles.decideCards}>
            <DecisionChoiceCard
              icon="Me"
              badge="Private"
              title="Help Me Decide"
              body="Takes about one minute."
              action="Start"
              tone="private"
              disabled={selected.length < 2}
              onPress={startOwnComparison}
            />
            <DecisionChoiceCard
              icon="Friends"
              badge="Share with friends"
              title="Get Opinions"
              body="Share a link. Friends react. See what builds momentum."
              action="Create Share Link"
              tone="social"
              disabled={selected.length < 2}
              onPress={openShareCuration}
            />
          </View>
        </View>
        <ShareLinkModal preview={sharePreview} onClose={() => setSharePreview(undefined)} />
      </View>
    );
  }

  if (flowStep === 'intro') {
    return (
      <View>
        <Text style={styles.back} onPress={() => setFlowStep('decide')}>Back to decision</Text>
        <Text style={styles.heroDecisionTitle}>We'll compare your shortlist one decision at a time.</Text>
        <Text style={styles.body}>About 45 seconds. Private by default. No sharing unless you choose it.</Text>
        <DecisionShortlistPreview trips={selectedTrips} />
        <View style={styles.introCard}>
          <Text style={styles.introKicker}>What happens next</Text>
          <Text style={styles.introTitle}>You will answer a few quick feel-checks.</Text>
          <Text style={styles.introBody}>GoWandr uses your answers to show which trip has the strongest pull right now.</Text>
        </View>
        <Button label="Begin" onPress={beginOwnComparison} />
      </View>
    );
  }

  if (flowStep === 'curate') {
    return (
      <View>
        <Text style={styles.back} onPress={() => setFlowStep('decide')}>Back to decision</Text>
        <Text style={styles.title}>Choose what friends should see</Text>
        <Text style={styles.body}>Pick the highlights that make each trip easy to understand. You can keep this lightweight.</Text>

        <View style={styles.curationList}>
          {selectedTrips.map((trip) => (
            <View key={trip.id} style={styles.curationCard}>
              <View style={styles.curationTripHeader}>
                <ImageBackground source={{ uri: trip.heroImage }} style={styles.curationThumb} imageStyle={styles.curationThumbImage} />
                <View style={styles.curationTripCopy}>
                  <Text style={styles.curationTripTitle}>{trip.title}</Text>
                  <Text style={styles.curationTripMeta}>{getMetaChips(trip).join(' / ')}</Text>
                </View>
              </View>

              {trip.ideas.filter((idea) => idea.priority !== 'Skip').length ? (
                <View style={styles.highlightList}>
                  {trip.ideas.filter((idea) => idea.priority !== 'Skip').map((idea) => {
                    const active = includedHighlightIds.includes(idea.id);
                    return (
                      <TouchableOpacity key={idea.id} onPress={() => toggleHighlight(idea.id)} style={[styles.highlightChoice, active && styles.highlightChoiceActive]}>
                        <View style={[styles.highlightCheck, active && styles.highlightCheckActive]}>
                          <Text style={[styles.highlightCheckText, active && styles.highlightCheckTextActive]}>{active ? 'OK' : ''}</Text>
                        </View>
                        <View style={styles.highlightCopy}>
                          <Text style={styles.highlightTitle}>{idea.title}</Text>
                          <Text style={styles.highlightMeta}>{idea.category} / {idea.priority}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noHighlightsText}>No highlights yet. Friends will still see the trip title, photo, mood, and pace.</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.curationActions}>
          <Button
            label={shareState === 'creating' ? 'Creating link...' : 'Create Share Link'}
            disabled={shareState === 'creating'}
            onPress={createCuratedShareLink}
          />
          <TouchableOpacity onPress={() => setFlowStep('decide')} style={styles.textCancelButton}>
            <Text style={styles.textCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {shareState === 'missingConfig' && (
          <Text style={styles.shareConfigHint}>Shared links need Firebase running before friends can open the comparison.</Text>
        )}
        <ShareLinkModal preview={sharePreview} onClose={() => setSharePreview(undefined)} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back home</Text>
      <Text style={styles.title}>Choose Trips</Text>
      <Text style={styles.body}>Pick 2-4 trip drafts to compare.</Text>

      <SharedReadStatus
        sessions={ownedSessions}
        readCounts={comparisonReadCounts}
        loading={ownedSessionsLoading}
        onRefresh={onRefreshSessions}
        onOpenResults={onOpenSessionResults}
      />

      <View style={styles.searchBox}>
        <Text style={styles.searchText}>Search trip drafts</Text>
      </View>
      <View style={styles.filterRow}>
        {['All', 'Solo', 'Group', 'Ready'].map((filter) => (
          <View key={filter} style={styles.filterChip}>
            <Text style={styles.filterChipText}>{filter}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trips in the Running</Text>
        <Text style={styles.sectionCount}>{selectedTrips.length}/4</Text>
      </View>
      <View style={styles.list}>
        {selectedTrips.map((trip) => (
          <TripCompareCard key={trip.id} trip={trip} active onPress={() => toggleTrip(trip.id)} />
        ))}
      </View>

      {!!availableTrips.length && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>More Trip Ideas</Text>
            <Text style={styles.sectionCount}>{availableTrips.length}</Text>
          </View>
          <View style={styles.list}>
            {availableTrips.map((trip) => (
              <TripCompareCard key={trip.id} trip={trip} active={false} disabled={selected.length >= 4} onPress={() => toggleTrip(trip.id)} />
            ))}
          </View>
        </>
      )}

      <View style={styles.selectionBar}>
        <View style={styles.selectionCopy}>
          <Text style={styles.selectionCount}>{selectedTrips.length} {selectedTrips.length === 1 ? 'Trip' : 'Trips'} Selected</Text>
          <Text style={styles.selectionNames} numberOfLines={1}>{selectedTrips.length >= 2 ? `${selectedTrips.length} trips in your shortlist` : selectedTripNames || 'Choose at least two trip ideas.'}</Text>
        </View>
        <TouchableOpacity disabled={selectedTrips.length < 2} onPress={continueToDecision} style={[styles.continueButton, selectedTrips.length < 2 && styles.continueButtonDisabled]}>
          <Text style={styles.continueButtonText}>Continue &gt;</Text>
        </TouchableOpacity>
      </View>
      <ShareLinkModal preview={sharePreview} onClose={() => setSharePreview(undefined)} />
    </View>
  );
}

type SharePreviewState = {
  url: string;
  trips: TripDraft[];
  matchupName: string;
  previewOnly?: boolean;
};

function DecisionChoiceCard({
  icon,
  badge,
  title,
  body,
  action,
  tone,
  disabled,
  onPress,
}: {
  icon: string;
  badge: string;
  title: string;
  body: string;
  action: string;
  tone: 'private' | 'social';
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.decisionCard, tone === 'social' && styles.decisionCardSocial, disabled && styles.decisionCardDisabled]}>
      <View style={[styles.decisionIcon, tone === 'social' && styles.decisionIconSocial]}>
        {tone === 'social' ? (
          <View style={styles.peopleGlyph}>
            <View style={styles.peopleHeads}>
              <View style={styles.peopleHead} />
              <View style={[styles.peopleHead, styles.peopleHeadSmall]} />
            </View>
            <View style={styles.peopleBase} />
          </View>
        ) : (
          <Text style={styles.decisionIconText}>{icon}</Text>
        )}
      </View>
      <View style={styles.decisionCopy}>
        <Text style={styles.decisionBadge}>{badge}</Text>
        <Text style={styles.decisionTitle}>{title}</Text>
        <Text style={styles.decisionBody}>{body}</Text>
        <View style={[styles.decisionButton, tone === 'social' && styles.decisionButtonSocial]}>
          <Text style={[styles.decisionButtonText, tone === 'social' && styles.decisionButtonTextSocial]}>{action}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DecisionShortlistPreview({ trips, compact }: { trips: TripDraft[]; compact?: boolean }) {
  return (
    <View style={[styles.shortlistPreview, compact && styles.shortlistPreviewCompact]}>
      <View style={styles.shortlistHeader}>
        <Text style={styles.shortlistLabel}>Your shortlist</Text>
        <Text style={styles.shortlistCount}>{trips.length} contenders</Text>
      </View>
      {trips.map((trip) => (
        <ShortlistTripRow key={trip.id} trip={trip} compact={compact} />
      ))}
    </View>
  );
}

function ShortlistTripRow({ trip, compact }: { trip: TripDraft; compact?: boolean }) {
  const highlights = getTopHighlights(trip);
  return (
    <View style={[styles.shortlistTripRow, compact && styles.shortlistTripRowCompact]}>
      <ImageBackground source={{ uri: trip.heroImage }} style={[styles.shortlistThumb, compact && styles.shortlistThumbCompact]} imageStyle={styles.shortlistThumbImage} />
      <View style={styles.shortlistTripCopy}>
        <View style={styles.shortlistTripTop}>
          <Text style={styles.shortlistTripTitle} numberOfLines={1}>{trip.title}</Text>
          <Text style={styles.shortlistTripTheme} numberOfLines={1}>{getTripThemeLabel(trip)}</Text>
        </View>
        {!compact && !!highlights.length && (
          <Text style={styles.shortlistHighlights} numberOfLines={2}>{highlights.join(' / ')}</Text>
        )}
        {compact && (
          <Text style={styles.shortlistHighlightsCompact} numberOfLines={1}>{getMetaChips(trip).join(' / ')}</Text>
        )}
      </View>
    </View>
  );
}

function ShareLinkModal({ preview, onClose }: { preview?: SharePreviewState; onClose: () => void }) {
  const [shareStatus, setShareStatus] = useState<string | undefined>();
  const [sharingGraphic, setSharingGraphic] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const graphicRef = useRef<View>(null);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10 && Math.abs(gesture.dx) < 40,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 70) onClose();
      },
    }),
  ).current;
  if (!preview) return null;

  const copyLink = async () => {
    if (preview.previewOnly) return;
    await Clipboard.setStringAsync(preview.url);
    setShareStatus('Link copied.');
  };

  const shareLink = async () => {
    if (preview.previewOnly) return;
    await shareMatchupInvite(preview.matchupName, preview.trips, preview.url);
  };

  const shareGraphic = async () => {
    if (!graphicRef.current || sharingGraphic) return;
    setSharingGraphic(true);
    setShareStatus(undefined);
    try {
      const uri = await captureRef(graphicRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await shareImageFile(uri, 'Create GoWandr social card');
    } catch {
      setShareStatus('Could not prepare the graphic. Try sharing the link instead.');
    } finally {
      setSharingGraphic(false);
    }
  };

  const firstTrip = preview.trips[0];
  const tripNames = preview.trips.map((trip) => trip.title).slice(0, 3).join(' / ');
  const previewCta = 'Help Settle the Debate';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.modalSheet}>
          <View style={styles.modalTopBar} {...panResponder.panHandlers}>
            <View style={styles.modalHandle} />
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton} accessibilityLabel="Close share comparison">
              <Text style={styles.modalCloseText}>x</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <TouchableOpacity activeOpacity={0.92} onPress={() => setShowFullPreview(true)}>
              <View ref={graphicRef} collapsable={false} style={styles.shareCardCanvas}>
                <ImageBackground source={{ uri: firstTrip?.heroImage }} style={styles.shareGraphic} imageStyle={styles.shareGraphicImage}>
                  <View style={styles.shareGraphicShade} />
                  <View style={styles.shareLogoPill}>
                    <Image source={require('../../assets/brand/gowandr-logo-full-color.png')} style={styles.shareLogo} resizeMode="contain" />
                  </View>
                  <View style={styles.shareGraphicTop}>
                    <Text style={styles.shareGraphicKicker}>GOWANDR GET A READ</Text>
                    <Text style={styles.shareGraphicCount}>{preview.trips.length} trip ideas</Text>
                  </View>
                  <View style={styles.shareGraphicCopy}>
                    <Text style={styles.shareGraphicTitle}>Which trip pulls you most?</Text>
                    <Text style={styles.shareGraphicBody}>{tripNames}</Text>
                  </View>
                  <View style={styles.shareGraphicButton}>
                    <Text style={styles.shareGraphicButtonText}>{previewCta}</Text>
                  </View>
                </ImageBackground>
              </View>
            </TouchableOpacity>

            <View style={styles.liveLinkCard}>
              <Text style={styles.modalKicker}>Share comparison</Text>
              <Text style={styles.modalTitle}>Get people to help you decide.</Text>
              <Text style={styles.modalBody}>
                {preview.previewOnly
                  ? 'Firebase is not available in this build yet, so this link is only a preview.'
                  : "Share this comparison. Friends review the highlights and choose the trip they'd actually take."}
              </Text>
            </View>
            {!!shareStatus && <Text style={styles.modalStatus}>{shareStatus}</Text>}
            <View style={styles.modalActions}>
              <Button label={preview.previewOnly ? 'Link Needs Firebase' : 'Share Comparison'} disabled={preview.previewOnly} onPress={shareLink} />
              <TouchableOpacity disabled={preview.previewOnly} onPress={copyLink} style={[styles.copyLinkButton, preview.previewOnly && styles.copyLinkButtonDisabled]}>
                <Text style={[styles.copyLinkText, preview.previewOnly && styles.copyLinkTextDisabled]}>{preview.previewOnly ? 'Copy unavailable' : 'Copy Link'}</Text>
              </TouchableOpacity>
              <View style={styles.socialDivider} />
              <TouchableOpacity disabled={sharingGraphic} onPress={shareGraphic} style={styles.socialCardButton}>
                <Text style={styles.socialCardButtonTitle}>{sharingGraphic ? 'Preparing Social Card...' : 'Create Social Post'}</Text>
                <Text style={styles.socialCardButtonBody}>Optional: share the visual card to stories, group chats, or your feed.</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        <Modal visible={showFullPreview} transparent animationType="fade" onRequestClose={() => setShowFullPreview(false)}>
          <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.fullPreviewOverlay}>
            <TouchableOpacity onPress={() => setShowFullPreview(false)} style={styles.fullPreviewClose}>
              <Text style={styles.fullPreviewCloseText}>x</Text>
            </TouchableOpacity>
            <View pointerEvents="none" style={styles.fullPreviewCard}>
              <ImageBackground source={{ uri: firstTrip?.heroImage }} style={styles.fullPreviewGraphic} imageStyle={styles.shareGraphicImage}>
                <View style={styles.shareGraphicShade} />
                <View style={styles.shareLogoPill}>
                  <Image source={require('../../assets/brand/gowandr-logo-full-color.png')} style={styles.shareLogo} resizeMode="contain" />
                </View>
                <View style={styles.shareGraphicTop}>
                  <Text style={styles.shareGraphicKicker}>GOWANDR GET A READ</Text>
                  <Text style={styles.shareGraphicCount}>{preview.trips.length} trip ideas</Text>
                </View>
                <View style={styles.shareGraphicCopy}>
                  <Text style={styles.shareGraphicTitle}>Which trip pulls you most?</Text>
                  <Text style={styles.shareGraphicBody}>{tripNames}</Text>
                </View>
                <View style={styles.shareGraphicButton}>
                  <Text style={styles.shareGraphicButtonText}>{previewCta}</Text>
                </View>
              </ImageBackground>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function SharedReadStatus({
  sessions,
  readCounts,
  loading,
  onRefresh,
  onOpenResults,
}: {
  sessions: MatchupSession[];
  readCounts: Record<string, number>;
  loading: boolean;
  onRefresh: () => void;
  onOpenResults: (sessionId: string) => void;
}) {
  const sessionSummaries = sessions.map((session) => {
    const inputCount = getSessionInputCount(session);
    const readCount = readCounts[session.id] ?? 0;
    return { session, inputCount, unreadCount: Math.max(0, inputCount - readCount) };
  });
  const unreadSummary = sessionSummaries.find((item) => item.unreadCount > 0);
  const reviewedSummary = sessionSummaries.find((item) => item.inputCount > 0);
  const activeSummary = unreadSummary ?? reviewedSummary ?? sessionSummaries[0];
  const activeSession = activeSummary?.session;

  if (!activeSession && !loading) return null;

  const responseCount = activeSummary?.inputCount ?? 0;
  const unreadCount = activeSummary?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;
  const hasReviewedInput = responseCount > 0 && !hasUnread;

  return (
    <View style={[styles.sharedReadStatus, hasUnread && styles.sharedReadStatusActive, hasReviewedInput && styles.sharedReadStatusRead]}>
      <View style={styles.sharedReadCopy}>
        <Text style={styles.sharedReadLabel}>{hasUnread ? 'New input' : hasReviewedInput ? 'Read' : 'Shared reads'}</Text>
        <Text style={styles.sharedReadTitle}>
          {hasUnread
            ? `${unreadCount} new ${unreadCount === 1 ? 'response' : 'responses'} waiting`
            : hasReviewedInput
              ? 'Results reviewed'
              : loading
                ? 'Checking for friend input...'
                : 'Waiting for responses'}
        </Text>
        <Text style={styles.sharedReadBody}>
          {hasUnread
            ? 'Open the results to see which trip is building momentum.'
            : hasReviewedInput
              ? 'You are caught up. Open the results anytime.'
              : 'Friend feedback will appear here automatically after someone answers.'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={activeSession && (hasUnread || hasReviewedInput) ? () => onOpenResults(activeSession.id) : onRefresh}
        style={[styles.sharedReadButton, hasUnread && styles.sharedReadButtonActive, hasReviewedInput && styles.sharedReadButtonRead]}
      >
        <Text style={[styles.sharedReadButtonText, hasUnread && styles.sharedReadButtonTextActive]}>
          {hasUnread ? 'Review' : hasReviewedInput ? 'View' : 'Refresh'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function VotingInbox({
  sessions,
  readCounts,
  loading,
  onRefresh,
  onOpenResults,
  onDeleteSession,
}: {
  sessions: MatchupSession[];
  readCounts: Record<string, number>;
  loading: boolean;
  onRefresh: () => void;
  onOpenResults: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  if (!sessions.length && !loading) {
    return (
      <View style={styles.inboxEmpty}>
        <View style={styles.inboxHeader}>
          <View>
            <Text style={styles.inboxLabel}>Shared reads</Text>
            <Text style={styles.inboxTitle}>No saved reads yet</Text>
          </View>
        </View>
        <Text style={styles.inboxBody}>Create a working share link to save a comparison here. Previewing it yourself does not create a saved read.</Text>
      </View>
    );
  }

  return (
    <View style={styles.inbox}>
      <View style={styles.inboxHeader}>
        <View>
          <Text style={styles.inboxLabel}>Shared reads</Text>
          <Text style={styles.inboxTitle}>{loading ? 'Checking for input...' : `${sessions.length} shared ${sessions.length === 1 ? 'read' : 'reads'}`}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshPill}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inboxList}>
        {sessions.slice(0, 3).map((session) => (
          <VotingInboxCard
            key={session.id}
            session={session}
            readCount={readCounts[session.id] ?? 0}
            onOpenResults={() => onOpenResults(session.id)}
            onDelete={() => onDeleteSession(session.id)}
          />
        ))}
      </View>
    </View>
  );
}

function VotingInboxCard({ session, readCount, onOpenResults, onDelete }: { session: MatchupSession; readCount: number; onOpenResults: () => void; onDelete: () => void }) {
  const voteBatches = session.votes ?? [];
  const responses = session.responses ?? [];
  const votes = voteBatches.flat();
  const inputCount = getSessionInputCount(session);
  const unreadCount = Math.max(0, inputCount - readCount);
  const hasUnread = unreadCount > 0;
  const hasReadInput = inputCount > 0 && !hasUnread;
  const hasInput = inputCount > 0;
  const results = hasInput ? scoreMatchup(session.trips, votes) : [];
  const responseLeader = getResponseLeader(session);
  const leader = responseLeader ?? results[0];
  const updated = formatSessionDate(session.updatedAt);
  const confidence = leader ? Math.max(62, Math.min(94, Math.round(72 + ('score' in leader ? leader.score / 8 : 10)))) : 0;
  const shareResults = () => {
    if (!leader) return;
    if ('score' in leader) shareMatchupResult(session.matchupName, leader, confidence, explainResult(results));
    else shareMatchupResult(session.matchupName, { trip: leader.trip, score: leader.count, excitement: leader.count, easyYes: leader.count, commitment: leader.count, dealbreakers: 0 }, confidence, `${leader.trip.title} has the strongest momentum right now.`);
  };
  const confirmDelete = () => {
    Alert.alert('Delete comparison?', 'This removes the saved comparison and its responses from your inbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.inboxCard}>
      <View style={styles.inboxCardTop}>
        <View style={styles.inboxCardCopy}>
          <Text style={styles.inboxCardTitle}>{session.matchupName}</Text>
          <Text style={styles.inboxCardMeta}>{inputCount} {inputCount === 1 ? 'response' : 'responses'} / updated {updated}</Text>
          <Text style={[styles.inboxCardStatus, hasUnread && styles.inboxCardStatusNew, hasReadInput && styles.inboxCardStatusRead]}>
            {hasUnread ? `${unreadCount} new` : hasReadInput ? 'Read' : 'No input yet'}
          </Text>
        </View>
        <View style={[styles.responseBadge, hasInput && styles.responseBadgeActive, hasReadInput && styles.responseBadgeRead]}>
          <Text style={styles.responseBadgeText}>{hasUnread ? unreadCount : inputCount}</Text>
        </View>
      </View>
      <Text style={styles.inboxCardBody}>{leader ? `${leader.trip.title} has the strongest momentum right now.` : 'Waiting for the first response.'}</Text>
      <View style={styles.inboxActions}>
        <TouchableOpacity onPress={onOpenResults} style={styles.resultsButton}>
          <Text style={styles.resultsButtonText}>{hasUnread ? 'Review input' : hasReadInput ? 'View results' : 'Open details'}</Text>
        </TouchableOpacity>
        {hasInput && (
          <TouchableOpacity onPress={shareResults} style={styles.secondaryInboxButton}>
            <Text style={styles.secondaryInboxButtonText}>Share</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteSessionButton}>
          <Text style={styles.deleteSessionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getResponseLeader(session: MatchupSession) {
  const responses = session.responses ?? [];
  if (!responses.length) return undefined;
  const trips = session.trips;
  const counts = new Map<string, number>();
  responses.forEach((response) => counts.set(response.selectedTripId, (counts.get(response.selectedTripId) ?? 0) + 1));
  const sorted = trips
    .map((trip) => ({ trip, count: counts.get(trip.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  return sorted[0]?.count ? sorted[0] : undefined;
}

function getSessionInputCount(session?: MatchupSession) {
  if (!session) return 0;
  return (session.responses?.length ?? 0) || (session.votes?.length ?? 0);
}

function TripCompareCard({ trip, active, disabled, onPress }: { trip: TripDraft; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={disabled && !active} key={trip.id} onPress={onPress} style={[styles.tripRow, active && styles.tripRowActive, disabled && !active && styles.tripRowDisabled]}>
      <ImageBackground source={{ uri: trip.heroImage }} style={styles.thumb} imageStyle={styles.thumbImage}>
        {active && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkBadgeText}>OK</Text>
          </View>
        )}
      </ImageBackground>
      <View style={styles.rowCopy}>
        <Text style={styles.tripTitle}>{trip.title}</Text>
        <View style={styles.metaChips}>
          {getMetaChips(trip).map((chip) => (
            <View key={chip} style={styles.metaChip}>
              <Text style={styles.metaChipText}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.check, active && styles.checkActive]}>{active ? 'Included' : selectedActionLabel(disabled)}</Text>
    </TouchableOpacity>
  );
}

function selectedActionLabel(disabled?: boolean) {
  return disabled ? 'Max 4' : '+ Compare';
}

function getMetaChips(trip: TripDraft) {
  const tags = trip.tags.map((tag) => tag.toLowerCase());
  const chips = [
    tags.includes('beach') ? 'Beach' : tags.includes('food') ? 'Food' : tags.includes('culture') ? 'Culture' : tags.includes('relax') ? 'Reset' : tags.includes('nightlife') ? 'Nightlife' : capitalize(trip.tags[0] ?? 'Travel'),
    trip.pace,
  ];
  return chips.slice(0, 3);
}

function getTripThemeLabel(trip: TripDraft) {
  const tags = trip.tags.map((tag) => tag.toLowerCase());
  if (tags.includes('food')) return 'Food escape';
  if (tags.includes('beach')) return 'Beach weekend';
  if (tags.includes('nightlife')) return 'Night out';
  if (tags.includes('culture')) return 'Culture trip';
  if (tags.includes('relax')) return 'Reset trip';
  return `${trip.pace} trip`;
}

function getTopHighlights(trip: TripDraft) {
  return trip.ideas
    .filter((idea) => idea.priority !== 'Skip')
    .slice(0, 3)
    .map((idea) => idea.title);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  back: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', paddingVertical: 10 },
  title: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 36, lineHeight: 43, letterSpacing: -0.4 },
  body: { color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 22 },
  sharedReadStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 18 },
  sharedReadStatusActive: { backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.36)', borderColor: 'rgba(47,175,138,0.28)', shadowColor: '#2FAF8A', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  sharedReadStatusRead: { backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderColor: 'rgba(47,175,138,0.14)' },
  sharedReadCopy: { flex: 1 },
  sharedReadLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  sharedReadTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 20, lineHeight: 24, letterSpacing: -0.18 },
  sharedReadBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  sharedReadButton: { minHeight: 44, borderRadius: 16, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  sharedReadButtonActive: { backgroundColor: '#2FAF8A', borderColor: '#2FAF8A' },
  sharedReadButtonRead: { backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.22)', borderColor: 'rgba(47,175,138,0.16)' },
  sharedReadButtonText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  sharedReadButtonTextActive: { color: colors.white },
  inbox: { borderRadius: 26, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3, marginBottom: 22 },
  inboxEmpty: { borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.64)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', marginBottom: 22 },
  inboxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inboxLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  inboxTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 20, lineHeight: 25, marginTop: 4, letterSpacing: -0.2 },
  inboxBody: { color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 10 },
  refreshPill: { minHeight: 38, borderRadius: 19, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.44)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.16)' },
  refreshText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  inboxList: { gap: 10, marginTop: 14 },
  inboxCard: { borderRadius: 20, padding: 14, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  inboxCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  inboxCardCopy: { flex: 1 },
  inboxCardTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 17, letterSpacing: -0.12 },
  inboxCardMeta: { color: colors.muted, fontFamily: font.body, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  inboxCardStatus: { ...androidTextReset, color: colors.muted, fontFamily: font.semibold, fontWeight: '700', fontSize: 12, marginTop: 7 },
  inboxCardStatusNew: { color: colors.tealDark },
  inboxCardStatusRead: { color: 'rgba(32,38,35,0.52)' },
  responseBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(32,38,35,0.06)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  responseBadgeActive: { backgroundColor: '#A8F0D4', borderColor: 'rgba(47,175,138,0.22)' },
  responseBadgeRead: { backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.22)', borderColor: 'rgba(47,175,138,0.14)' },
  responseBadgeText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 14 },
  inboxCardBody: { color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 10 },
  inboxActions: { gap: 8, marginTop: 12 },
  resultsButton: { minHeight: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4' },
  resultsButtonText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 13 },
  secondaryInboxButton: { minHeight: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  secondaryInboxButtonText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13 },
  deleteSessionButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  deleteSessionText: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '600', fontSize: 13 },
  readyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  historyButton: { minHeight: 38, borderRadius: 19, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  historyButtonText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13 },
  heroDecisionTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 40, lineHeight: 45, letterSpacing: -0.5, marginTop: 2 },
  preparingScreen: { minHeight: 560, justifyContent: 'center' },
  preparingCard: { borderRadius: 32, padding: 22, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.90)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  preparingLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginBottom: 14 },
  preparingBody: { color: colors.muted, fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 14, textAlign: 'center' },
  searchBox: { minHeight: 50, borderRadius: 19, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 12 },
  searchText: { ...androidTextReset, color: 'rgba(32,38,35,0.48)', fontFamily: font.body, fontSize: 15 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  filterChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  filterChipText: { ...androidTextReset, color: colors.muted, fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  shortlistPreview: { borderRadius: 30, padding: 18, gap: 10, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.90)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4, marginBottom: 22 },
  shortlistPreviewCompact: { marginBottom: 0, shadowOpacity: 0, backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.20)' },
  shortlistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(32,38,35,0.08)' },
  shortlistLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  shortlistCount: { color: colors.muted, fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  shortlistTripRow: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(32,38,35,0.06)' },
  shortlistTripRowCompact: { minHeight: 72, paddingVertical: 6 },
  shortlistThumb: { width: 104, height: 78, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(32,38,35,0.08)' },
  shortlistThumbCompact: { width: 76, height: 54, borderRadius: 17 },
  shortlistThumbImage: { borderRadius: 20 },
  shortlistTripCopy: { flex: 1 },
  shortlistTripTop: { gap: 4 },
  shortlistTripTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },
  shortlistTripTheme: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  shortlistHighlights: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontFamily: font.body, fontSize: 13, lineHeight: 19, marginTop: 8 },
  shortlistHighlightsCompact: { color: colors.muted, fontFamily: font.semibold, fontWeight: '600', fontSize: 12.5, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 20, letterSpacing: -0.2 },
  sectionCount: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
  tripRow: { width: '48%', minHeight: 196, gap: 11, padding: 10, borderRadius: 24, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.055, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  tripRowActive: { borderWidth: 2, borderColor: '#2FAF8A', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.92)', shadowColor: '#2FAF8A', shadowOpacity: 0.14, shadowRadius: 16, elevation: 4 },
  tripRowDisabled: { opacity: 0.48 },
  thumb: { width: '100%', height: 98, borderRadius: 17, overflow: 'hidden' },
  thumbImage: { borderRadius: 17 },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)' },
  checkBadgeText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 10 },
  rowCopy: { flex: 1 },
  tripTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16, lineHeight: 20, letterSpacing: -0.12 },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  metaChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.30)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.12)' },
  metaChipText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 10.5 },
  check: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  checkActive: { color: '#137D68' },
  decidePanel: { borderRadius: 28, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4, marginBottom: 14 },
  decideLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  decideTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 24, lineHeight: 29, letterSpacing: -0.24, marginTop: 5 },
  decideBody: { color: colors.muted, fontFamily: font.body, fontSize: 14.5, lineHeight: 21, marginTop: 5, marginBottom: 14 },
  decideCards: { gap: 12 },
  decisionCard: { minHeight: 150, borderRadius: 24, padding: 16, flexDirection: 'row', gap: 13, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.94)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  decisionCardSocial: { backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.22)', borderColor: 'rgba(47,175,138,0.18)' },
  decisionCardDisabled: { opacity: 0.48 },
  decisionIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,240,212,0.52)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.14)' },
  decisionIconSocial: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  decisionIconText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  peopleGlyph: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  peopleHeads: { width: 24, height: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  peopleHead: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  peopleHeadSmall: { width: 8, height: 8, borderRadius: 4, marginLeft: -2, opacity: 0.82 },
  peopleBase: { width: 23, height: 9, borderRadius: 9, backgroundColor: colors.white, marginTop: 1, opacity: 0.92 },
  decisionCopy: { flex: 1 },
  decisionBadge: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 10.5, textTransform: 'uppercase', marginBottom: 5 },
  decisionTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 19, lineHeight: 23, letterSpacing: -0.16 },
  decisionBody: { color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 5 },
  decisionAction: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13.5, marginTop: 11 },
  decisionButton: { alignSelf: 'stretch', minHeight: 48, borderRadius: 17, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', marginTop: 15, backgroundColor: '#A8F0D4', borderWidth: 1, borderColor: 'rgba(47,175,138,0.16)' },
  decisionButtonSocial: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  decisionButtonText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  decisionButtonTextSocial: { color: colors.white },
  pastReadsLink: { minHeight: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: -4, marginBottom: 14 },
  pastReadsLinkText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13 },
  introCard: { borderRadius: 26, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  introKicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  introTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 22, lineHeight: 27, letterSpacing: -0.2, marginTop: 6 },
  introBody: { color: colors.muted, fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 7 },
  selectionBar: { borderRadius: 26, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6, marginTop: 4, marginBottom: 28 },
  selectionCopy: { flex: 1 },
  selectionCount: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16, letterSpacing: -0.1 },
  selectionNames: { color: colors.muted, fontFamily: font.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  continueButton: { minHeight: 50, borderRadius: 18, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2FAF8A' },
  continueButtonDisabled: { opacity: 0.42 },
  continueButtonText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '800', fontSize: 14 },
  curationList: { gap: 14, marginBottom: 18 },
  curationCard: { borderRadius: 26, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  curationTripHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  curationThumb: { width: 88, height: 64, borderRadius: 16, overflow: 'hidden' },
  curationThumbImage: { borderRadius: 16 },
  curationTripCopy: { flex: 1 },
  curationTripTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 18, lineHeight: 23, letterSpacing: -0.14 },
  curationTripMeta: { color: colors.muted, fontFamily: font.semibold, fontWeight: '600', fontSize: 12.5, marginTop: 3 },
  highlightList: { gap: 9 },
  highlightChoice: { minHeight: 58, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  highlightChoiceActive: { backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.34)', borderColor: 'rgba(47,175,138,0.26)' },
  highlightCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(32,38,35,0.05)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  highlightCheckActive: { backgroundColor: '#2FAF8A', borderColor: '#2FAF8A' },
  highlightCheckText: { ...androidTextReset, color: 'transparent', fontFamily: font.semibold, fontWeight: '800', fontSize: 9 },
  highlightCheckTextActive: { color: colors.white },
  highlightCopy: { flex: 1 },
  highlightTitle: { color: colors.charcoal, fontFamily: font.semibold, fontWeight: '700', fontSize: 14.5 },
  highlightMeta: { color: colors.muted, fontFamily: font.body, fontSize: 12, marginTop: 3 },
  noHighlightsText: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19 },
  curationActions: { gap: 10, marginBottom: 12 },
  textCancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textCancelButtonText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 14 },
  sharePreview: { backgroundColor: colors.charcoal, borderRadius: 26, padding: 20, marginBottom: 14 },
  previewLabel: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  previewTitle: { color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 24, marginTop: 5 },
  previewBody: { color: 'rgba(248,248,246,0.80)', fontFamily: font.body, fontWeight: '400', fontSize: 14, lineHeight: 21, marginTop: 8 },
  compareHint: { color: colors.muted, fontFamily: font.semibold, fontWeight: '600', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  shareConfigHint: { ...androidTextReset, color: colors.tealDark, fontFamily: font.body, fontWeight: '500', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: -2, marginBottom: 10 },
  actions: { gap: 10, marginBottom: 28 },
  emptyState: { borderRadius: 26, padding: 20, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginTop: 16 },
  emptyTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 22 },
  emptyBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,17,21,0.42)', justifyContent: 'flex-end', paddingHorizontal: 12 },
  modalSheet: { maxHeight: '94%', maxWidth: 520, width: '100%', alignSelf: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.98)', borderWidth: 1, borderColor: Platform.OS === 'android' ? 'rgba(32,38,35,0.08)' : 'rgba(255,255,255,0.82)', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  modalTopBar: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalHandle: { width: 54, height: 5, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.18)' },
  modalCloseButton: { position: 'absolute', right: 0, top: 3, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  modalCloseText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 22, lineHeight: 24 },
  modalScrollContent: { paddingBottom: 18 },
  liveLinkCard: { borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 12 },
  liveIcon: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4', marginBottom: 13 },
  liveIconText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  modalKicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  shareCardCanvas: { backgroundColor: '#E4F8F0', borderRadius: 28, overflow: 'hidden', marginBottom: 14 },
  shareGraphic: { minHeight: 500, justifyContent: 'space-between', borderRadius: 28, overflow: 'hidden', padding: 18 },
  shareGraphicImage: { borderRadius: 28 },
  shareGraphicShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)' },
  shareLogoPill: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: Platform.OS === 'android' ? 'rgba(32,38,35,0.06)' : 'rgba(255,255,255,0.74)' },
  shareLogo: { width: 112, height: 28 },
  shareGraphicTop: { marginTop: 36 },
  shareGraphicKicker: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  shareGraphicCount: { ...androidTextReset, color: 'rgba(255,255,255,0.88)', fontFamily: font.body, fontWeight: '500', fontSize: 14, marginTop: 6 },
  shareGraphicCopy: { marginTop: 'auto', marginBottom: 18 },
  shareGraphicTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 42, lineHeight: 46, letterSpacing: -0.6, textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  shareGraphicBody: { ...androidTextReset, color: 'rgba(255,255,255,0.88)', fontFamily: font.body, fontWeight: '500', fontSize: 16, lineHeight: 22, marginTop: 12 },
  shareGraphicButton: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: '#A8F0D4' },
  shareGraphicButtonText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '800', fontSize: 15 },
  modalTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 23, lineHeight: 28, letterSpacing: -0.2, marginTop: 5 },
  modalBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14.5, lineHeight: 21, marginTop: 7 },
  modalStatus: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 2, marginBottom: 8 },
  modalActions: { gap: 8, marginTop: 4 },
  copyLinkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  copyLinkButtonDisabled: { opacity: 0.45 },
  copyLinkText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 14 },
  copyLinkTextDisabled: { color: 'rgba(32,38,35,0.46)' },
  socialDivider: { height: 1, backgroundColor: 'rgba(32,38,35,0.08)', marginVertical: 6 },
  socialCardButton: { borderRadius: 20, padding: 15, backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.18)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.15)' },
  socialCardButtonTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 17 },
  socialCardButtonBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  fullPreviewOverlay: { flex: 1, backgroundColor: 'rgba(15,17,21,0.86)', padding: 18, justifyContent: 'center' },
  fullPreviewClose: { position: 'absolute', top: 18, right: 18, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#202623' : 'rgba(255,255,255,0.16)', zIndex: 2 },
  fullPreviewCloseText: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 24, lineHeight: 26 },
  fullPreviewCard: { maxWidth: 420, width: '100%', alignSelf: 'center', borderRadius: 30, overflow: 'hidden' },
  fullPreviewGraphic: { minHeight: 620, justifyContent: 'space-between', borderRadius: 30, overflow: 'hidden', padding: 20 },
  closeModalButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeModalText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 14 },
});
