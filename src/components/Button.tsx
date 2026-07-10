import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { androidTextReset, font, useThemeColors } from '../theme/colors';
import { PressableScale } from './PressableScale';

export function Button({ label, onPress, variant = 'primary', disabled = false }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean }) {
  const colors = useThemeColors();
  const isPrimary = variant === 'primary';
  const androidPrimarySurface = disabled ? '#B8E8D6' : '#6ED8B5';

  return (
    <PressableScale disabled={disabled} onPress={onPress} containerStyle={styles.pressContainer} style={[styles.pressShell, disabled && Platform.OS !== 'android' && styles.disabled]}>
      {isPrimary ? (
        Platform.OS === 'android' ? (
          <View style={[styles.button, { backgroundColor: androidPrimarySurface }]}>
            <Text style={[styles.label, { backgroundColor: androidPrimarySurface, color: colors.charcoal, fontFamily: font.semibold }]}>{label}</Text>
          </View>
        ) : (
          <LinearGradient colors={['#A8F0D4', '#6ED8B5', '#2FAF8A']} locations={[0, 0.4, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
            <Text style={[styles.label, { color: colors.charcoal, fontFamily: font.semibold }]}>{label}</Text>
          </LinearGradient>
        )
      ) : (
        <View style={[styles.button, variantStyle(variant, colors)]}>
          <Text style={[styles.label, styles.secondaryLabel, Platform.OS === 'android' && styles.androidSecondaryLabel, { fontFamily: font.semibold, color: colors.charcoal }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

function variantStyle(variant: 'primary' | 'secondary' | 'ghost', colors: ReturnType<typeof useThemeColors>) {
  if (variant === 'secondary') {
    return {
      backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.84)',
      borderWidth: 1,
      borderColor: Platform.OS === 'android' ? 'rgba(32,38,35,0.08)' : 'rgba(255,255,255,0.74)',
      shadowOpacity: Platform.OS === 'android' ? 0.06 : 0.16,
    };
  }
  if (variant === 'ghost') {
    return {
      backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.48)',
      borderWidth: 1,
      borderColor: Platform.OS === 'android' ? 'rgba(32,38,35,0.08)' : 'rgba(255,255,255,0.62)',
    };
  }
  return { backgroundColor: colors.teal };
}

const styles = StyleSheet.create({
  pressContainer: { borderRadius: 18, overflow: 'hidden' },
  pressShell: { borderRadius: 18, overflow: 'hidden' },
  button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, paddingHorizontal: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  disabled: { opacity: 0.45 },
  label: { ...androidTextReset, color: '#202623', fontSize: 15, lineHeight: 20, letterSpacing: 0, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  androidSecondaryLabel: { backgroundColor: '#F8FAF9', paddingHorizontal: 2 },
  secondaryLabel: {},
});
