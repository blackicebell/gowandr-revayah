import React, { useState } from 'react';
import { ImageBackground, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { starterPhotos } from '../data/starterPhotos';
import { paceGuidance } from '../logic/tripPace';
import { androidTextReset, colors, font, useThemeColors } from '../theme/colors';
import { TripDraft } from '../types';

const vibeTags = ['food', 'beach', 'culture', 'nature', 'nightlife', 'shopping', 'relax', 'stay'];
const companionTypes: TripDraft['companionType'][] = ['Solo', 'Couple', 'Friends', 'Family', 'Group'];
const paces: TripDraft['pace'][] = ['Relaxed', 'Balanced', 'Packed'];

export function NewTripScreen({ onBack, onCreate, initialTrip, onUpdate, onDelete }: { onBack: () => void; onCreate: (trip: TripDraft) => void; initialTrip?: TripDraft; onUpdate?: (trip: TripDraft) => void; onDelete?: () => void }) {
  const theme = useThemeColors();
  const initialPhoto = initialTrip ? starterPhotos.find((photo) => photo.uri === initialTrip.heroImage) ?? { id: 'current', label: 'Current', uri: initialTrip.heroImage } : starterPhotos[0];
  const photoOptions = initialPhoto.id === 'current' ? [initialPhoto, ...starterPhotos] : starterPhotos;
  const isEditing = !!initialTrip;
  const [title, setTitle] = useState(initialTrip?.title ?? '');
  const [subtitle, setSubtitle] = useState(initialTrip?.subtitle ?? '');
  const [selectedPhoto, setSelectedPhoto] = useState(initialPhoto);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTrip?.tags ?? ['food', 'relax']);
  const [pace, setPace] = useState<TripDraft['pace']>(initialTrip?.pace ?? 'Balanced');
  const [companionType, setCompanionType] = useState<TripDraft['companionType']>(initialTrip?.companionType ?? 'Friends');
  const [step, setStep] = useState<1 | 2>(initialTrip ? 2 : 1);
  const canContinue = !!title.trim();
  const shouldShowNameRequired = !isEditing && step === 1 && !canContinue;

  const createTrip = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const fallbackPhoto = starterPhotos[0]?.uri ?? '';
    const heroImage = selectedPhoto.uri || initialTrip?.heroImage || fallbackPhoto;
    const cleanTags = selectedTags.length ? selectedTags : ['relax'];

    const trip: TripDraft = {
      ...(initialTrip ?? {}),
      id: initialTrip?.id ?? `trip-${Date.now()}`,
      title: cleanTitle,
      subtitle: subtitle.trim() || buildSubtitle(cleanTags, companionType),
      heroImage,
      tags: cleanTags,
      pace,
      companionType,
      ideas: initialTrip?.ideas ?? [],
      planChecklist: initialTrip?.planChecklist ?? [],
      pocketItems: initialTrip?.pocketItems ?? [],
    };

    if (isEditing && onUpdate) onUpdate(trip);
    else onCreate(trip);
  };

  return (
    <View>
      <Text style={[styles.back, { color: '#137D68', fontFamily: font.semibold }]} onPress={onBack}>Back to Trip Ideas</Text>
      <Text style={[styles.title, { color: theme.charcoal, fontFamily: font.heading }]}>{isEditing ? 'Edit trip draft' : 'New trip draft'}</Text>
      <Text style={[styles.body, { color: theme.muted, fontFamily: font.body }]}>{isEditing ? 'Update the brief so this trip is easier to compare later.' : 'Start with a name and a cover photo. You can add the details after it has a home.'}</Text>

      {!isEditing && (
        <View style={styles.stepper}>
          <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>
      )}

      <View style={[styles.nameFieldCard, shouldShowNameRequired && styles.nameFieldCardRequired, { backgroundColor: theme.paper, borderColor: shouldShowNameRequired ? '#2FAF8A' : theme.line }]}>
        <View style={styles.nameLabelRow}>
          <Text style={[styles.nameLabel, { color: theme.charcoal, fontFamily: font.heading }]}>Name this trip</Text>
          <Text style={[styles.requiredPill, { fontFamily: font.semibold }]}>Required</Text>
        </View>
        <Text style={[styles.nameHelper, { color: theme.muted, fontFamily: font.body }]}>Give it a simple working name so you can find it later.</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Example: Istanbul food weekend"
          placeholderTextColor={theme.muted}
          autoFocus={!isEditing}
          returnKeyType="next"
          accessibilityLabel="Trip name"
          style={[styles.input, styles.nameInput, { backgroundColor: '#FFFFFF', borderColor: shouldShowNameRequired ? '#2FAF8A' : theme.line, color: theme.charcoal, fontFamily: font.body }]}
        />
      </View>

      <Text style={[styles.label, { color: theme.charcoal, fontFamily: font.heading }]}>Choose a starter photo</Text>
      <Text style={[styles.helper, { color: theme.muted, fontFamily: font.body }]}>Pick one image to set the mood. This is only a cover, not a promise.</Text>
      <View style={styles.photoGrid}>
        {photoOptions.map((photo) => (
          <TouchableOpacity key={photo.id} onPress={() => setSelectedPhoto(photo)} style={[styles.photoChoice, { borderColor: selectedPhoto.id === photo.id ? theme.teal : 'transparent' }]}>
            <ImageBackground source={{ uri: photo.uri }} style={styles.photo} imageStyle={styles.photoImage}>
              {selectedPhoto.id === photo.id && (
                <View style={styles.photoSelected}>
                  <Text style={[styles.photoSelectedText, { fontFamily: font.semibold }]}>Selected</Text>
                </View>
              )}
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </View>

      {(isEditing || step === 2) && (
        <>
          <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="Optional short note" placeholderTextColor={theme.muted} style={[styles.input, styles.noteInput, { backgroundColor: theme.paper, borderColor: theme.line, color: theme.charcoal, fontFamily: font.body }]} />

          <Text style={[styles.label, { color: theme.charcoal, fontFamily: font.heading }]}>Trip mood</Text>
          <Text style={[styles.helper, { color: theme.muted, fontFamily: font.body }]}>Pick the feeling behind the trip. Keep it simple.</Text>
          <View style={styles.wrap}>
            {vibeTags.map((tag) => (
              <Chip key={tag} label={tag} active={selectedTags.includes(tag)} onPress={() => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.charcoal, fontFamily: font.heading }]}>People</Text>
          <Text style={[styles.helper, { color: theme.muted, fontFamily: font.body }]}>This starts as your trip. You can involve people later if you want input.</Text>
          <View style={styles.wrap}>
            {companionTypes.map((item) => (
              <Chip key={item} label={item} active={companionType === item} onPress={() => setCompanionType(item)} />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.charcoal, fontFamily: font.heading }]}>Trip pace</Text>
          <Text style={[styles.helper, { color: theme.muted, fontFamily: font.body }]}>How full should this trip feel?</Text>
          <View style={styles.wrap}>
            {paces.map((item) => (
              <Chip key={item} label={item} active={pace === item} onPress={() => setPace(item)} />
            ))}
          </View>
          <View style={[styles.paceCard, { backgroundColor: theme.paper, borderColor: theme.line }]}>
            <Text style={[styles.paceTitle, { color: theme.charcoal, fontFamily: font.heading }]}>{paceGuidance[pace].label}: {paceGuidance[pace].short}</Text>
            <Text style={[styles.paceBody, { color: theme.muted, fontFamily: font.body }]}>{paceGuidance[pace].detail}</Text>
            <Text style={[styles.paceMeta, { color: '#137D68', fontFamily: font.semibold }]}>Use this as a feel-check, not a strict itinerary.</Text>
          </View>
        </>
      )}

      <View style={styles.actions}>
        {shouldShowNameRequired && (
          <Text style={[styles.actionHint, { color: theme.muted, fontFamily: font.body }]}>Add a trip name to continue.</Text>
        )}
        {!isEditing && step === 1 ? (
          <Button label="Next: Add the trip feel" disabled={!canContinue} onPress={() => setStep(2)} />
        ) : (
          <Button label={isEditing ? 'Save Trip Changes' : 'Save Trip Draft'} disabled={!title.trim()} onPress={createTrip} />
        )}
      </View>
      {isEditing && onDelete && (
        <View style={styles.deleteArea}>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={[styles.deleteText, { fontFamily: font.semibold }]}>Delete Trip</Text>
          </TouchableOpacity>
          <Text style={[styles.deleteHint, { color: theme.muted, fontFamily: font.body }]}>This removes the trip draft and all saved ideas inside it.</Text>
        </View>
      )}
    </View>
  );
}

function buildSubtitle(tags: string[], companionType: TripDraft['companionType']) {
  const topTags = tags.slice(0, 3);
  if (!topTags.length) return `A ${companionType.toLowerCase()} trip idea ready for saved links and notes.`;
  return `${capitalize(topTags.join(', '))} ideas for a ${companionType.toLowerCase()} trip.`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  back: { fontWeight: '600', paddingVertical: 10 },
  title: { fontWeight: '700', fontSize: 38, lineHeight: 46, letterSpacing: -0.38 },
  body: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 18 },
  input: { minHeight: 54, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, marginBottom: 10 },
  nameFieldCard: { borderRadius: 22, borderWidth: 1, padding: 14, marginBottom: 14 },
  nameFieldCardRequired: { shadowColor: '#2FAF8A', shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: Platform.OS === 'android' ? 1 : 0 },
  nameLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nameLabel: { ...androidTextReset, fontWeight: '800', fontSize: 20, lineHeight: 25 },
  requiredPill: { ...androidTextReset, color: colors.tealDark, fontSize: 11, textTransform: 'uppercase', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: '#E9FBF4', overflow: 'hidden' },
  nameHelper: { ...androidTextReset, fontSize: 13.5, lineHeight: 19, marginTop: 5, marginBottom: 10 },
  nameInput: { marginBottom: 0 },
  noteInput: { marginTop: 18, marginBottom: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, marginBottom: 16 },
  stepDot: { width: 11, height: 11, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.12)' },
  stepDotActive: { width: 32, backgroundColor: '#6ED8B5' },
  stepLine: { width: 28, height: 2, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.10)' },
  stepLineActive: { backgroundColor: 'rgba(47,175,138,0.45)' },
  label: { fontWeight: '700', fontSize: 17, marginTop: 16, marginBottom: 10, letterSpacing: -0.17 },
  helper: { fontSize: 14, lineHeight: 20, marginTop: -4, marginBottom: 10 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  photoChoice: { width: '48%', borderRadius: 20, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  photo: { height: 112, justifyContent: 'flex-end' },
  photoImage: { borderRadius: 18 },
  photoSelected: { alignSelf: 'flex-start', margin: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.88)' },
  photoSelectedText: { ...androidTextReset, color: colors.tealDark, fontSize: 11 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paceCard: { borderRadius: 20, borderWidth: 1, padding: 14, marginTop: 10 },
  paceTitle: { fontSize: 16 },
  paceBody: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  paceMeta: { fontSize: 12, marginTop: 9 },
  actions: { marginTop: 22, marginBottom: Platform.OS === 'ios' ? 156 : 168 },
  actionHint: { ...androidTextReset, textAlign: 'center', fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  deleteArea: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(32,38,35,0.08)' },
  deleteButton: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#FFF4F2' : 'rgba(217,94,79,0.10)', borderWidth: 1, borderColor: 'rgba(217,94,79,0.24)' },
  deleteText: { ...androidTextReset, color: '#B84A3F', fontSize: 15 },
  deleteHint: { textAlign: 'center', fontSize: 13, lineHeight: 18, marginTop: 9 },
});
