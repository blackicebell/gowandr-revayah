import React, { useMemo, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import { Button } from '../components/Button';
import { getSourceLabel } from '../components/SourceThumbnail';
import { starterPhotos } from '../data/starterPhotos';
import { getMomentumStatus } from '../logic/momentum';
import { getPaceHealth, paceGuidance } from '../logic/tripPace';
import { androidTextReset, font, useThemeColors } from '../theme/colors';
import { TripDraft, TripIdea } from '../types';
import { isUnlabeledIdea } from '../utils/ideaLabels';
import { shareImageFile, shareTripCard } from '../utils/shareCards';

const sharePromptOptions = [
  'Would you make this the move?',
  'Help me decide: is this trip worth planning?',
  'Would you pick this trip?',
  'Should this be the next getaway?',
];

type DetailTab = 'overview' | 'explore';
type ExploreFilter = 'All' | 'Highlights' | 'Food' | 'Places' | 'Videos' | 'Notes';

export function EchoDetailScreen({ trip, onBack, onAddIdea, onEditTrip, onDeleteTrip, onEditIdea, onDeleteIdea, onCompare, onMoveToPlan }: { trip: TripDraft; onBack: () => void; onAddIdea: () => void; onEditTrip: () => void; onDeleteTrip: () => void; onEditIdea: (ideaId: string) => void; onDeleteIdea: (idea: TripIdea) => void; onCompare: () => void; onMoveToPlan: () => void }) {
  const colors = useThemeColors();
  const heroImage = trip.heroImage || starterPhotos[0]?.uri || '';
  const momentumStatus = getMomentumStatus(trip);
  const paceHealth = getPaceHealth(trip);
  const mustDos = trip.ideas.filter((idea) => idea.priority === 'Must-do');
  const readyToCommit = mustDos.length >= 3 || trip.ideas.length >= 4;
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>('All');
  const [selectedIdea, setSelectedIdea] = useState<TripIdea | undefined>();
  const [showShareComposer, setShowShareComposer] = useState(false);
  const [sharePhotoUri, setSharePhotoUri] = useState(heroImage);
  const [sharePrompt, setSharePrompt] = useState(sharePromptOptions[0]);
  const fade = useRef(new Animated.Value(0)).current;
  const exploreFilters = useMemo(() => getExploreFilters(trip.ideas), [trip.ideas]);
  const filteredIdeas = useMemo(() => filterIdeas(trip.ideas, exploreFilter), [exploreFilter, trip.ideas]);

  React.useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [fade]);

  React.useEffect(() => {
    setSharePhotoUri(heroImage);
    setShowShareComposer(false);
    setActiveTab('overview');
    setExploreFilter('All');
    setSelectedIdea(undefined);
  }, [heroImage, trip.id]);

  const surpriseMe = () => {
    const ideas = filteredIdeas.length ? filteredIdeas : trip.ideas;
    if (!ideas.length) {
      onAddIdea();
      return;
    }
    setSelectedIdea(ideas[Math.floor(Math.random() * ideas.length)]);
  };

  return (
    <Animated.View style={[styles.screen, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={[styles.backText, { color: '#137D68', fontFamily: font.semibold }]}>Back to Trip Ideas</Text>
      </TouchableOpacity>
      <ImageBackground source={{ uri: heroImage }} style={[styles.hero, { borderColor: colors.line }]} imageStyle={styles.heroImage}>
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}>
          <Text style={[styles.title, { fontFamily: font.heading }]}>{trip.title}</Text>
          <Text style={[styles.subtitle, { fontFamily: font.body }]}>{getHeroStory(trip)}</Text>
        </View>
      </ImageBackground>

      <View style={styles.detailTabs}>
        {(['overview', 'explore'] as DetailTab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.detailTab, active && styles.detailTabActive]}>
              <Text style={[styles.detailTabText, active && styles.detailTabTextActive, { fontFamily: font.semibold }]}>{tab === 'overview' ? 'Overview' : 'Explore'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'overview' ? (
        <>
          <View style={styles.momentumCard}>
            <View style={styles.momentumTop}>
              <View style={styles.momentumCopy}>
                <Text style={[styles.cardKicker, { fontFamily: font.semibold }]}>Next step</Text>
                <Text style={[styles.momentumTitle, { fontFamily: font.heading }]}>{getNextStepTitle(trip, mustDos.length)}</Text>
              </View>
              <View style={styles.momentumBadge}>
                <Text style={[styles.momentumBadgeText, { fontFamily: font.heading }]}>{getMomentumBadge(momentumStatus, mustDos.length)}</Text>
              </View>
            </View>
            <Text style={[styles.momentumBody, { fontFamily: font.body }]}>{getNextStepBody(trip, mustDos.length)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (Math.min(3, mustDos.length) / 3) * 100)}%` }]} />
            </View>
            <Text style={[styles.progressText, { fontFamily: font.semibold }]}>{Math.min(3, mustDos.length)} of 3 highlights chosen</Text>
          </View>

          {!trip.ideas.length && <DraftStarterCard onAddIdea={onAddIdea} />}
          {!!trip.ideas.length && trip.ideas.length < 3 && <TripStrengthCue savedCount={trip.ideas.length} onAddIdea={onAddIdea} />}
          {trip.ideas.length >= 3 && <CompareReadyCard onCompare={onCompare} />}

          {mustDos.length > 0 && (
            <View style={styles.pinnedCard}>
              <View style={styles.pinnedHeader}>
                <View>
                  <Text style={[styles.cardKicker, { fontFamily: font.semibold }]}>Pinned highlights</Text>
                  <Text style={[styles.pinnedTitle, { fontFamily: font.heading }]}>What this trip is about</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('explore')} style={styles.pinnedExploreButton}>
                  <Text style={[styles.pinnedExploreText, { fontFamily: font.semibold }]}>Explore</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedScroll}>
                {mustDos.slice(0, 5).map((idea) => (
                  <TouchableOpacity key={idea.id} onPress={() => setSelectedIdea(idea)} style={styles.pinnedPill}>
                    <Text style={[styles.pinnedPillCategory, { fontFamily: font.semibold }]}>{idea.category}</Text>
                    <Text numberOfLines={2} style={[styles.pinnedPillTitle, { fontFamily: font.heading }]}>{idea.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.glanceCard}>
            <Text style={[styles.cardKicker, { fontFamily: font.semibold }]}>Trip at a glance</Text>
            <View style={styles.glanceGrid}>
              <GlanceItem icon="01" label="Mood" value={getTripMood(trip)} />
              <GlanceItem icon="02" label="Who" value={trip.companionType} />
              <GlanceItem icon="03" label="Pace" value={trip.pace} />
              <GlanceItem icon="04" label="Progress" value={getShortStatus(momentumStatus)} />
            </View>
          </View>

          <LinearGradient colors={['rgba(255,255,255,0.84)', 'rgba(226,248,240,0.88)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.paceCard}>
            <View style={styles.paceHeader}>
              <View style={styles.paceIcon}>
                <Text style={styles.paceIconText}>{getPaceIcon(trip.pace)}</Text>
              </View>
              <View style={styles.paceCopy}>
                <Text style={[styles.paceLabel, { fontFamily: font.semibold }]}>Trip pace</Text>
                <Text style={[styles.paceTitle, { fontFamily: font.heading }]}>{trip.pace}: {paceGuidance[trip.pace].short}</Text>
              </View>
            </View>
            <PaceMeter pace={trip.pace} />
            <Text style={[styles.paceBody, { fontFamily: font.body }]}>{paceHealth.message}</Text>
          </LinearGradient>

          <View style={styles.whyCard}>
            <Text style={[styles.cardKicker, { fontFamily: font.semibold }]}>Why this trip?</Text>
            {getWhyThisTrip(trip).map((reason) => (
              <View key={reason} style={styles.reasonRow}>
                <View style={styles.reasonDot}>
                  <Text style={[styles.reasonCheck, { fontFamily: font.semibold }]}>OK</Text>
                </View>
                <Text style={[styles.reasonText, { fontFamily: font.body }]}>{reason}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Button label="Add Links or Ideas" onPress={onAddIdea} />
            {readyToCommit && (
              <View style={styles.commitCard}>
                <Text style={[styles.commitTitle, { fontFamily: font.heading }]}>Ready to make this your trip?</Text>
                <Text style={[styles.commitBody, { fontFamily: font.body }]}>You have enough saved ideas to move from maybe to momentum.</Text>
                <Button label={`Commit to ${trip.title}`} variant="secondary" onPress={onMoveToPlan} />
              </View>
            )}
            {trip.ideas.length >= 2 && <Button label="Compare Trips" variant="secondary" onPress={onCompare} />}
            {!!trip.ideas.length && <Button label="Share Trip Card" variant="secondary" onPress={() => setShowShareComposer(true)} />}
            <TouchableOpacity style={styles.editTripLink} onPress={onEditTrip}>
              <Text style={[styles.editTripText, { fontFamily: font.semibold }]}>Edit trip details</Text>
            </TouchableOpacity>
          </View>
          {trip.latestMatchupResult && (
            <View style={styles.voteSummaryCard}>
              <Text style={[styles.voteSummaryLabel, { fontFamily: font.semibold }]}>Latest compare</Text>
              <Text style={[styles.voteSummaryTitle, { fontFamily: font.heading }]}>{trip.latestMatchupResult.groupMatch}% decision confidence</Text>
              <Text style={[styles.voteSummaryBody, { fontFamily: font.body }]}>{trip.latestMatchupResult.summary}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.manageDeleteButton} onPress={onDeleteTrip}>
            <Text style={[styles.manageDeleteText, { fontFamily: font.semibold }]}>Delete Trip</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.exploreWrap}>
          <View style={styles.exploreHeader}>
            <View style={styles.exploreHeaderCopy}>
              <Text style={[styles.sectionTitle, { fontFamily: font.heading }]}>Explore</Text>
              <Text style={[styles.sectionHint, { fontFamily: font.body }]}>{trip.ideas.length} saved {trip.ideas.length === 1 ? 'link or idea' : 'links and ideas'} to rediscover.</Text>
            </View>
            <TouchableOpacity onPress={surpriseMe} style={styles.surpriseButton}>
              <Text style={[styles.surpriseText, { fontFamily: font.semibold }]}>Surprise me</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {exploreFilters.map((filter) => {
              const active = exploreFilter === filter;
              return (
                <TouchableOpacity key={filter} onPress={() => setExploreFilter(filter)} style={[styles.filterChip, active && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive, { fontFamily: font.semibold }]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {mustDos.length > 0 && (
            <View style={styles.explorePinned}>
              <Text style={[styles.cardKicker, { fontFamily: font.semibold }]}>Pinned</Text>
              <View style={styles.explorePinnedList}>
                {mustDos.slice(0, 3).map((idea) => (
                  <TouchableOpacity key={idea.id} style={styles.explorePinnedItem} onPress={() => setSelectedIdea(idea)}>
                    <Text numberOfLines={1} style={[styles.explorePinnedTitle, { fontFamily: font.semibold }]}>{idea.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {filteredIdeas.length ? (
            <View style={styles.moodboardGrid}>
              {filteredIdeas.map((idea, index) => (
                <ExploreTile key={idea.id} idea={idea} index={index} onPress={() => setSelectedIdea(idea)} />
              ))}
            </View>
          ) : (
            <EmptyExplore filter={exploreFilter} onAddIdea={onAddIdea} />
          )}
          <TouchableOpacity style={styles.addExploreButton} onPress={onAddIdea}>
            <Text style={[styles.addExploreText, { fontFamily: font.semibold }]}>Add links or ideas</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={showShareComposer} transparent animationType="fade" onRequestClose={() => setShowShareComposer(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalSheet}>
              <ShareTripComposer
                trip={trip}
                photoUri={sharePhotoUri}
                prompt={sharePrompt}
                onSelectPhoto={setSharePhotoUri}
                onSelectPrompt={setSharePrompt}
                onShare={() => shareTripCard(trip, sharePhotoUri, sharePrompt)}
                onClose={() => setShowShareComposer(false)}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
      <IdeaViewerModal
        idea={selectedIdea}
        onClose={() => setSelectedIdea(undefined)}
        onEdit={(ideaId) => {
          setSelectedIdea(undefined);
          onEditIdea(ideaId);
        }}
        onDelete={(idea) => {
          setSelectedIdea(undefined);
          onDeleteIdea(idea);
        }}
      />
    </Animated.View>
  );
}

function DraftStarterCard({ onAddIdea }: { onAddIdea: () => void }) {
  return (
    <View style={styles.guidanceCard}>
      <Text style={[styles.guidanceKicker, { fontFamily: font.semibold }]}>Start here</Text>
      <Text style={[styles.guidanceTitle, { fontFamily: font.heading }]}>Add the links that made you want this trip.</Text>
      <Text style={[styles.guidanceBody, { fontFamily: font.body }]}>TikToks, Reels, YouTube videos, restaurants, hotels, notes. Save the spark first, clean it up later.</Text>
      <Button label="Add first link" onPress={onAddIdea} />
    </View>
  );
}

function TripStrengthCue({ savedCount, onAddIdea }: { savedCount: number; onAddIdea: () => void }) {
  const remaining = Math.max(1, 3 - savedCount);
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onAddIdea} style={styles.strengthCue}>
      <View style={styles.strengthCopy}>
        <Text style={[styles.strengthKicker, { fontFamily: font.semibold }]}>Trip strength</Text>
        <Text style={[styles.strengthTitle, { fontFamily: font.heading }]}>Add {remaining} more {remaining === 1 ? 'save' : 'saves'} before comparing.</Text>
        <Text style={[styles.strengthBody, { fontFamily: font.body }]}>A few saved links make this easier to judge against another trip.</Text>
      </View>
      <View style={styles.strengthAction}>
        <Text style={[styles.strengthActionText, { fontFamily: font.semibold }]}>Add</Text>
      </View>
    </TouchableOpacity>
  );
}

function CompareReadyCard({ onCompare }: { onCompare: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onCompare} style={styles.compareReadyCard}>
      <Text style={[styles.compareReadyKicker, { fontFamily: font.semibold }]}>Ready to compare</Text>
      <Text style={[styles.compareReadyTitle, { fontFamily: font.heading }]}>This trip has enough saved ideas to test against another option.</Text>
      <View style={styles.compareReadyButton}>
        <Text style={[styles.compareReadyButtonText, { fontFamily: font.semibold }]}>Compare trips</Text>
      </View>
    </TouchableOpacity>
  );
}

function GlanceItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.glanceItem}>
      <View style={styles.glanceIcon}>
        <Text style={[styles.glanceIconText, { fontFamily: font.semibold }]}>{icon}</Text>
      </View>
      <View style={styles.glanceCopy}>
        <Text style={[styles.glanceLabel, { fontFamily: font.semibold }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.glanceValue, { fontFamily: font.heading }]}>{value}</Text>
      </View>
    </View>
  );
}

function ExploreTile({ idea, index, onPress }: { idea: TripIdea; index: number; onPress: () => void }) {
  const height = getTileHeight(index, idea);
  const needsLabel = isUnlabeledIdea(idea);
  const content = (
    <>
      <LinearGradient colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.66)']} style={StyleSheet.absoluteFill} />
      <View style={styles.exploreTileTop}>
        <View style={[styles.exploreTileBadge, idea.priority === 'Must-do' && styles.exploreTileBadgePinned]}>
          <Text style={[styles.exploreTileBadgeText, idea.priority === 'Must-do' && styles.exploreTileBadgeTextPinned, { fontFamily: font.semibold }]}>{idea.priority === 'Must-do' ? 'Pinned' : getSourceLabel(idea.link)}</Text>
        </View>
      </View>
      <View style={styles.exploreTileCopy}>
        <Text style={[styles.exploreTileCategory, { fontFamily: font.semibold }]}>{idea.category}</Text>
        <Text numberOfLines={3} style={[styles.exploreTileTitle, needsLabel && styles.exploreTileTitleUnlabeled, { fontFamily: font.heading }]}>{idea.title}</Text>
        {needsLabel && <Text style={[styles.exploreTileNeedsLabel, { fontFamily: font.semibold }]}>Add label</Text>}
        {!!idea.note && <Text numberOfLines={2} style={[styles.exploreTileNote, { fontFamily: font.body }]}>{idea.note}</Text>}
      </View>
    </>
  );

  if (idea.imageUrl) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.exploreTile, { height }]}>
        <ImageBackground source={{ uri: idea.imageUrl }} style={styles.exploreTileImage} imageStyle={styles.exploreTileImageRadius}>
          {content}
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.exploreTile, { height }]}>
      <LinearGradient colors={getIdeaGradient(idea)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exploreTileFallback}>
        <View style={styles.exploreTileMotifOne} />
        <View style={styles.exploreTileMotifTwo} />
        <Image source={require('../../assets/brand/gowandr-logo-icon-color.png')} style={styles.exploreTileWatermark} resizeMode="contain" />
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function EmptyExplore({ filter, onAddIdea }: { filter: ExploreFilter; onAddIdea: () => void }) {
  return (
    <View style={styles.emptyExplore}>
      <Text style={[styles.emptyExploreTitle, { fontFamily: font.heading }]}>Nothing in {filter.toLowerCase()} yet.</Text>
      <Text style={[styles.emptyExploreBody, { fontFamily: font.body }]}>Save a TikTok, Reel, YouTube video, restaurant, or note that brings this trip back to life.</Text>
      <View style={styles.exampleRow}>
        {['Restaurant', 'Video', 'Photo spot', 'Note'].map((item) => (
          <View key={item} style={styles.examplePill}>
            <Text style={[styles.exampleText, { fontFamily: font.semibold }]}>{item}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.emptyAction} onPress={onAddIdea}>
        <Text style={[styles.emptyActionText, { fontFamily: font.semibold }]}>Add links or ideas</Text>
      </TouchableOpacity>
    </View>
  );
}

function IdeaViewerModal({ idea, onClose, onEdit, onDelete }: { idea?: TripIdea; onClose: () => void; onEdit: (ideaId: string) => void; onDelete: (idea: TripIdea) => void }) {
  const hasLink = !!idea?.link?.trim();

  return (
    <Modal visible={!!idea} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerBackdrop}>
        {idea && (
          <View style={styles.viewerSheet}>
            <TouchableOpacity onPress={onClose} style={styles.viewerClose}>
              <Text style={[styles.viewerCloseText, { fontFamily: font.semibold }]}>Close</Text>
            </TouchableOpacity>
            {idea.imageUrl ? (
              <ImageBackground source={{ uri: idea.imageUrl }} style={styles.viewerHero} imageStyle={styles.viewerHeroImage}>
                <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
                <ViewerCopy idea={idea} />
              </ImageBackground>
            ) : (
              <LinearGradient colors={getIdeaGradient(idea)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewerHero}>
                <View style={styles.exploreTileMotifOne} />
                <View style={styles.exploreTileMotifTwo} />
                <Image source={require('../../assets/brand/gowandr-logo-icon-color.png')} style={styles.viewerWatermark} resizeMode="contain" />
                <LinearGradient colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.68)']} style={StyleSheet.absoluteFill} />
                <ViewerCopy idea={idea} />
              </LinearGradient>
            )}
            <View style={styles.viewerActions}>
              {hasLink && <Button label="Open Saved Link" onPress={() => openIdeaLink(idea.link)} />}
              <Button label="Edit or Make Highlight" variant="secondary" onPress={() => onEdit(idea.id)} />
              <TouchableOpacity style={styles.viewerDeleteButton} onPress={() => onDelete(idea)}>
                <Text style={[styles.viewerDeleteText, { fontFamily: font.semibold }]}>Delete saved idea</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function ViewerCopy({ idea }: { idea: TripIdea }) {
  const needsLabel = isUnlabeledIdea(idea);
  return (
    <View style={styles.viewerCopy}>
      <View style={styles.viewerMetaRow}>
        <Text style={[styles.viewerCategory, { fontFamily: font.semibold }]}>{idea.category}</Text>
        <Text style={[styles.viewerSource, { fontFamily: font.semibold }]}>{getSourceLabel(idea.link)}</Text>
      </View>
      <Text style={[styles.viewerTitle, needsLabel && styles.viewerTitleUnlabeled, { fontFamily: font.heading }]}>{idea.title}</Text>
      {needsLabel && <Text style={[styles.viewerNeedsLabel, { fontFamily: font.semibold }]}>Add a clear label so this is easier to remember later.</Text>}
      {!!idea.note && <Text style={[styles.viewerNote, { fontFamily: font.body }]}>{idea.note}</Text>}
    </View>
  );
}

function ShareTripComposer({
  trip,
  photoUri,
  prompt,
  onSelectPhoto,
  onSelectPrompt,
  onShare,
  onClose,
}: {
  trip: TripDraft;
  photoUri: string;
  prompt: string;
  onSelectPhoto: (uri: string) => void;
  onSelectPrompt: (prompt: string) => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const photoOptions = uniquePhotoOptions([{ id: 'current', uri: trip.heroImage }, ...starterPhotos.map((photo) => ({ id: photo.id, uri: photo.uri }))]);
  const topIdeas = trip.ideas.filter((idea) => idea.priority === 'Must-do').slice(0, 3);
  const shareCardRef = useRef<View>(null);
  const [sharingGraphic, setSharingGraphic] = useState(false);

  const shareGraphic = async () => {
    if (!shareCardRef.current || sharingGraphic) return;
    setSharingGraphic(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await shareImageFile(uri, 'Share GoWandr trip card');
    } catch {
      await onShare();
    } finally {
      setSharingGraphic(false);
    }
  };

  return (
    <View style={styles.shareComposer}>
      <Text style={[styles.shareComposerKicker, { fontFamily: font.semibold }]}>Share card</Text>
      <Text style={[styles.shareComposerTitle, { fontFamily: font.heading }]}>Choose the photo people will see.</Text>
      <View ref={shareCardRef} collapsable={false} style={styles.sharePreviewCapture}>
        <ImageBackground source={{ uri: photoUri }} style={styles.sharePreview} imageStyle={styles.sharePreviewImage}>
          <LinearGradient colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.78)']} style={StyleSheet.absoluteFill} />
          <View style={styles.shareBrandPill}>
            <Image source={require('../../assets/brand/gowandr-logo-full-color.png')} style={styles.shareBrandLogo} resizeMode="contain" />
          </View>
          <View style={styles.sharePreviewCopy}>
            <Text style={[styles.sharePreviewTitle, { fontFamily: font.heading }]}>{trip.title}</Text>
            <Text style={[styles.sharePreviewBody, { fontFamily: font.body }]}>{trip.subtitle}</Text>
            <View style={styles.shareIdeaList}>
            <Text style={[styles.shareIdeaLabel, { fontFamily: font.semibold }]}>Top highlights</Text>
              {(topIdeas.length ? topIdeas : trip.ideas.slice(0, 2)).slice(0, 3).map((idea, index) => (
                <Text key={idea.id} style={[styles.shareIdeaText, { fontFamily: font.semibold }]}>{index + 1}. {idea.title}</Text>
              ))}
            </View>
            <View style={styles.sharePreviewCta}>
              <Text style={[styles.sharePreviewCtaText, { fontFamily: font.semibold }]}>{prompt}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
      <View style={styles.sharePromptSection}>
        <Text style={[styles.sharePhotoTitle, { fontFamily: font.heading }]}>Choose the prompt</Text>
        <Text style={[styles.sharePhotoHint, { fontFamily: font.body }]}>This is the line people react to when they see the card.</Text>
        <View style={styles.sharePromptGrid}>
          {sharePromptOptions.map((option) => {
            const active = option === prompt;
            return (
              <TouchableOpacity key={option} onPress={() => onSelectPrompt(option)} style={[styles.sharePromptOption, active && styles.sharePromptOptionActive]}>
                <Text style={[styles.sharePromptOptionText, active && styles.sharePromptOptionTextActive, { fontFamily: font.semibold }]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.sharePhotoHeader}>
        <Text style={[styles.sharePhotoTitle, { fontFamily: font.heading }]}>Choose share photo</Text>
        <Text style={[styles.sharePhotoHint, { fontFamily: font.body }]}>This only changes the card you share.</Text>
      </View>
      <View style={styles.sharePhotoGrid}>
        {photoOptions.map((photo, index) => {
          const active = photo.uri === photoUri;
          return (
            <TouchableOpacity key={`${photo.id}-${index}`} onPress={() => onSelectPhoto(photo.uri)} style={[styles.sharePhotoOption, active && styles.sharePhotoOptionActive]}>
              <ImageBackground source={{ uri: photo.uri }} style={styles.sharePhotoThumb} imageStyle={styles.sharePhotoThumbImage}>
                <LinearGradient colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.42)']} style={StyleSheet.absoluteFill} />
                {active && <View style={styles.sharePhotoCheck}><Text style={styles.sharePhotoCheckText}>Selected</Text></View>}
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.shareComposerActions}>
        <Button label={sharingGraphic ? 'Preparing Card...' : 'Share Card'} disabled={sharingGraphic} onPress={shareGraphic} />
        <Button label="Close Preview" variant="secondary" onPress={onClose} />
      </View>
    </View>
  );
}

function uniquePhotoOptions(options: { id: string; uri: string }[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.uri)) return false;
    seen.add(option.uri);
    return true;
  });
}

function PaceMeter({ pace }: { pace: TripDraft['pace'] }) {
  const activeIndex = pace === 'Relaxed' ? 0 : pace === 'Balanced' ? 1 : 2;
  return (
    <View style={styles.paceMeter}>
      {['Slow', 'Balanced', 'Fast'].map((label, index) => (
        <View key={label} style={styles.paceMeterItem}>
          <View style={[styles.paceMeterBar, index <= activeIndex && styles.paceMeterBarActive]} />
          <Text style={[styles.paceMeterText, index === activeIndex && styles.paceMeterTextActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function getPaceIcon(pace: TripDraft['pace']) {
  if (pace === 'Relaxed') return '~';
  if (pace === 'Packed') return '>>';
  return '=';
}

function getExploreFilters(ideas: TripIdea[]): ExploreFilter[] {
  const filters: ExploreFilter[] = ['All', 'Highlights'];
  if (ideas.some((idea) => idea.category === 'Food')) filters.push('Food');
  if (ideas.some((idea) => ['Stay', 'Beach', 'Culture', 'Adventure', 'Shopping', 'Photo Spot', 'Relax', 'Other'].includes(idea.category))) filters.push('Places');
  if (ideas.some((idea) => isVideoSource(idea.link))) filters.push('Videos');
  if (ideas.some((idea) => !idea.link?.trim() || !!idea.note?.trim())) filters.push('Notes');
  return filters;
}

function filterIdeas(ideas: TripIdea[], filter: ExploreFilter) {
  if (filter === 'All') return ideas;
  if (filter === 'Highlights') return ideas.filter((idea) => idea.priority === 'Must-do');
  if (filter === 'Food') return ideas.filter((idea) => idea.category === 'Food');
  if (filter === 'Places') return ideas.filter((idea) => ['Stay', 'Beach', 'Culture', 'Adventure', 'Shopping', 'Photo Spot', 'Relax', 'Other'].includes(idea.category));
  if (filter === 'Videos') return ideas.filter((idea) => isVideoSource(idea.link));
  return ideas.filter((idea) => !idea.link?.trim() || !!idea.note?.trim());
}

function isVideoSource(link?: string) {
  const value = link?.toLowerCase() ?? '';
  return value.includes('tiktok.com') || value.includes('youtube.com') || value.includes('youtu.be') || value.includes('instagram.com');
}

function getTileHeight(index: number, idea: TripIdea) {
  if (idea.priority === 'Must-do') return index % 2 === 0 ? 244 : 216;
  const cycle = [196, 228, 184, 238];
  return cycle[index % cycle.length];
}

function getIdeaGradient(idea: TripIdea): [string, string, string] {
  if (idea.category === 'Food') return ['#FFFDF7', '#E5F8F0', '#F6E6C8'];
  if (idea.category === 'Nightlife') return ['#F8FFFC', '#DDF6EC', '#DDE7FF'];
  if (idea.category === 'Photo Spot') return ['#FCFFFE', '#DDF6EC', '#E5F0FF'];
  return ['#FEFFFE', '#E4F8F0', '#D7F3E9'];
}

async function openIdeaLink(link?: string) {
  if (!link?.trim()) return;
  const url = normalizeUrl(link);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  } catch {
    // Saved links should never break the viewer if the device refuses to open one.
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getTripMood(trip: TripDraft) {
  const tags = trip.tags.map((tag) => tag.toLowerCase());
  if (tags.includes('food')) return 'Food';
  if (tags.includes('nightlife') || tags.includes('celebration')) return 'Celebrate';
  if (tags.includes('romantic')) return 'Romance';
  if (tags.includes('relax') || tags.includes('low-key')) return 'Reset';
  if (tags.includes('adventure')) return 'Adventure';
  if (tags.includes('culture')) return 'Explore';
  return 'Travel';
}

function getHeroStory(trip: TripDraft) {
  const mood = getTripMood(trip).toLowerCase();
  const pace = trip.pace.toLowerCase();
  const who = trip.companionType.toLowerCase();
  if (trip.ideas.length) {
    const anchors = trip.ideas
      .filter((idea) => idea.priority === 'Must-do')
      .slice(0, 2)
      .map((idea) => idea.title.toLowerCase());
    if (anchors.length) return `Built around ${anchors.join(' and ')}, with a ${pace} pace for ${who}.`;
  }
  return `A ${pace}, ${mood}-focused idea for ${who}, ready for the moments that make it worth choosing.`;
}

function getNextStepTitle(trip: TripDraft, highlightCount: number) {
  if (highlightCount <= 0) return 'Add your first highlight.';
  if (highlightCount < 3) return `Add ${3 - highlightCount} more ${3 - highlightCount === 1 ? 'highlight' : 'highlights'}.`;
  if (trip.ideas.length < 4) return 'This trip is taking shape.';
  return 'Ready to compare or commit.';
}

function getNextStepBody(trip: TripDraft, highlightCount: number) {
  if (highlightCount <= 0) return 'This trip becomes easier to compare once you choose the moments that actually define it.';
  if (highlightCount < 3) return 'Pick the places, saves, or notes that make this trip feel different from the others.';
  if (trip.ideas.length < 4) return 'You have enough anchors to remember why this trip matters. A few more supporting ideas can make the decision easier.';
  return 'You have enough saved ideas to compare it against other trip drafts or move it into the plan.';
}

function getMomentumBadge(status: string, highlightCount: number) {
  if (status.includes('Committed') || status.includes('Preparing')) return 'Plan';
  if (highlightCount >= 3 || status.includes('Ready') || status.includes('Strong')) return 'Ready';
  return `${Math.min(2, highlightCount)}/3`;
}

function getShortStatus(status: string) {
  if (status.includes('Committed')) return 'Committed';
  if (status.includes('Ready') || status.includes('Strong')) return 'Ready';
  if (status.includes('Taking')) return 'Shaping';
  if (status.includes('Started')) return 'Started';
  return status;
}

function getWhyThisTrip(trip: TripDraft) {
  const reasons = [];
  const mood = getTripMood(trip).toLowerCase();
  reasons.push(`${capitalize(mood)} is the mood you chose.`);
  reasons.push(`${trip.pace} pace fits how this trip should feel.`);
  if (trip.companionType === 'Solo') reasons.push('It starts as your own decision, with room to share later.');
  else reasons.push(`${trip.companionType} can weigh in before the plan gets serious.`);
  if (trip.ideas.length) reasons.push(`${trip.ideas.length} saved ${trip.ideas.length === 1 ? 'idea' : 'ideas'} already point toward why this could work.`);
  else reasons.push('The next saved link or note will make the trip feel more real.');
  return reasons.slice(0, 4);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { gap: 18 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 2 },
  backText: { ...androidTextReset, fontWeight: '800', fontSize: 14 },
  hero: { minHeight: 340, justifyContent: 'flex-end', borderRadius: 30, overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  heroImage: { borderRadius: 30 },
  heroCopy: { padding: 24 },
  title: { color: '#F8F8F6', fontWeight: '700', fontSize: 41, lineHeight: 49, letterSpacing: -0.41, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 23, marginTop: 8, fontWeight: '500' },
  detailTabs: { flexDirection: 'row', minHeight: 54, padding: 5, borderRadius: 20, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  detailTab: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailTabActive: { backgroundColor: '#CFF8E9' },
  detailTabText: { ...androidTextReset, color: 'rgba(32,38,35,0.56)', fontSize: 14, fontWeight: '700' },
  detailTabTextActive: { color: '#0F1115' },
  momentumCard: { gap: 13, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', borderRadius: 26, padding: 22, borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  momentumTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  momentumCopy: { flex: 1 },
  cardKicker: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.2 },
  momentumTitle: { ...androidTextReset, color: '#202623', fontWeight: '800', fontSize: 22, lineHeight: 27, marginTop: 6, letterSpacing: -0.22 },
  momentumBadge: { minWidth: 74, minHeight: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#2FAF8A', shadowColor: '#2FAF8A', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  momentumBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  momentumBody: { ...androidTextReset, color: 'rgba(32,38,35,0.68)', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.07)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#2FAF8A' },
  progressText: { ...androidTextReset, color: '#137D68', fontSize: 12, fontWeight: '700' },
  guidanceCard: { gap: 11, borderRadius: 26, padding: 20, backgroundColor: Platform.OS === 'android' ? '#10231D' : 'rgba(16,35,29,0.96)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.18)', shadowColor: '#000', shadowOpacity: 0.11, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  guidanceKicker: { ...androidTextReset, color: '#A8F0D4', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  guidanceTitle: { ...androidTextReset, color: '#F8F8F6', fontWeight: '800', fontSize: 22, lineHeight: 27, letterSpacing: -0.22 },
  guidanceBody: { ...androidTextReset, color: 'rgba(248,248,246,0.74)', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  strengthCue: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, padding: 17, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.16)', shadowColor: '#173A33', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  strengthCopy: { flex: 1, minWidth: 0 },
  strengthKicker: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 10.5, textTransform: 'uppercase' },
  strengthTitle: { ...androidTextReset, color: '#202623', fontWeight: '800', fontSize: 18, lineHeight: 23, marginTop: 5 },
  strengthBody: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  strengthAction: { minHeight: 40, minWidth: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4' },
  strengthActionText: { ...androidTextReset, color: '#173A33', fontWeight: '800', fontSize: 12.5 },
  compareReadyCard: { gap: 9, borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.28)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.2)' },
  compareReadyKicker: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  compareReadyTitle: { ...androidTextReset, color: '#173A33', fontWeight: '800', fontSize: 18, lineHeight: 23 },
  compareReadyButton: { alignSelf: 'flex-start', marginTop: 3, minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#10231D' },
  compareReadyButtonText: { ...androidTextReset, color: '#A8F0D4', fontWeight: '800', fontSize: 12.5 },
  pinnedCard: { gap: 14, borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#10231D' : 'rgba(16,35,29,0.96)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.16)', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  pinnedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pinnedTitle: { ...androidTextReset, color: '#F8F8F6', fontWeight: '800', fontSize: 20, lineHeight: 25, marginTop: 5, letterSpacing: -0.2 },
  pinnedExploreButton: { minHeight: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#A8F0D4' },
  pinnedExploreText: { ...androidTextReset, color: '#173A33', fontSize: 12, fontWeight: '800' },
  pinnedScroll: { gap: 10, paddingRight: 4 },
  pinnedPill: { width: 146, minHeight: 86, borderRadius: 18, padding: 13, justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.18)' },
  pinnedPillCategory: { ...androidTextReset, color: '#A8F0D4', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  pinnedPillTitle: { ...androidTextReset, color: '#F8F8F6', fontSize: 16, lineHeight: 19, fontWeight: '800', letterSpacing: -0.16 },
  glanceCard: { borderRadius: 26, padding: 20, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  glanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  glanceItem: { width: '48%', minHeight: 78, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.24)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.14)' },
  glanceIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#137D68', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', shadowColor: '#137D68', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  glanceIconText: { ...androidTextReset, color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  glanceCopy: { flex: 1 },
  glanceLabel: { color: '#137D68', fontWeight: '800', fontSize: 10, textTransform: 'uppercase' },
  glanceValue: { color: '#202623', fontWeight: '800', fontSize: 15, marginTop: 4, letterSpacing: -0.15 },
  whyCard: { gap: 12, borderRadius: 26, padding: 20, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reasonDot: { width: 36, height: 36, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4' },
  reasonCheck: { color: '#137D68', fontSize: 11, fontWeight: '800' },
  reasonText: { flex: 1, color: 'rgba(32,38,35,0.72)', fontSize: 15, lineHeight: 21, fontWeight: '500' },
  paceCard: { borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  paceHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  paceIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,38,35,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.52)' },
  paceIconText: { ...androidTextReset, color: '#FFFFFF', fontFamily: font.semibold, fontWeight: '600', fontSize: 18 },
  paceCopy: { flex: 1 },
  paceLabel: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  paceTitle: { ...androidTextReset, color: '#202623', fontWeight: '700', fontSize: 17, lineHeight: 22, marginTop: 4, letterSpacing: -0.17 },
  paceBody: { ...androidTextReset, color: 'rgba(32,38,35,0.66)', fontSize: 14, lineHeight: 20, marginTop: 12 },
  paceMeter: { flexDirection: 'row', gap: 8, marginTop: 14 },
  paceMeterItem: { flex: 1 },
  paceMeterBar: { height: 5, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.08)' },
  paceMeterBarActive: { backgroundColor: '#6ED8B5' },
  paceMeterText: { ...androidTextReset, color: 'rgba(32,38,35,0.48)', fontFamily: font.semibold, fontSize: 10, fontWeight: '600', marginTop: 6 },
  paceMeterTextActive: { color: '#137D68' },
  actions: { gap: 10, marginVertical: 2 },
  commitCard: { gap: 10, borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.16)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  commitTitle: { ...androidTextReset, color: '#202623', fontWeight: '800', fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  commitBody: { ...androidTextReset, color: 'rgba(32,38,35,0.66)', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  editTripLink: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  editTripText: { ...androidTextReset, color: '#137D68', fontSize: 14, fontWeight: '700' },
  exploreWrap: { gap: 14 },
  exploreHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginTop: 2 },
  exploreHeaderCopy: { flex: 1 },
  surpriseButton: { minHeight: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#10231D', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  surpriseText: { ...androidTextReset, color: '#A8F0D4', fontSize: 12, fontWeight: '800' },
  filterScroll: { gap: 8, paddingRight: 8 },
  filterChip: { minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  filterChipActive: { backgroundColor: '#CFF8E9', borderColor: 'rgba(47,175,138,0.26)' },
  filterChipText: { ...androidTextReset, color: 'rgba(32,38,35,0.58)', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#137D68' },
  explorePinned: { gap: 10, borderRadius: 22, padding: 15, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  explorePinnedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  explorePinnedItem: { maxWidth: '100%', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#10231D' },
  explorePinnedTitle: { ...androidTextReset, color: '#F8F8F6', fontSize: 12, fontWeight: '700' },
  moodboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', rowGap: 12 },
  exploreTile: { width: '48%', minWidth: 148, borderRadius: 24, overflow: 'hidden', backgroundColor: '#10231D', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  exploreTileImage: { flex: 1, justifyContent: 'space-between' },
  exploreTileImageRadius: { borderRadius: 23 },
  exploreTileFallback: { flex: 1, justifyContent: 'space-between', overflow: 'hidden' },
  exploreTileTop: { alignItems: 'flex-start', padding: 10 },
  exploreTileBadge: { maxWidth: '100%', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  exploreTileBadgePinned: { backgroundColor: '#A8F0D4', borderColor: 'rgba(47,175,138,0.25)' },
  exploreTileBadgeText: { ...androidTextReset, color: '#26302C', fontSize: 10, fontWeight: '800' },
  exploreTileBadgeTextPinned: { color: '#137D68' },
  exploreTileCopy: { padding: 13, marginTop: 'auto' },
  exploreTileCategory: { ...androidTextReset, color: '#F4D06F', fontWeight: '800', fontSize: 10, textTransform: 'uppercase' },
  exploreTileTitle: { ...androidTextReset, color: '#F8F8F6', fontWeight: '800', fontSize: 18, lineHeight: 22, marginTop: 6, letterSpacing: -0.18 },
  exploreTileTitleUnlabeled: { color: 'rgba(248,248,246,0.68)' },
  exploreTileNeedsLabel: { ...androidTextReset, alignSelf: 'flex-start', color: '#A8F0D4', fontSize: 10.5, fontWeight: '800', marginTop: 7, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(5,18,15,0.5)', overflow: 'hidden' },
  exploreTileNote: { ...androidTextReset, color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 17, marginTop: 6, fontWeight: '500' },
  exploreTileMotifOne: { position: 'absolute', width: 180, height: 1, right: -42, top: 48, backgroundColor: 'rgba(19,125,104,0.16)', transform: [{ rotate: '-22deg' }] },
  exploreTileMotifTwo: { position: 'absolute', width: 144, height: 1, left: -44, bottom: 64, backgroundColor: 'rgba(19,125,104,0.12)', transform: [{ rotate: '-22deg' }] },
  exploreTileWatermark: { position: 'absolute', right: 12, bottom: 64, width: 78, height: 78, opacity: 0.14 },
  addExploreButton: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6ED8B5', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)', marginTop: 2 },
  addExploreText: { ...androidTextReset, color: '#173A33', fontSize: 15, fontWeight: '800' },
  sectionHeader: { gap: 10, marginTop: 8 },
  sectionTitle: { color: '#202623', fontWeight: '800', fontSize: 25, letterSpacing: -0.25 },
  sectionHint: { color: 'rgba(32,38,35,0.62)', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  sectionDivider: { height: 1, backgroundColor: 'rgba(32,38,35,0.08)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  emptyExplore: { gap: 13, borderRadius: 26, padding: 20, marginBottom: 6, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  emptyExploreTitle: { color: '#202623', fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.2 },
  emptyExploreBody: { color: 'rgba(32,38,35,0.66)', fontSize: 14, lineHeight: 21, fontWeight: '500' },
  emptyHighlights: { gap: 13, borderRadius: 26, padding: 20, marginBottom: 6, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  emptyHighlightsTitle: { color: '#202623', fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.2 },
  emptyHighlightsBody: { color: 'rgba(32,38,35,0.66)', fontSize: 14, lineHeight: 21, fontWeight: '500' },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  examplePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.34)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.14)' },
  exampleText: { ...androidTextReset, color: '#137D68', fontSize: 12, fontWeight: '700' },
  emptyAction: { minHeight: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)' },
  emptyActionText: { ...androidTextReset, color: '#173A33', fontSize: 14, fontWeight: '800' },
  manageDeleteButton: { alignSelf: 'center', minHeight: 34, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginTop: -2, marginBottom: 4 },
  manageDeleteText: { ...androidTextReset, color: '#B84A3F', fontSize: 13, fontWeight: '600' },
  voteSummaryCard: { borderRadius: 22, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  voteSummaryLabel: { ...androidTextReset, color: '#137D68', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  voteSummaryTitle: { ...androidTextReset, color: '#202623', fontSize: 20, fontWeight: '700', marginTop: 5, letterSpacing: -0.2 },
  voteSummaryBody: { ...androidTextReset, color: 'rgba(32,38,35,0.66)', fontSize: 14, lineHeight: 20, marginTop: 6 },
  viewerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,14,12,0.72)', paddingTop: 42, paddingBottom: 22 },
  viewerSheet: { width: '90%', maxWidth: 500, alignSelf: 'center', borderRadius: 28, padding: 10, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  viewerClose: { alignSelf: 'flex-end', minHeight: 34, justifyContent: 'center', paddingHorizontal: 10 },
  viewerCloseText: { ...androidTextReset, color: '#137D68', fontSize: 13, fontWeight: '800' },
  viewerHero: { minHeight: 270, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#10231D' },
  viewerHeroImage: { borderRadius: 24 },
  viewerWatermark: { position: 'absolute', right: 20, top: 52, width: 150, height: 150, opacity: 0.14 },
  viewerCopy: { padding: 18 },
  viewerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  viewerCategory: { ...androidTextReset, color: '#F4D06F', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  viewerSource: { ...androidTextReset, color: '#A8F0D4', fontSize: 11, fontWeight: '800' },
  viewerTitle: { ...androidTextReset, color: '#F8F8F6', fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.28, textShadowColor: 'rgba(0,0,0,0.30)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  viewerTitleUnlabeled: { color: 'rgba(248,248,246,0.74)' },
  viewerNeedsLabel: { ...androidTextReset, color: '#A8F0D4', fontSize: 12, lineHeight: 17, marginTop: 8, fontWeight: '800' },
  viewerNote: { ...androidTextReset, color: 'rgba(255,255,255,0.84)', fontSize: 14, lineHeight: 20, marginTop: 8, fontWeight: '500' },
  viewerActions: { gap: 10, paddingTop: 12 },
  viewerDeleteButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  viewerDeleteText: { ...androidTextReset, color: '#B84A3F', fontSize: 13, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,18,16,0.36)', paddingHorizontal: 20, paddingTop: 84, paddingBottom: 24 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 8 },
  modalSheet: { maxWidth: 520, width: '100%', alignSelf: 'center' },
  shareComposer: { backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.96)', borderRadius: 26, padding: 18, borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  shareComposerKicker: { ...androidTextReset, color: '#137D68', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  shareComposerTitle: { ...androidTextReset, color: '#202623', fontWeight: '800', fontSize: 20, lineHeight: 25, marginTop: 5, marginBottom: 14, letterSpacing: -0.2 },
  sharePreviewCapture: { marginBottom: 18, backgroundColor: '#06120F', borderRadius: 28, overflow: 'hidden' },
  sharePreview: { minHeight: 390, borderRadius: 28, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  sharePreviewImage: { borderRadius: 26 },
  shareBrandPill: { alignSelf: 'flex-start', margin: 18, width: 126, height: 42, borderRadius: 999, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  shareBrandLogo: { width: 102, height: 24 },
  sharePreviewCopy: { padding: 20, gap: 10 },
  sharePreviewTitle: { color: '#F8F8F6', fontWeight: '800', fontSize: 36, lineHeight: 41, letterSpacing: -0.36, textShadowColor: 'rgba(0,0,0,0.48)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  sharePreviewBody: { color: 'rgba(248,248,246,0.92)', fontSize: 15, lineHeight: 22, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.32)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  shareIdeaList: { marginTop: 4, gap: 6, borderRadius: 18, padding: 14, backgroundColor: 'rgba(5,18,15,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  shareIdeaLabel: { color: '#A8F0D4', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 1 },
  shareIdeaText: { color: '#F8F8F6', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  sharePreviewCta: { minHeight: 48, borderRadius: 999, backgroundColor: '#A8F0D4', alignItems: 'center', justifyContent: 'center', marginTop: 4, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sharePreviewCtaText: { ...androidTextReset, color: '#173A33', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  sharePromptSection: { marginBottom: 14 },
  sharePromptGrid: { gap: 8, marginTop: 10 },
  sharePromptOption: { minHeight: 44, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10, justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  sharePromptOptionActive: { backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.42)', borderColor: 'rgba(47,175,138,0.34)' },
  sharePromptOptionText: { ...androidTextReset, color: 'rgba(32,38,35,0.74)', fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  sharePromptOptionTextActive: { color: '#137D68' },
  sharePhotoHeader: { marginBottom: 10 },
  sharePhotoTitle: { color: '#202623', fontSize: 15, fontWeight: '800', letterSpacing: -0.15 },
  sharePhotoHint: { color: 'rgba(32,38,35,0.62)', fontSize: 13, lineHeight: 18, marginTop: 3, fontWeight: '500' },
  sharePhotoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sharePhotoOption: { width: '31%', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(32,38,35,0.06)', overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.6)' },
  sharePhotoOptionActive: { borderColor: '#2FAF8A' },
  sharePhotoThumb: { height: 82, justifyContent: 'flex-end' },
  sharePhotoThumbImage: { borderRadius: 14 },
  sharePhotoCheck: { alignSelf: 'flex-start', margin: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.92)' },
  sharePhotoCheckText: { ...androidTextReset, color: '#137D68', fontFamily: font.semibold, fontWeight: '600', fontSize: 10 },
  shareComposerActions: { gap: 10, marginTop: 14 },
});
