import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { androidTextReset, font } from '../theme/colors';

type SourceKind = 'instagram' | 'tiktok' | 'youtube' | 'website' | 'note';

export function SourceThumbnail({ link, priority }: { link?: string; priority: string }) {
  const source = getSourceKind(link);
  const config = sourceConfigs[source];

  return (
    <LinearGradient colors={config.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumbnail}>
      <View style={styles.motifLineOne} />
      <View style={styles.motifLineTwo} />
      <Image source={require('../../assets/brand/gowandr-logo-icon-color.png')} style={styles.watermark} resizeMode="contain" />
      <View style={styles.priority}>
        <Text style={[styles.priorityText, { fontFamily: font.semibold }]}>{getPriorityLabel(priority)}</Text>
      </View>
      <View style={styles.sourceCopy}>
        <View style={[styles.sourceMark, { backgroundColor: config.markBackground }]}>
          <Text style={[styles.sourceInitials, { color: config.markText, fontFamily: font.heading }]}>{config.initials}</Text>
        </View>
        <Text style={[styles.sourceLabel, { fontFamily: font.semibold }]}>{config.label}</Text>
      </View>
    </LinearGradient>
  );
}

export function getSourceLabel(link?: string) {
  return sourceConfigs[getSourceKind(link)].detailLabel;
}

function getSourceKind(link?: string): SourceKind {
  const value = link?.toLowerCase().trim() ?? '';
  if (!value) return 'note';
  if (value.includes('instagram.com')) return 'instagram';
  if (value.includes('tiktok.com')) return 'tiktok';
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  return 'website';
}

function getPriorityLabel(priority: string) {
  if (priority === 'Must-do') return 'Favorite';
  if (priority === 'Maybe') return 'Considering';
  return priority;
}

const sourceConfigs: Record<SourceKind, { initials: string; label: string; detailLabel: string; markBackground: string; markText: string; gradient: [string, string, string] }> = {
  instagram: {
    initials: 'IG',
    label: 'Instagram link',
    detailLabel: 'Instagram post',
    markBackground: '#FFE6F0',
    markText: '#B8336A',
    gradient: ['#F9FFFC', '#E4F8F0', '#F7DCE9'],
  },
  tiktok: {
    initials: 'TT',
    label: 'TikTok link',
    detailLabel: 'TikTok post',
    markBackground: '#17231F',
    markText: '#A8F0D4',
    gradient: ['#F8FFFC', '#DDF6EC', '#DDE7FF'],
  },
  youtube: {
    initials: 'YT',
    label: 'YouTube link',
    detailLabel: 'YouTube video',
    markBackground: '#FFE1DD',
    markText: '#C33A2E',
    gradient: ['#FFFCFA', '#E5F8F0', '#FFE5E0'],
  },
  website: {
    initials: 'WEB',
    label: 'Saved link',
    detailLabel: 'Saved website',
    markBackground: '#E1F5EF',
    markText: '#137D68',
    gradient: ['#FAFFFD', '#DDF6EC', '#EEF8F4'],
  },
  note: {
    initials: 'NOTE',
    label: 'Trip note',
    detailLabel: 'Idea note',
    markBackground: '#E3F7EF',
    markText: '#137D68',
    gradient: ['#FEFFFE', '#E4F8F0', '#D7F3E9'],
  },
};

const styles = StyleSheet.create({
  thumbnail: { height: 124, alignItems: 'flex-start', justifyContent: 'space-between', padding: 10, overflow: 'hidden' },
  watermark: { position: 'absolute', right: 12, bottom: 8, width: 64, height: 64, opacity: 0.12 },
  motifLineOne: { position: 'absolute', width: 156, height: 1, right: -30, top: 34, backgroundColor: 'rgba(19,125,104,0.16)', transform: [{ rotate: '-22deg' }] },
  motifLineTwo: { position: 'absolute', width: 144, height: 1, left: -42, bottom: 34, backgroundColor: 'rgba(19,125,104,0.12)', transform: [{ rotate: '-22deg' }] },
  priority: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  priorityText: { ...androidTextReset, color: '#26302C', fontSize: 10, fontWeight: '600', letterSpacing: 0 },
  sourceCopy: { gap: 8 },
  sourceMark: { alignSelf: 'flex-start', minWidth: 48, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sourceInitials: { ...androidTextReset, fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  sourceLabel: { ...androidTextReset, color: '#26302C', fontSize: 13, fontWeight: '600', letterSpacing: -0.05 },
});
