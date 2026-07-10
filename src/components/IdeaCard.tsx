import React, { useRef } from 'react';
import { Animated, ImageBackground, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { androidTextReset, font, useThemeColors } from '../theme/colors';
import { TripIdea } from '../types';
import { PressableScale } from './PressableScale';
import { SourceThumbnail, getSourceLabel } from './SourceThumbnail';
import { isUnlabeledIdea } from '../utils/ideaLabels';

export function IdeaCard({ idea, onEdit, onDelete }: { idea: TripIdea; onEdit?: () => void; onDelete?: () => void }) {
  const colors = useThemeColors();
  const hasLink = !!idea.link?.trim();
  const needsLabel = isUnlabeledIdea(idea);
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const fadeInImage = () => {
    Animated.timing(imageOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };

  const openLink = async () => {
    if (!idea.link?.trim()) return;
    const url = normalizeUrl(idea.link);

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch {
      // Keep the card quiet if the device cannot open the saved link.
    }
  };

  return (
    <PressableScale disabled={!hasLink} onPress={openLink} containerStyle={styles.cardShell} style={[styles.card, { borderColor: hasLink ? '#6ED8B5' : 'rgba(255,255,255,0.22)' }]}>
      {idea.imageUrl ? (
        <Animated.View style={{ opacity: imageOpacity }}>
          <ImageBackground source={{ uri: idea.imageUrl }} onLoad={fadeInImage} style={styles.image} imageStyle={styles.imageRadius}>
            <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
            <View style={styles.priority}>
              <Text style={[styles.priorityText, { fontFamily: font.semibold }]}>{getPriorityLabel(idea.priority)}</Text>
            </View>
          </ImageBackground>
        </Animated.View>
      ) : (
        <SourceThumbnail link={idea.link} priority={idea.priority} />
      )}
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { fontFamily: font.semibold }]}>{idea.category}</Text>
          {hasLink && (
            <View style={styles.openPill}>
              <Text style={[styles.openCue, { fontFamily: font.semibold }]}>Open link</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, needsLabel && styles.unlabeledTitle, { fontFamily: font.heading }]}>{idea.title}</Text>
        {needsLabel && (
          <View style={styles.labelCue}>
            <Text style={[styles.labelCueText, { fontFamily: font.semibold }]}>Add label</Text>
          </View>
        )}
        {!!idea.note && <Text style={[styles.note, { fontFamily: font.body }]}>{idea.note}</Text>}
        <Text style={[styles.linkText, { fontFamily: font.semibold }]} numberOfLines={1}>{getSourceLabel(idea.link)}</Text>
        {(onEdit || onDelete) && (
          <View style={styles.cardActions}>
            {onEdit && (
              <TouchableOpacity style={styles.editAction} onPress={(event) => { event.stopPropagation(); onEdit(); }}>
                <Text style={[styles.editActionText, { fontFamily: font.semibold }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.deleteAction} onPress={(event) => { event.stopPropagation(); onDelete(); }}>
                <Text style={[styles.deleteActionText, { fontFamily: font.semibold }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </PressableScale>
  );
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getPriorityLabel(priority: TripIdea['priority']) {
  if (priority === 'Must-do') return 'Favorite';
  if (priority === 'Maybe') return 'Considering';
  return 'Skip';
}

const styles = StyleSheet.create({
  cardShell: { width: '48%', minWidth: 156, marginBottom: 18 },
  card: { width: '100%', minHeight: 286, borderRadius: 24, overflow: 'hidden', borderWidth: 1, backgroundColor: '#16231F', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 9 }, elevation: 7 },
  image: { height: 124, alignItems: 'flex-start', justifyContent: 'flex-start' },
  imageRadius: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  priority: { margin: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)' },
  priorityText: { ...androidTextReset, color: '#F8F8F6', fontSize: 10, fontWeight: '700', letterSpacing: 0 },
  body: { minHeight: 162, padding: 14, backgroundColor: '#16231F' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  category: { ...androidTextReset, color: '#F4D06F', fontWeight: '600', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0 },
  openPill: { backgroundColor: Platform.OS === 'android' ? '#0F1E19' : 'rgba(0,0,0,0.45)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  openCue: { ...androidTextReset, color: '#A8F0D4', fontWeight: '700', fontSize: 10, letterSpacing: 0 },
  title: { ...androidTextReset, color: '#F8F8F6', fontWeight: '700', fontSize: 16, lineHeight: 20, marginTop: 7, letterSpacing: -0.16 },
  unlabeledTitle: { color: 'rgba(248,248,246,0.62)' },
  labelCue: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Platform.OS === 'android' ? '#24372F' : 'rgba(168,240,212,0.14)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.2)' },
  labelCueText: { ...androidTextReset, color: '#A8F0D4', fontSize: 10.5, fontWeight: '700' },
  note: { ...androidTextReset, color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 5, lineHeight: 17 },
  linkText: { ...androidTextReset, color: '#6ED8B5', fontWeight: '800', fontSize: 11, marginTop: 8, letterSpacing: 0 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editAction: { flex: 1, minHeight: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#24483D' : 'rgba(168,240,212,0.15)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.22)' },
  editActionText: { ...androidTextReset, color: '#A8F0D4', fontWeight: '600', fontSize: 12 },
  deleteAction: { flex: 1, minHeight: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#3A241F' : 'rgba(217,94,79,0.14)', borderWidth: 1, borderColor: 'rgba(217,94,79,0.22)' },
  deleteActionText: { ...androidTextReset, color: '#FFB4AA', fontWeight: '600', fontSize: 12 },
});
