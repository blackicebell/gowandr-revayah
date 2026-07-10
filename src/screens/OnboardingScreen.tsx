import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { onboardingImageUris } from '../data/imageAssets';
import { font, useThemeColors } from '../theme/colors';

const slides = [
  {
    eyebrow: 'Collect. Shape. Decide.',
    title: 'Collect ideas for the trip you actually want.',
    body: 'Save the links, notes, restaurants, and sparks that help you shape an upcoming trip into a real decision.',
    image: onboardingImageUris.flightWindow,
    proof: 'Built for deciding where to go',
  },
  {
    eyebrow: 'Collect',
    title: 'Save anything that makes you want to travel.',
    body: 'TikToks. Restaurants. Videos. Photos. Random ideas. Keep the spark before it disappears.',
    image: onboardingImageUris.saveInspiration,
    proof: 'TikTok + Instagram + YouTube',
  },
  {
    eyebrow: 'Shape',
    title: 'Every great trip starts as a rough idea.',
    body: 'Shape scattered saves into trip drafts with a mood, pace, cover photo, and the highlights that make each one worth considering.',
    image: onboardingImageUris.shapeTrip,
    proof: 'No heavy itinerary required',
  },
  {
    eyebrow: 'Decide',
    title: 'Stop guessing. See which trip actually pulls you.',
    body: 'Preview the highlights first. Answer four quick questions. Choose with confidence, solo or with people.',
    image: onboardingImageUris.decideAirport,
    proof: 'Works solo or together',
  },
  {
    eyebrow: 'Commit',
    title: 'Where do you want to go first?',
    body: 'Commit to one trip. Keep the next steps simple. Take one small step at a time until you are ready to go.',
    image: onboardingImageUris.commitBeach,
    proof: 'Share cards when it feels real',
  },
];

export function OnboardingScreen({ onFinish }: { onFinish: (nextScreen?: 'home' | 'newTrip') => void }) {
  const theme = useThemeColors();
  const [index, setIndex] = useState(0);
  const slideMotion = useRef(new Animated.Value(1)).current;
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    slideMotion.setValue(0);
    Animated.timing(slideMotion, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [index, slideMotion]);

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.screen, { backgroundColor: theme.canvas }]}>
      <View style={styles.brandRow}>
        <View style={styles.logoPill}>
          <Image source={require('../../assets/brand/gowandr-logo-full-color.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <TouchableOpacity onPress={() => onFinish('home')} style={styles.skipButton}>
          <Text style={[styles.skipText, { fontFamily: font.semibold }]}>Skip</Text>
        </TouchableOpacity>
      </View>
      <ImageBackground source={{ uri: slide.image }} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={['rgba(4,12,10,0.10)', 'rgba(4,12,10,0.30)', 'rgba(4,12,10,0.86)']} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.edgeShade} />
        <Animated.View style={[styles.copy, { opacity: slideMotion, transform: [{ translateY: slideMotion.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <View style={styles.dots}>
            {slides.map((item, dotIndex) => (
              <View key={item.title} style={[styles.dot, dotIndex === index && { width: 42, backgroundColor: theme.accent }]} />
            ))}
          </View>
          <Text style={[styles.eyebrow, { color: theme.accent, fontFamily: font.semibold }]}>{slide.eyebrow}</Text>
          <Text style={[styles.title, { fontFamily: font.heading }]}>{slide.title}</Text>
          <Text style={[styles.body, { fontFamily: font.body }]}>{slide.body}</Text>
          <View style={styles.proofPill}>
            <Text style={[styles.proofText, { fontFamily: font.semibold }]}>{slide.proof}</Text>
          </View>
        </Animated.View>
      </ImageBackground>
      <View style={styles.actions}>
        <Button label={isLast ? 'Create My First Trip' : 'Next'} onPress={() => (isLast ? onFinish('newTrip') : setIndex((current) => current + 1))} />
        {!isLast && <Button label="Start a Trip Draft" variant="secondary" onPress={() => onFinish('newTrip')} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 18 : 24 },
  brandRow: { minHeight: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoPill: { height: 50, minWidth: 170, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.05)', shadowColor: '#6ED8B5', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  logo: { width: 136, height: 34 },
  skipButton: { position: 'absolute', right: 0, minHeight: 42, minWidth: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  skipText: { color: '#137D68', fontWeight: '700', fontSize: 13 },
  hero: { flex: 1, minHeight: 500, borderRadius: 32, overflow: 'hidden', justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  heroImage: { borderRadius: 32 },
  edgeShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.10)' },
  copy: { padding: 22 },
  dots: { flexDirection: 'row', gap: 7, marginBottom: 16 },
  dot: { width: 24, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.45)' },
  eyebrow: { fontWeight: '800', fontSize: 12, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 9, textShadowColor: 'rgba(0,0,0,0.42)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  title: { color: '#F8F8F6', fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.32, textShadowColor: 'rgba(0,0,0,0.50)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 3 } },
  body: { color: '#F8F8F6', fontSize: 15, lineHeight: 22, marginTop: 12, opacity: 0.98, fontWeight: '400', textShadowColor: 'rgba(0,0,0,0.46)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  proofPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, marginTop: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  proofText: { color: '#F8F8F6', fontSize: 11.5, fontWeight: '700' },
  actions: { gap: 10, paddingTop: 16 },
});
