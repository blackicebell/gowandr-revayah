import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { androidTextReset, font, useThemeColors } from '../theme/colors';

export function Chip({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.chip, { backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.76)', borderColor: 'rgba(32,38,35,0.08)' }, active && { backgroundColor: colors.teal, borderColor: '#2FAF8A' }]}>
      <Text style={[styles.text, { color: '#2F3A36', fontFamily: font.medium }, active && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 38, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { ...androidTextReset, fontSize: 12.5, fontWeight: '600', letterSpacing: 0 },
  activeText: { color: '#173A33', fontWeight: '700' },
});
