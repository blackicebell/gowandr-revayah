import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Chip } from '../components/Chip';
import { androidTextReset, colors, font, useThemeColors } from '../theme/colors';
import { IdeaCategory, IdeaPriority, TripDraft, TripIdea } from '../types';
import { PressableScale } from '../components/PressableScale';
import { buildUnlabeledIdeaTitle } from '../utils/ideaLabels';

const categories: IdeaCategory[] = ['Food', 'Stay', 'Beach', 'Nightlife', 'Culture', 'Adventure', 'Shopping', 'Photo Spot', 'Relax', 'Other'];
const tags = ['Food', 'Beach', 'Culture', 'Nature', 'Nightlife', 'Shopping', 'Relax', 'Stay'];
const visibleTagCount = 6;
const priorityOptions: { label: string; value: IdeaPriority }[] = [
  { label: 'Favorite', value: 'Must-do' },
  { label: 'Considering', value: 'Maybe' },
  { label: 'Not an anchor', value: 'Skip' },
];

export function AddIdeaScreen({ trip, onBack, onSave, initialIdea, initialLink, onDelete }: { trip: TripDraft; onBack: () => void; onSave: (idea: TripIdea) => void; initialIdea?: TripIdea; initialLink?: string; onDelete?: () => void }) {
  const theme = useThemeColors();
  const isEditing = !!initialIdea;
  const cleanInitialLink = typeof initialLink === 'string' ? initialLink : '';
  const [inputMode, setInputMode] = useState<'link' | 'note'>(initialIdea && !initialIdea.link ? 'note' : 'link');
  const [title, setTitle] = useState(initialIdea?.needsLabel ? '' : initialIdea?.title ?? '');
  const [note, setNote] = useState(initialIdea?.note ?? '');
  const [link, setLink] = useState(initialIdea?.link ?? cleanInitialLink);
  const [category, setCategory] = useState<IdeaCategory>(initialIdea?.category ?? 'Other');
  const [priority, setPriority] = useState<IdeaPriority>(initialIdea?.priority ?? 'Maybe');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialIdea?.tags ?? []);
  const [step, setStep] = useState<1 | 2 | 3>(initialIdea ? 2 : cleanInitialLink ? 2 : 1);
  const [pasteMessage, setPasteMessage] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const hasIdeaInput = inputMode === 'note' ? !!title.trim() || !!note.trim() : !!link.trim();
  const hasLabel = !!title.trim() || !!note.trim();
  const canSave = hasIdeaInput && step === 3;
  const visibleTags = showAllTags ? tags : tags.slice(0, visibleTagCount);

  const pasteFromClipboard = async () => {
    const pastedText = await Clipboard.getStringAsync();
    const cleanText = pastedText.trim();
    if (!cleanText) {
      setPasteMessage('Nothing copied yet. Copy a travel link first, then tap Paste here.');
      return;
    }

    setLink(cleanText);
    setPasteMessage(detectPlatform(cleanText) ? `${detectPlatform(cleanText)} link pasted.` : 'Link pasted.');
    setStep(2);
  };

  const save = () => {
    const typedTitle = title.trim();
    const fallbackTitle = inputMode === 'note' ? 'Travel note' : buildUnlabeledIdeaTitle(link, trip.ideas);
    onSave({
      ...initialIdea,
      id: initialIdea?.id ?? `idea-${Date.now()}`,
      title: typedTitle || fallbackTitle,
      note,
      link: inputMode === 'note' ? '' : link,
      needsLabel: inputMode === 'link' && !typedTitle ? true : undefined,
      category,
      priority,
      tags: selectedTags,
      imageUrl: youtubeThumbnail(link),
    });
  };

  const moveToNextNeededStep = () => {
    if (!hasIdeaInput) {
      setStep(inputMode === 'note' ? 2 : 1);
      return;
    }
    if (inputMode === 'note' && !hasLabel) {
      setStep(2);
      return;
    }
    setStep(3);
  };

  return (
    <View>
      <Text style={[styles.back, { color: '#137D68', fontFamily: font.semibold }]} onPress={onBack}>Back to {trip.title}</Text>
      <Text style={[styles.title, { color: theme.charcoal, fontFamily: font.heading }]}>{isEditing ? 'Edit saved idea' : 'Add link or idea'}</Text>
      <Text style={[styles.body, { color: theme.muted, fontFamily: font.body }]}>{isEditing ? 'Update the label, note, link, and how this idea should appear on the trip page.' : 'Paste the travel link first. Add a label if you have one, or save it now and clean it up later.'}</Text>

      {!isEditing && (
        <View style={styles.modeSwitch}>
          <TouchableOpacity style={[styles.modeButton, inputMode === 'link' && styles.modeButtonActive]} onPress={() => { setInputMode('link'); setStep(1); }}>
            <Text style={[styles.modeText, inputMode === 'link' && styles.modeTextActive, { fontFamily: font.semibold }]}>Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeButton, inputMode === 'note' && styles.modeButtonActive]} onPress={() => { setInputMode('note'); setStep(2); }}>
            <Text style={[styles.modeText, inputMode === 'note' && styles.modeTextActive, { fontFamily: font.semibold }]}>Note</Text>
          </TouchableOpacity>
        </View>
      )}

      {inputMode === 'link' && <StepHeader number={1} title="Paste or type the link" active={step === 1} done={!!link.trim()} onPress={() => setStep(1)} />}
      {inputMode === 'link' && step === 1 && (
        <View style={styles.stepCard}>
          <Text style={[styles.stepBody, { fontFamily: font.body }]}>Copy a TikTok, Reel, YouTube, blog, restaurant, or destination link, then paste it here.</Text>
          <View style={styles.linkRow}>
            <Text style={[styles.inputLabel, { fontFamily: font.semibold }]}>Travel link</Text>
            <TextInput placeholder="Paste TikTok, Reel, YouTube, blog, or restaurant link" placeholderTextColor={theme.muted} value={link} onChangeText={setLink} style={[styles.input, styles.linkInput, { color: theme.charcoal, fontFamily: font.body }]} autoCapitalize="none" />
            <PrimaryLocalButton label="Paste here" onPress={pasteFromClipboard} />
          </View>
          {!!pasteMessage && <Text style={[styles.detected, { fontFamily: font.semibold }]}>{pasteMessage}</Text>}
          {!!link && <Text style={[styles.detected, { fontFamily: font.semibold }]}>{detectPlatform(link) ? `${detectPlatform(link)} detected. We will save the link even if a thumbnail is not available.` : 'Saved as a regular link with a polished fallback card.'}</Text>}
          <SecondaryLocalButton label="Next: Add a quick label" disabled={!link.trim()} onPress={() => setStep(2)} />
        </View>
      )}

      <StepHeader number={inputMode === 'note' ? 1 : 2} title={inputMode === 'note' ? 'Write the note' : 'Add a quick label'} active={step === 2} done={inputMode === 'link' ? step > 2 || hasLabel : hasLabel} onPress={() => setStep(2)} />
      {step === 2 && (
        <View style={styles.stepCard}>
          <Text style={[styles.stepBody, { fontFamily: font.body }]}>{inputMode === 'note' ? 'Jot the idea down before it disappears. You can sort it into the trip after.' : 'Optional. If you skip this, the card will show an Add label cue so it is easy to clean up later.'}</Text>
          <TextInput placeholder={inputMode === 'note' ? 'Title, like Lisbon in spring or Birthday dinner idea' : 'Title, like Rooftop dinner or Beach club'} placeholderTextColor="rgba(32,38,35,0.48)" value={title} onChangeText={setTitle} style={[styles.input, { color: theme.charcoal, fontFamily: font.body }]} />
          <TextInput placeholder={inputMode === 'note' ? 'Write the note here' : 'Why did you save this?'} placeholderTextColor="rgba(32,38,35,0.48)" value={note} onChangeText={setNote} style={[styles.input, styles.note, { color: theme.charcoal, fontFamily: font.body }]} multiline />
          <SecondaryLocalButton label={inputMode === 'link' && !hasLabel ? 'Skip label' : 'Next: Organize it'} disabled={inputMode === 'note' && !hasLabel} onPress={() => setStep(3)} />
        </View>
      )}

      <StepHeader number={inputMode === 'note' ? 2 : 3} title="Organize it" active={step === 3} done={step === 3 || selectedTags.length > 0 || !!category || !!priority} onPress={() => setStep(3)} />
      {step === 3 && (
        <View style={styles.stepCard}>
          <Text style={[styles.stepBody, { fontFamily: font.body }]}>Choose the type and whether this belongs in the main highlights. Tags are optional.</Text>

          <View style={styles.questionGroup}>
            <Text style={[styles.label, { fontFamily: font.heading }]}>What kind of idea is it?</Text>
            <View style={styles.wrap}>
              {categories.map((item) => (
                <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
              ))}
            </View>
          </View>

          <View style={styles.questionGroup}>
            <Text style={[styles.label, { fontFamily: font.heading }]}>Where should it sit?</Text>
            <Text style={[styles.helperText, { fontFamily: font.body }]}>Favorites become anchors. Considering keeps it visible without making it a must.</Text>
            <View style={styles.wrap}>
              {priorityOptions.map((item) => (
                <Chip key={item.value} label={item.label} active={priority === item.value} onPress={() => setPriority(item.value)} />
              ))}
            </View>
          </View>

          <View style={styles.questionGroup}>
            <Text style={[styles.label, { fontFamily: font.heading }]}>Quick tags</Text>
            <Text style={[styles.helperText, { fontFamily: font.body }]}>Optional details for sorting later.</Text>
            <View style={styles.wrap}>
              {visibleTags.map((item) => (
                <Chip key={item} label={item} active={selectedTags.includes(item)} onPress={() => setSelectedTags((current) => current.includes(item) ? current.filter((tag) => tag !== item) : [...current, item])} />
              ))}
              <TouchableOpacity style={styles.moreTagsButton} onPress={() => setShowAllTags((current) => !current)}>
                <Text style={[styles.moreTagsText, { fontFamily: font.semibold }]}>{showAllTags ? 'Show less' : `More tags`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.save}>
        <PrimaryLocalButton label={isEditing ? 'Save Changes' : inputMode === 'link' ? 'Save Link' : 'Save Note'} muted={!canSave} onPress={canSave ? save : moveToNextNeededStep} />
      </View>
      {isEditing && onDelete && (
        <View style={styles.deleteArea}>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={[styles.deleteText, { fontFamily: font.semibold }]}>Delete Saved Idea</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PrimaryLocalButton({ label, onPress, muted = false, quiet = false }: { label: string; onPress: () => void; muted?: boolean; quiet?: boolean }) {
  if (quiet) {
    return (
      <PressableScale onPress={onPress} style={[styles.localButtonShell, styles.quietSaveButton, muted && styles.mutedAction]}>
        <Text style={[styles.quietSaveText, { fontFamily: font.semibold }]}>{label}</Text>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={onPress} style={[styles.localButtonShell, muted && styles.mutedAction]}>
      <LinearGradient colors={['#A8F0D4', '#6ED8B5', '#2FAF8A']} locations={[0, 0.4, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.localPrimary}>
        <Text style={[styles.localPrimaryText, { fontFamily: font.semibold }]}>{label}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

function SecondaryLocalButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale disabled={disabled} onPress={onPress} style={[styles.localSecondary, disabled && styles.disabledButton]}>
      <Text style={[styles.localSecondaryText, { fontFamily: font.semibold }]}>{label}</Text>
    </PressableScale>
  );
}

function StepHeader({ number, title, active, done, onPress }: { number: number; title: string; active: boolean; done: boolean; onPress: () => void }) {
  const theme = useThemeColors();
  return (
    <TouchableOpacity style={[styles.stepHeader, active && styles.stepHeaderActive]} onPress={onPress}>
      <View style={[styles.stepNumber, done && styles.stepNumberDone, active && !done && styles.stepNumberActive]}>
        <Text style={[styles.stepNumberText, { fontFamily: font.semibold }]}>{done ? 'OK' : number}</Text>
      </View>
      <Text style={[styles.stepTitle, { fontFamily: font.semibold }]}>{title}</Text>
      {active ? <Text style={[styles.activePill, { fontFamily: font.semibold }]}>Active</Text> : done ? <Text style={[styles.stepAction, { fontFamily: font.semibold }]}>Edit</Text> : null}
    </TouchableOpacity>
  );
}

function detectPlatform(link: string) {
  const value = link.toLowerCase();
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
  if (value.includes('tiktok.com')) return 'TikTok';
  if (value.includes('instagram.com')) return 'Instagram';
  if (value.startsWith('http')) return 'Website';
  return undefined;
}

function youtubeThumbnail(link: string) {
  const match = link.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : undefined;
}

const styles = StyleSheet.create({
  back: { fontWeight: '800', paddingVertical: 10 },
  title: { fontWeight: '700', fontSize: 38, lineHeight: 46, letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 24, marginTop: 8, marginBottom: 22, fontWeight: '400' },
  modeSwitch: { flexDirection: 'row', gap: 8, padding: 5, borderRadius: 20, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.68)', borderWidth: 1, borderColor: 'rgba(15,17,21,0.07)', marginBottom: 14 },
  modeButton: { flex: 1, minHeight: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: Platform.OS === 'android' ? '#C7F7E5' : 'rgba(168,240,212,0.72)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  modeText: { ...androidTextReset, color: 'rgba(32,38,35,0.58)', fontSize: 14 },
  modeTextActive: { color: '#173A33' },
  stepHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(15,17,21,0.07)', marginBottom: 9, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  stepHeaderActive: { backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.84)', borderColor: 'rgba(47,175,138,0.20)', shadowOpacity: 0.09 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,240,212,0.28)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.10)' },
  stepNumberActive: { backgroundColor: 'rgba(168,240,212,0.58)', borderColor: 'rgba(47,175,138,0.14)' },
  stepNumberDone: { backgroundColor: '#6ED8B5' },
  stepNumberText: { ...androidTextReset, color: '#26302C', fontSize: 12 },
  stepTitle: { ...androidTextReset, flex: 1, color: '#26302C', fontSize: 15.5, lineHeight: 20 },
  stepAction: { ...androidTextReset, color: 'rgba(0,0,0,0.55)', fontSize: 12 },
  activePill: { ...androidTextReset, color: '#202623', fontSize: 11, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.46)', overflow: 'hidden' },
  stepCard: { backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(15,17,21,0.06)', borderRadius: 24, padding: 16, marginTop: -2, marginBottom: 13, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  stepBody: { color: '#596861', fontSize: 14.5, lineHeight: 22, marginBottom: 16, fontWeight: '400' },
  linkRow: { gap: 10 },
  inputLabel: { color: '#596861', fontSize: 12, fontWeight: '700', marginBottom: -2 },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(15,17,21,0.10)', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.86)', paddingHorizontal: 16, color: colors.charcoal, fontSize: 15, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  linkInput: { marginBottom: 0 },
  note: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  detected: { color: '#168C70', fontWeight: '700', marginBottom: 10, fontSize: 13, lineHeight: 18 },
  questionGroup: { gap: 10, marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(32,38,35,0.07)' },
  label: { color: '#26302C', fontWeight: '700', fontSize: 16, letterSpacing: -0.12 },
  helperText: { color: '#68746F', fontSize: 13.5, lineHeight: 19, marginTop: -4, fontWeight: '400' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  save: { marginTop: 18, marginBottom: 112 },
  localButtonShell: { borderRadius: 18 },
  localPrimary: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, overflow: 'hidden', shadowColor: '#2FAF8A', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  localPrimaryText: { ...androidTextReset, color: '#173A33', fontSize: 15, textAlign: 'center' },
  quietSaveButton: { minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  quietSaveText: { ...androidTextReset, color: '#137D68', fontSize: 15, letterSpacing: -0.05, textAlign: 'center' },
  localSecondary: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, marginTop: 18, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)', shadowColor: '#000', shadowOpacity: 0.055, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  localSecondaryText: { ...androidTextReset, color: '#26302C', fontSize: 14.5, textAlign: 'center' },
  disabledButton: { opacity: 0.42 },
  mutedAction: { opacity: 0.78 },
  moreTagsButton: { minHeight: 36, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)', backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.22)', alignItems: 'center', justifyContent: 'center' },
  moreTagsText: { ...androidTextReset, color: '#137D68', fontSize: 12.5, fontWeight: '700' },
  deleteArea: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(32,38,35,0.08)' },
  deleteButton: { minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,94,79,0.10)', borderWidth: 1, borderColor: 'rgba(217,94,79,0.22)' },
  deleteText: { ...androidTextReset, color: '#B84A3F', fontSize: 15, fontWeight: '600' },
});
