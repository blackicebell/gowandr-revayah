import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../components/Button';
import { androidTextReset, colors, font } from '../theme/colors';
import { PocketItem, PocketItemType, TripDraft } from '../types';

type PocketDraft = {
  type: PocketItemType;
  title: string;
  date: string;
  endDate: string;
  time: string;
  city: string;
  confirmation: string;
  link: string;
  note: string;
  screenshotUri?: string;
  pinned: boolean;
};

type AddKind = 'screenshot' | 'note' | 'booking' | 'photo' | 'flight' | 'stay';

type ShareSummaryOptions = {
  flights: boolean;
  stays: boolean;
  codes: boolean;
  notes: boolean;
};

const emptyDraft: PocketDraft = {
  type: 'other',
  title: '',
  date: '',
  endDate: '',
  time: '',
  city: '',
  confirmation: '',
  link: '',
  note: '',
  pinned: false,
};

const typeLabels: Record<PocketItemType, string> = {
  flight: 'Flight',
  stay: 'Stay',
  ticket: 'Ticket',
  reservation: 'Reservation',
  transport: 'Transport',
  document: 'Document',
  note: 'Note',
  other: 'Other',
};

const pocketTypes: PocketItemType[] = ['flight', 'stay', 'ticket', 'reservation', 'transport', 'document', 'note', 'other'];

const defaultShareOptions: ShareSummaryOptions = {
  flights: true,
  stays: true,
  codes: true,
  notes: true,
};

export function PocketScreen({
  trip,
  trips,
  isPlus,
  isDesignPreview = false,
  quickCaptureRequest,
  onBack,
  onSelectTrip,
  onCreateTrip,
  onUpgradeRequired,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  trip?: TripDraft;
  trips: TripDraft[];
  isPlus: boolean;
  isDesignPreview?: boolean;
  quickCaptureRequest?: number;
  onBack: () => void;
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onUpgradeRequired: () => void;
  onAddItem: (tripId: string, item: PocketItem) => void;
  onUpdateItem: (tripId: string, item: PocketItem) => void;
  onDeleteItem: (tripId: string, itemId: string) => void;
}) {
  const [draft, setDraft] = useState<PocketDraft>(emptyDraft);
  const [editingItemId, setEditingItemId] = useState<string | undefined>();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareOptions, setShareOptions] = useState<ShareSummaryOptions>(defaultShareOptions);
  const [selectedItem, setSelectedItem] = useState<PocketItem | undefined>();
  const items = trip?.pocketItems ?? [];
  const nextItem = useMemo(() => getNextPocketItem(items), [items]);
  const groups = useMemo(() => groupPocketItems(items), [items]);
  const editingItem = editingItemId ? items.find((item) => item.id === editingItemId) : undefined;

  useEffect(() => {
    if (!quickCaptureRequest || !trip || !isPlus || !items.length) return;
    setEditingItemId(undefined);
    setDraft(emptyDraft);
    setIsReviewOpen(false);
    setIsFormOpen(false);
    setIsQuickNoteOpen(false);
    setIsAddOpen(true);
  }, [quickCaptureRequest]);

  if (!trip) {
    return <PocketNoTrip trips={trips} onBack={onBack} onSelectTrip={onSelectTrip} onCreateTrip={onCreateTrip} />;
  }

  if (!isPlus) {
    return <PocketPaywall trip={trip} onBack={onBack} onUpgradeRequired={onUpgradeRequired} />;
  }

  const openAddPanel = () => {
    setEditingItemId(undefined);
    setDraft(emptyDraft);
    setIsReviewOpen(false);
    setIsFormOpen(false);
    setIsQuickNoteOpen(false);
    setIsAddOpen(true);
  };

  const startNewItem = async (kind: AddKind) => {
    const nextDraft = getDraftForAddKind(kind);
    setEditingItemId(undefined);
    setIsAddOpen(false);
    if (kind === 'screenshot' || kind === 'photo') {
      const uri = await pickImage();
      if (!uri) return;
      setDraft({ ...nextDraft, screenshotUri: uri });
      setIsReviewOpen(true);
      return;
    }
    if (kind === 'note') {
      setDraft(nextDraft);
      setIsQuickNoteOpen(true);
      return;
    }
    setDraft(nextDraft);
    setIsMoreDetailsOpen(kind === 'booking' || kind === 'flight' || kind === 'stay');
    setIsFormOpen(true);
  };

  const editItem = (item: PocketItem) => {
    setSelectedItem(undefined);
    setEditingItemId(item.id);
    setDraft(getDraftForPocketItem(item));
    setIsReviewOpen(false);
    setIsMoreDetailsOpen(true);
    setIsFormOpen(true);
  };

  const pickScreenshot = async () => {
    const uri = await pickImage();
    if (uri) setDraft((current) => ({ ...current, screenshotUri: uri }));
  };

  const saveDraft = () => {
    const now = new Date().toISOString();
    const item = buildPocketItem(draft, editingItemId, now);
    if (editingItemId) onUpdateItem(trip.id, item);
    else onAddItem(trip.id, item);
    setIsFormOpen(false);
    setIsQuickNoteOpen(false);
    setIsReviewOpen(false);
    setIsMoreDetailsOpen(false);
    setEditingItemId(undefined);
    setDraft(emptyDraft);
  };

  const resetEditor = () => {
    setIsFormOpen(false);
    setIsQuickNoteOpen(false);
    setIsMoreDetailsOpen(false);
    setEditingItemId(undefined);
    setDraft(emptyDraft);
  };

  const closeEditor = () => {
    if (!hasPocketDraftChanges(draft, editingItem)) {
      resetEditor();
      return;
    }

    Alert.alert('Discard changes?', 'Your Pocket item has unsaved changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: resetEditor },
    ]);
  };

  const saveDraftLater = () => {
    const now = new Date().toISOString();
    onAddItem(trip.id, buildPocketItem(draft, undefined, now));
    setIsReviewOpen(false);
    setDraft(emptyDraft);
  };

  const saveQuickNote = () => {
    if (!draft.note.trim()) return;
    const now = new Date().toISOString();
    onAddItem(trip.id, buildPocketItem(draft, undefined, now));
    setIsQuickNoteOpen(false);
    setDraft(emptyDraft);
  };

  const cancelDraftUpload = () => {
    setIsReviewOpen(false);
    setIsFormOpen(false);
    setIsQuickNoteOpen(false);
    setIsMoreDetailsOpen(false);
    setEditingItemId(undefined);
    setDraft(emptyDraft);
  };

  const confirmDeleteItem = (item: PocketItem) => {
    Alert.alert('Delete Pocket item?', `${item.title} will be removed from this trip.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSelectedItem(undefined);
          setIsFormOpen(false);
          setEditingItemId(undefined);
          setDraft(emptyDraft);
          onDeleteItem(trip.id, item.id);
        },
      },
    ]);
  };

  const shareTravelSummary = async () => {
    const message = buildTravelSummary(trip, items, shareOptions);
    await Share.share({
      title: `${trip.title} travel summary`,
      message,
    });
    setIsShareOpen(false);
  };

  const quickCaptureCard = (
    <>
      <TouchableOpacity onPress={openAddPanel} style={styles.quickCaptureButton}>
        <View style={styles.quickCaptureCopy}>
          <Text style={styles.quickCaptureTitle}>Add to Pocket</Text>
          <Text style={styles.quickCaptureBody}>Save screenshots, notes, links, flight details, or stay details.</Text>
          <View style={styles.quickCapturePill}>
            <Text style={styles.quickCapturePillText}>Choose what to save</Text>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );

  const needItNowCard = (
    <TouchableOpacity activeOpacity={nextItem ? 0.86 : 1} onPress={() => nextItem && setSelectedItem(nextItem)} style={styles.nextCard}>
      <Text style={styles.nextKicker}>Need it now</Text>
      <Text style={styles.nextTitle}>{nextItem ? nextItem.title : 'Nothing saved yet'}</Text>
      <Text style={styles.nextBody}>{nextItem ? getPocketItemDetail(nextItem) : 'This is where your boarding pass, hotel confirmation, or reservation will appear when you need it most.'}</Text>
      {nextItem?.screenshotUri && <Image source={{ uri: nextItem.screenshotUri }} style={styles.nextImage} resizeMode="cover" />}
      {!nextItem && <NeedItNowPromise />}
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back home</Text>
      <Text style={styles.title}>Pocket</Text>
      <Text style={styles.body}>Because confirmation emails are never where you need them.</Text>
      {isDesignPreview && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>Design preview: Pocket is temporarily unlocked in this build.</Text>
        </View>
      )}

        <View style={styles.tripCard}>
        <ImageBackground source={{ uri: trip.heroImage }} style={styles.tripImage} imageStyle={styles.tripImageRadius} />
        <View style={styles.tripCopy}>
          <Text style={styles.tripLabel}>Active trip</Text>
          <Text style={styles.tripTitle}>{trip.title}</Text>
          {!!trip.planStartDate && <Text style={styles.tripDates}>{formatDateRange(trip.planStartDate, trip.planEndDate)}</Text>}
          <Text style={styles.tripDates}>{items.length} {items.length === 1 ? 'Pocket item' : 'Pocket items'}</Text>
          <Text style={styles.tripNextLabel}>Next up</Text>
          <Text style={styles.tripNextText}>{nextItem ? nextItem.title : 'Nothing in Pocket yet.'}</Text>
        </View>
      </View>

      {!items.length && quickCaptureCard}

      {needItNowCard}

      {!!items.length && (
        <TouchableOpacity onPress={() => setIsShareOpen((current) => !current)} style={styles.shareSummaryButton}>
          <View>
            <Text style={styles.shareSummaryTitle}>Share Travel Summary</Text>
            <Text style={styles.shareSummaryBody}>Send the essentials through text, WhatsApp, or email.</Text>
          </View>
        </TouchableOpacity>
      )}

      {isShareOpen && (
        <ShareSummaryPanel
          options={shareOptions}
          onToggle={(key) => setShareOptions((current) => ({ ...current, [key]: !current[key] }))}
          onShare={shareTravelSummary}
        />
      )}

      {!!groups.recent.length && (
        <PocketSection title="Recently Added" items={groups.recent} onOpen={setSelectedItem} onEdit={editItem} compact />
      )}

      {isAddOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIsAddOpen(false)}>
          <View style={styles.addModalBackdrop}>
            <View style={styles.addModalSheet}>
              <View style={styles.addSheetHandle} />
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>What are you saving?</Text>
                <TouchableOpacity onPress={() => setIsAddOpen(false)} style={styles.formClose}>
                  <Text style={styles.formCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
              <AddOption mark="S" title="Screenshot" body="The fastest way." onPress={() => startNewItem('screenshot')} featured />
              <AddOption mark="N" title="Quick Note" body="Just type it." onPress={() => startNewItem('note')} />
              <AddOption mark="L" title="Booking Link" body="Paste confirmation." onPress={() => startNewItem('booking')} />
              <AddOption mark="P" title="Photo" body="Signs, documents, parking." onPress={() => startNewItem('photo')} />
              <AddOption mark="F" title="Flight Details" body="No screenshot? Add the basics." onPress={() => startNewItem('flight')} />
              <AddOption mark="H" title="Stay Details" body="Hotel, city, dates, code." onPress={() => startNewItem('stay')} />
              <Text style={styles.addPanelFooter}>Screenshots are fastest. Manual details are here when you do not have one.</Text>
            </View>
          </View>
        </Modal>
      )}

      {isQuickNoteOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={cancelDraftUpload}>
          <View style={styles.quickNoteBackdrop}>
            <View style={styles.quickNoteSheet}>
              <View style={styles.addSheetHandle} />
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Quick Note</Text>
                <TouchableOpacity onPress={cancelDraftUpload} style={styles.formClose}>
                  <Text style={styles.formCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={draft.note}
                onChangeText={(note) => setDraft((current) => ({ ...current, note }))}
                placeholder="What's important?"
                placeholderTextColor="rgba(32,38,35,0.42)"
                style={styles.quickNoteInput}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              <View style={styles.quickNoteActions}>
                <Button label="Save Note" onPress={saveQuickNote} disabled={!draft.note.trim()} />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {isReviewOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={cancelDraftUpload}>
          <View style={styles.reviewModalBackdrop}>
            <View style={styles.reviewModalSheet}>
              <PocketReviewCard
                draft={draft}
                onNow={() => {
                  setIsReviewOpen(false);
                  setIsMoreDetailsOpen(false);
                  setIsFormOpen(true);
                }}
                onLater={saveDraftLater}
                onDateChange={(date) => setDraft((current) => ({ ...current, date }))}
                onCancel={cancelDraftUpload}
              />
            </View>
          </View>
        </Modal>
      )}

      <PocketEditorModal
        visible={isFormOpen}
        title={getEditorTitle(draft, !!editingItemId)}
        draft={draft}
        editingItem={editingItem}
        isMoreDetailsOpen={isMoreDetailsOpen}
        onChange={setDraft}
        onClose={closeEditor}
        onSave={saveDraft}
        onDelete={confirmDeleteItem}
        onPickScreenshot={pickScreenshot}
        onRemoveScreenshot={() => setDraft((current) => ({ ...current, screenshotUri: undefined }))}
        onToggleMoreDetails={() => setIsMoreDetailsOpen((current) => !current)}
      />

      {!!items.length && (
        <View style={styles.sections}>
          <PocketSection title="Today" items={groups.today} onOpen={setSelectedItem} onEdit={editItem} />
          <PocketSection title="Tomorrow" items={groups.tomorrow} onOpen={setSelectedItem} onEdit={editItem} />
          <PocketSection title="Upcoming" items={groups.upcoming} onOpen={setSelectedItem} onEdit={editItem} />
          <PocketSection title="Pinned" items={groups.pinned} onOpen={setSelectedItem} onEdit={editItem} />
          <PocketSection title="Undated" items={groups.undated} onOpen={setSelectedItem} onEdit={editItem} />
        </View>
      )}

      <PocketViewer item={selectedItem} onClose={() => setSelectedItem(undefined)} onEdit={editItem} onDelete={confirmDeleteItem} />
    </View>
  );
}

function PocketNoTrip({
  trips,
  onBack,
  onSelectTrip,
  onCreateTrip,
}: {
  trips: TripDraft[];
  onBack: () => void;
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
}) {
  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back home</Text>
      <Text style={styles.title}>{trips.length ? 'Which trip?' : 'Start a trip first.'}</Text>
      <Text style={styles.body}>
        {trips.length
          ? 'Pocket can save details for any trip draft. Pick the trip these screenshots, codes, or notes belong to.'
          : 'Create a quick trip draft, then Pocket can hold the screenshots and confirmations you do not want to lose.'}
      </Text>
      {trips.length ? (
        <View style={styles.cardList}>
          {trips.slice(0, 6).map((trip) => (
            <TouchableOpacity key={trip.id} onPress={() => onSelectTrip(trip.id)} style={styles.tripChoice}>
              <ImageBackground source={{ uri: trip.heroImage }} style={styles.tripChoiceImage} imageStyle={styles.tripChoiceImageRadius} />
              <View style={styles.tripChoiceCopy}>
                <Text style={styles.tripChoiceTitle}>{trip.title}</Text>
                <Text style={styles.tripChoiceMeta}>{trip.pocketItems?.length ?? 0} pocket items</Text>
              </View>
              <Text style={styles.tripChoiceAction}>Open</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Button label="Start Trip Draft" onPress={onCreateTrip} />
      )}
    </View>
  );
}

function PocketPaywall({ trip, onBack, onUpgradeRequired }: { trip: TripDraft; onBack: () => void; onUpgradeRequired: () => void }) {
  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back home</Text>
      <Text style={styles.title}>The details you need fast.</Text>
      <Text style={styles.body}>Pocket saves screenshots, booking codes, and travel notes for {trip.title} so they are one tap away when the trip is happening.</Text>
      <View style={styles.paywallPreview}>
        <Text style={styles.nextKicker}>GoWandr Plus</Text>
        <Text style={styles.nextTitle}>Less digging through email and apps.</Text>
        <Text style={styles.nextBody}>Keep boarding passes, hotel confirmations, booking codes, and travel notes close.</Text>
        <Button label="Unlock Pocket" onPress={onUpgradeRequired} />
      </View>
    </View>
  );
}

function ShareSummaryPanel({
  options,
  onToggle,
  onShare,
}: {
  options: ShareSummaryOptions;
  onToggle: (key: keyof ShareSummaryOptions) => void;
  onShare: () => void;
}) {
  return (
    <View style={styles.sharePanel}>
      <Text style={styles.sharePanelTitle}>Choose what to share</Text>
      <Text style={styles.sharePanelBody}>Create a clean trip summary for someone you trust.</Text>
      <ShareOption label="Flights" active={options.flights} onPress={() => onToggle('flights')} />
      <ShareOption label="Stays" active={options.stays} onPress={() => onToggle('stays')} />
      <ShareOption label="Confirmation codes" active={options.codes} onPress={() => onToggle('codes')} />
      <ShareOption label="Notes" active={options.notes} onPress={() => onToggle('notes')} />
      <Button label="Share Summary" onPress={onShare} />
    </View>
  );
}

function ShareOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.shareOption}>
      <Text style={[styles.shareCheck, active && styles.shareCheckActive]}>{active ? 'On' : 'Off'}</Text>
      <Text style={styles.shareOptionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AddOption({ mark, title, body, onPress, featured = false }: { mark: string; title: string; body: string; onPress: () => void; featured?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.addOption, featured && styles.addOptionFeatured]}>
      <View style={[styles.addOptionIcon, featured && styles.addOptionIconFeatured]}>
        <Text style={styles.addOptionIconText}>{mark}</Text>
      </View>
      <View style={styles.addOptionCopy}>
        <Text style={[styles.addOptionTitle, featured && styles.addOptionTitleFeatured]}>{title}</Text>
        <Text style={[styles.addOptionBody, featured && styles.addOptionBodyFeatured]}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

function NeedItNowPromise() {
  return (
    <View style={styles.promiseCard}>
      <View style={styles.promiseIcon}>
        <Text style={styles.promiseIconText}>BP</Text>
      </View>
      <View style={styles.promiseCopy}>
        <Text style={styles.promiseTitle}>Boarding Pass</Text>
        <Text style={styles.promiseMeta}>Today</Text>
      </View>
    </View>
  );
}

function PocketReviewCard({
  draft,
  onNow,
  onLater,
  onDateChange,
  onCancel,
}: {
  draft: PocketDraft;
  onNow: () => void;
  onLater: () => void;
  onDateChange: (date: string) => void;
  onCancel: () => void;
}) {
  const [dateOpen, setDateOpen] = useState(false);

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHandle} />
      {draft.screenshotUri && <Image source={{ uri: draft.screenshotUri }} style={styles.reviewImage} resizeMode="cover" />}
      <View style={styles.reviewCopy}>
        <Text style={styles.reviewTitle}>Save this to Pocket?</Text>
        <Text style={styles.reviewBody}>Keep it quick, or add a label or note so it is easier to find later.</Text>
        <TouchableOpacity onPress={() => setDateOpen((current) => !current)} style={styles.reviewDateToggle}>
          <Text style={styles.reviewDateToggleText}>{draft.date ? formatDisplayDate(draft.date) : 'Add date'}</Text>
          <Text style={styles.reviewDateToggleAction}>{dateOpen ? 'Close' : 'Optional'}</Text>
        </TouchableOpacity>
        {dateOpen && (
          <View style={styles.reviewDatePanel}>
            <DateQuickPick value={draft.date} onChange={onDateChange} />
          </View>
        )}
        <View style={styles.reviewActions}>
          <TouchableOpacity onPress={onLater} style={styles.reviewPrimary}>
            <Text style={styles.reviewPrimaryText}>Save now</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNow} style={styles.reviewSecondary}>
            <Text style={styles.reviewSecondaryText}>Add details</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.reviewCancel}>
          <Text style={styles.reviewCancelText}>Cancel upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PocketEditorModal({
  visible,
  title,
  draft,
  editingItem,
  isMoreDetailsOpen,
  onChange,
  onClose,
  onSave,
  onDelete,
  onPickScreenshot,
  onRemoveScreenshot,
  onToggleMoreDetails,
}: {
  visible: boolean;
  title: string;
  draft: PocketDraft;
  editingItem?: PocketItem;
  isMoreDetailsOpen: boolean;
  onChange: (draft: PocketDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: (item: PocketItem) => void;
  onPickScreenshot: () => void;
  onRemoveScreenshot: () => void;
  onToggleMoreDetails: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.editorModal}>
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={onClose} style={styles.editorHeaderButton}>
            <Text style={styles.editorHeaderButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.editorHeaderTitle}>{title}</Text>
          <TouchableOpacity onPress={onSave} style={styles.editorHeaderButton}>
            <Text style={styles.editorHeaderButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
          <PocketFields
            draft={draft}
            onChange={onChange}
            onPickScreenshot={onPickScreenshot}
            onRemoveScreenshot={onRemoveScreenshot}
            isMoreDetailsOpen={isMoreDetailsOpen}
            onToggleMoreDetails={onToggleMoreDetails}
          />
          <View style={styles.editorSaveArea}>
            <Button label={editingItem ? 'Save Changes' : 'Save to Pocket'} onPress={onSave} />
            {!!editingItem && (
              <TouchableOpacity onPress={() => onDelete(editingItem)} style={styles.editorDeleteButton}>
                <Text style={styles.editorDeleteText}>Delete Pocket item</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function PocketFields({
  draft,
  onChange,
  onPickScreenshot,
  onRemoveScreenshot,
  isMoreDetailsOpen,
  onToggleMoreDetails,
}: {
  draft: PocketDraft;
  onChange: (draft: PocketDraft) => void;
  onPickScreenshot: () => void;
  onRemoveScreenshot: () => void;
  isMoreDetailsOpen: boolean;
  onToggleMoreDetails: () => void;
}) {
  const setField = (field: keyof PocketDraft, value: string | boolean) => onChange({ ...draft, [field]: value });
  const isManualFlight = draft.type === 'flight' && !draft.screenshotUri;
  const isManualStay = draft.type === 'stay' && !draft.screenshotUri;
  const isManualBooking = draft.type === 'reservation' && !draft.screenshotUri;

  if (isManualFlight) {
    return (
      <View>
        <PocketInput label="Airline / route" value={draft.title} onChangeText={(value) => setField('title', value)} placeholder="Delta ATL to MIA" />
        <DateQuickPick value={draft.date} onChange={(value) => setField('date', value)} />
        <TimeQuickPick value={draft.time} onChange={(value) => setField('time', value)} />
        <PocketInput label="Confirmation code" value={draft.confirmation} onChangeText={(value) => setField('confirmation', value)} placeholder="Optional" />
        <PocketInput label="Note" value={draft.note} onChangeText={(value) => setField('note', value)} placeholder="Flight number, terminal, or anything useful" multiline />
      </View>
    );
  }

  if (isManualStay) {
    return (
      <View>
        <PocketInput label="Hotel or stay" value={draft.title} onChangeText={(value) => setField('title', value)} placeholder="The Goodtime Hotel" />
        <PocketInput label="City" value={draft.city} onChangeText={(value) => setField('city', value)} placeholder="Miami" />
        <DateQuickPick label="Check-in" value={draft.date} onChange={(value) => setField('date', value)} />
        <DateQuickPick label="Check-out" value={draft.endDate} onChange={(value) => setField('endDate', value)} />
        <PocketInput label="Confirmation code" value={draft.confirmation} onChangeText={(value) => setField('confirmation', value)} placeholder="Optional" />
        <PocketInput label="Note" value={draft.note} onChangeText={(value) => setField('note', value)} placeholder="Door code, Wi-Fi, address, or check-in note" multiline />
      </View>
    );
  }

  if (isManualBooking) {
    return (
      <View>
        <PocketInput label="Booking link" value={draft.link} onChangeText={(value) => setField('link', value)} placeholder="Paste confirmation or booking link" keyboardType="url" autoCapitalize="none" />
        <PocketInput label="Label" value={draft.title} onChangeText={(value) => setField('title', value)} placeholder="Dinner reservation, parking, tour booking" />
        <DateQuickPick value={draft.date} onChange={(value) => setField('date', value)} />
        <PocketInput label="Confirmation code" value={draft.confirmation} onChangeText={(value) => setField('confirmation', value)} placeholder="Optional" />
        <PocketInput label="Note" value={draft.note} onChangeText={(value) => setField('note', value)} placeholder="Anything you need to remember" multiline />
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity onPress={onPickScreenshot} style={styles.screenshotButton}>
        <Text style={styles.screenshotButtonText}>{draft.screenshotUri ? 'Change screenshot or photo' : 'Add screenshot or photo'}</Text>
      </TouchableOpacity>
      {draft.screenshotUri && (
        <>
          <Image source={{ uri: draft.screenshotUri }} style={styles.screenshotPreview} resizeMode="cover" />
          <TouchableOpacity onPress={onRemoveScreenshot} style={styles.removeAttachmentButton}>
            <Text style={styles.removeAttachmentText}>Remove attachment</Text>
          </TouchableOpacity>
        </>
      )}

      <PocketInput label="Label" value={draft.title} onChangeText={(value) => setField('title', value)} placeholder="Hotel confirmation, boarding pass, dinner booking" />
      <DateQuickPick value={draft.date} onChange={(value) => setField('date', value)} />
      <PocketInput label="Note" value={draft.note} onChangeText={(value) => setField('note', value)} placeholder="Anything you need to remember" multiline />
      <TouchableOpacity onPress={onToggleMoreDetails} style={styles.moreDetailsButton}>
        <Text style={styles.moreDetailsText}>{isMoreDetailsOpen ? 'Hide More Details' : 'More Details'}</Text>
      </TouchableOpacity>
      {isMoreDetailsOpen && (
        <View style={styles.moreDetailsPanel}>
          <Text style={styles.inputLabel}>What is this?</Text>
          <TypePicker value={draft.type} onChange={(type) => setField('type', type)} />
          <TimeQuickPick value={draft.time} onChange={(value) => setField('time', value)} />
          <PocketInput label="City" value={draft.city} onChangeText={(value) => setField('city', value)} placeholder="Paris" />
          <PocketInput label="Confirmation code" value={draft.confirmation} onChangeText={(value) => setField('confirmation', value)} placeholder="Optional" />
          <PocketInput label="Link" value={draft.link} onChangeText={(value) => setField('link', value)} placeholder="Optional booking link" keyboardType="url" autoCapitalize="none" />
          <TouchableOpacity onPress={() => setField('pinned', !draft.pinned)} style={[styles.pinToggle, draft.pinned && styles.pinToggleActive]}>
            <Text style={[styles.pinToggleText, draft.pinned && styles.pinToggleTextActive]}>{draft.pinned ? 'Pinned near the top' : 'Pin near the top'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function TypePicker({ value, onChange }: { value: PocketItemType; onChange: (type: PocketItemType) => void }) {
  return (
    <View style={styles.typePicker}>
      {pocketTypes.map((type) => (
        <TouchableOpacity key={type} onPress={() => onChange(type)} style={[styles.typeChip, value === type && styles.typeChipActive]}>
          <Text style={[styles.typeChipText, value === type && styles.typeChipTextActive]}>{typeLabels[type]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DateQuickPick({ label = 'Date', value, onChange }: { label?: string; value: string; onChange: (value: string) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getDatePickerMonth(value));
  const calendarDays = buildCalendarDays(visibleMonth);

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const chooseDate = (date: Date) => {
    onChange(formatDateValue(date));
    setPickerOpen(false);
  };

  return (
    <View style={styles.dateBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.dateChips}>
        <DateChip label="No date" active={!value} onPress={() => onChange('')} />
        <DateChip label="Today" active={value === getDateOffset(0)} onPress={() => onChange(getDateOffset(0))} />
        <DateChip label="Tomorrow" active={value === getDateOffset(1)} onPress={() => onChange(getDateOffset(1))} />
      </View>
      <TouchableOpacity onPress={() => setPickerOpen((current) => !current)} style={styles.datePickerButton}>
        <Text style={[styles.datePickerButtonText, !value && styles.datePickerButtonPlaceholder]}>{value ? formatDisplayDate(value) : 'Pick a date'}</Text>
        <Text style={styles.datePickerChevron}>{pickerOpen ? 'Close' : 'Open'}</Text>
      </TouchableOpacity>
      {pickerOpen && (
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => moveMonth(-1)} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>{formatMonthLabel(visibleMonth)}</Text>
            <TouchableOpacity onPress={() => moveMonth(1)} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>Next</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              const dateValue = date ? formatDateValue(date) : '';
              const isSelected = !!date && value === dateValue;
              return (
                <TouchableOpacity
                  key={dateValue || `blank-${index}`}
                  disabled={!date}
                  onPress={() => date && chooseDate(date)}
                  style={[styles.calendarDay, isSelected && styles.calendarDaySelected, !date && styles.calendarDayBlank]}
                >
                  <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{date ? date.getDate() : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function DateChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.typeChip, active && styles.typeChipActive]}>
      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TimeQuickPick({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = parseTimeValue(value);
  const hour = selected.hour;
  const minute = selected.minute;
  const period = selected.period;

  const setTimePart = (next: Partial<ReturnType<typeof parseTimeValue>>) => {
    const merged = { hour, minute, period, ...next };
    onChange(`${merged.hour}:${merged.minute} ${merged.period}`);
  };

  return (
    <View style={styles.timeBlock}>
      <Text style={styles.inputLabel}>Time</Text>
      <View style={styles.dateChips}>
        <DateChip label="No time" active={!value} onPress={() => onChange('')} />
        <DateChip label="Morning" active={value === '9:00 AM'} onPress={() => onChange('9:00 AM')} />
        <DateChip label="Afternoon" active={value === '2:00 PM'} onPress={() => onChange('2:00 PM')} />
        <DateChip label="Evening" active={value === '7:00 PM'} onPress={() => onChange('7:00 PM')} />
      </View>
      <TouchableOpacity onPress={() => setPickerOpen((current) => !current)} style={styles.datePickerButton}>
        <Text style={[styles.datePickerButtonText, !value && styles.datePickerButtonPlaceholder]}>{value || 'Pick a time'}</Text>
        <Text style={styles.datePickerChevron}>{pickerOpen ? 'Close' : 'Open'}</Text>
      </TouchableOpacity>
      {pickerOpen && (
        <View style={styles.timePanel}>
          <Text style={styles.timePickerLabel}>Hour</Text>
          <View style={styles.timeChipGrid}>
            {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((item) => (
              <TouchableOpacity key={item} onPress={() => setTimePart({ hour: item })} style={[styles.timeChip, hour === item && styles.timeChipActive]}>
                <Text style={[styles.timeChipText, hour === item && styles.timeChipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.timePickerLabel}>Minute</Text>
          <View style={styles.timeChipRow}>
            {['00', '15', '30', '45'].map((item) => (
              <TouchableOpacity key={item} onPress={() => setTimePart({ minute: item })} style={[styles.timeChipWide, minute === item && styles.timeChipActive]}>
                <Text style={[styles.timeChipText, minute === item && styles.timeChipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.timePickerLabel}>AM / PM</Text>
          <View style={styles.timeChipRow}>
            {(['AM', 'PM'] as const).map((item) => (
              <TouchableOpacity key={item} onPress={() => setTimePart({ period: item })} style={[styles.timeChipWide, period === item && styles.timeChipActive]}>
                <Text style={[styles.timeChipText, period === item && styles.timeChipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function PocketInput({ label, compact, ...props }: { label: string; compact?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.inputWrap, compact && styles.inputCompact]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor="rgba(32,38,35,0.46)" style={[styles.input, props.multiline && styles.inputMultiline]} />
    </View>
  );
}

function PocketSection({
  title,
  items,
  onOpen,
  onEdit,
  compact = false,
}: {
  title: string;
  items: PocketItem[];
  onOpen: (item: PocketItem) => void;
  onEdit: (item: PocketItem) => void;
  compact?: boolean;
}) {
  if (!items.length) return null;
  return (
    <View style={[styles.section, compact && styles.recentSection]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardList}>
        {items.map((item) => (
          <PocketItemCard key={item.id} item={item} onOpen={() => onOpen(item)} onEdit={() => onEdit(item)} compact={compact} />
        ))}
      </View>
    </View>
  );
}

function PocketItemCard({ item, onOpen, onEdit, compact = false }: { item: PocketItem; onOpen: () => void; onEdit: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.86} style={[styles.pocketCard, compact && styles.pocketCardCompact]}>
      {item.screenshotUri ? (
        <View style={[styles.cardThumbFrame, compact && styles.cardThumbFrameCompact]}>
          <Image source={{ uri: item.screenshotUri }} style={styles.cardThumbImage} resizeMode="cover" />
          <View style={[styles.cardThumbCue, compact && styles.cardThumbCueCompact]}>
            <Text style={styles.cardThumbCueText}>View</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.cardThumbEmpty, compact && styles.cardThumbCompact]}>
          <Text style={styles.cardThumbEmptyText}>{typeLabels[item.type].slice(0, 2)}</Text>
        </View>
      )}
      <View style={styles.pocketCopy}>
        <View style={styles.pocketMetaRow}>
          <Text style={styles.pocketType}>{typeLabels[item.type]}</Text>
          {!!item.pinned && <Text style={styles.pinnedText}>Pinned</Text>}
        </View>
        <Text style={styles.pocketTitle}>{item.title}</Text>
        <Text style={styles.pocketDetail}>{getPocketItemDetail(item)}</Text>
        {!!item.confirmation && <Text style={styles.confirmationText}>Code: {item.confirmation}</Text>}
      </View>
      <TouchableOpacity onPress={onEdit} style={styles.editPill}>
        <Text style={styles.editPillText}>Edit</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function PocketViewer({ item, onClose, onEdit, onDelete }: { item?: PocketItem; onClose: () => void; onEdit: (item: PocketItem) => void; onDelete: (item: PocketItem) => void }) {
  const [imageOpen, setImageOpen] = useState(false);

  if (!item) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View style={styles.viewer}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.viewerButton}>
            <Text style={styles.viewerButtonText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.viewerHeaderActions}>
            <TouchableOpacity onPress={() => onDelete(item)} style={[styles.viewerButton, styles.viewerDeleteButton]}>
              <Text style={styles.viewerDeleteButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(item)} style={styles.viewerButton}>
              <Text style={styles.viewerButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        {item.screenshotUri ? (
          <TouchableOpacity onPress={() => setImageOpen(true)} activeOpacity={0.92} style={styles.viewerImageButton}>
            <Image source={{ uri: item.screenshotUri }} style={styles.viewerImage} resizeMode="contain" />
            <View style={styles.viewerImageCue}>
              <Text style={styles.viewerImageCueText}>Tap to enlarge</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.viewerEmptyImage}>
            <Text style={styles.viewerEmptyText}>{typeLabels[item.type]}</Text>
          </View>
        )}
        <View style={styles.viewerCopy}>
          <Text style={styles.viewerType}>{typeLabels[item.type]}{item.pinned ? ' / Pinned' : ''}</Text>
          <Text style={styles.viewerTitle}>{item.title}</Text>
          <Text style={styles.viewerDetail}>{getPocketItemDetail(item)}</Text>
          {!!item.confirmation && <Text style={styles.viewerCode}>Confirmation: {item.confirmation}</Text>}
          {!!item.note && <Text style={styles.viewerNote}>{item.note}</Text>}
          {!!item.link && (
            <TouchableOpacity onPress={() => openPocketLink(item.link)} style={styles.openLinkButton}>
              <Text style={styles.openLinkText}>Open link</Text>
            </TouchableOpacity>
          )}
          {!!item.screenshotUri && (
            <TouchableOpacity onPress={() => setImageOpen(true)} style={styles.openImageButton}>
              <Text style={styles.openImageText}>View full screen</Text>
            </TouchableOpacity>
          )}
        </View>
        <ZoomImageModal visible={imageOpen} uri={item.screenshotUri} title={item.title} onClose={() => setImageOpen(false)} />
      </View>
    </Modal>
  );
}

function ZoomImageModal({ visible, uri, title, onClose }: { visible: boolean; uri?: string; title: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const lastDistance = useRef<number | undefined>(undefined);
  const baseScale = useRef(1);

  const resetZoom = () => {
    setScale(1);
    baseScale.current = 1;
    lastDistance.current = undefined;
  };

  const close = () => {
    resetZoom();
    onClose();
  };

  if (!uri) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.zoomViewer}>
        <View style={styles.zoomHeader}>
          <TouchableOpacity onPress={close} style={styles.zoomHeaderButton}>
            <Text style={styles.zoomHeaderButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.zoomTitle} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={resetZoom} style={styles.zoomHeaderButton}>
            <Text style={styles.zoomHeaderButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
        <View
          style={styles.zoomStage}
          onTouchStart={(event) => {
            if (event.nativeEvent.touches.length === 2) {
              lastDistance.current = getTouchDistance(event.nativeEvent.touches);
              baseScale.current = scale;
            }
          }}
          onTouchMove={(event) => {
            if (event.nativeEvent.touches.length !== 2 || !lastDistance.current) return;
            const nextDistance = getTouchDistance(event.nativeEvent.touches);
            const nextScale = clamp(baseScale.current * (nextDistance / lastDistance.current), 1, 4);
            setScale(nextScale);
          }}
          onTouchEnd={() => {
            baseScale.current = scale;
            lastDistance.current = undefined;
          }}
        >
          <Image source={{ uri }} style={[styles.zoomImage, { transform: [{ scale }] }]} resizeMode="contain" />
        </View>
        <Text style={styles.zoomHint}>Pinch to zoom. Increase brightness if a scanner has trouble reading it.</Text>
      </View>
    </Modal>
  );
}

async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
  });
  return !result.canceled && result.assets[0]?.uri ? result.assets[0].uri : undefined;
}

function getDraftForAddKind(kind: AddKind): PocketDraft {
  if (kind === 'note') return { ...emptyDraft, type: 'note' };
  if (kind === 'booking') return { ...emptyDraft, type: 'reservation' };
  if (kind === 'flight') return { ...emptyDraft, type: 'flight' };
  if (kind === 'stay') return { ...emptyDraft, type: 'stay' };
  return { ...emptyDraft, type: 'other' };
}

function getEditorTitle(draft: PocketDraft, editing: boolean) {
  if (editing) return 'Edit Pocket item';
  if (draft.type === 'flight') return 'Flight Details';
  if (draft.type === 'stay') return 'Stay Details';
  if (draft.type === 'reservation' && !draft.screenshotUri) return 'Booking Link';
  return 'Add a few details';
}

function getDraftForPocketItem(item: PocketItem): PocketDraft {
  return {
    type: item.type,
    title: item.title,
    date: item.date ?? '',
    endDate: item.endDate ?? '',
    time: item.time ?? '',
    city: item.city ?? '',
    confirmation: item.confirmation ?? '',
    link: item.link ?? '',
    note: item.note ?? '',
    screenshotUri: item.screenshotUri,
    pinned: !!item.pinned,
  };
}

function hasPocketDraftChanges(draft: PocketDraft, editingItem?: PocketItem) {
  const baseline = editingItem ? getDraftForPocketItem(editingItem) : emptyDraft;
  return pocketDraftSignature(draft) !== pocketDraftSignature(baseline);
}

function pocketDraftSignature(draft: PocketDraft) {
  return JSON.stringify({
    type: draft.type,
    title: draft.title.trim(),
    date: draft.date.trim(),
    endDate: draft.endDate.trim(),
    time: draft.time.trim(),
    city: draft.city.trim(),
    confirmation: draft.confirmation.trim(),
    link: draft.link.trim(),
    note: draft.note.trim(),
    screenshotUri: draft.screenshotUri ?? '',
    pinned: !!draft.pinned,
  });
}

function buildPocketItem(draft: PocketDraft, editingItemId: string | undefined, now: string): PocketItem {
  return {
    id: editingItemId ?? `pocket-${Date.now()}`,
    type: draft.type,
    title: draft.title.trim() || getFallbackTitle(draft),
    date: draft.date.trim() || undefined,
    endDate: draft.endDate.trim() || undefined,
    time: draft.time.trim() || undefined,
    city: draft.city.trim() || undefined,
    confirmation: draft.confirmation.trim() || undefined,
    link: draft.link.trim() || undefined,
    note: draft.note.trim() || undefined,
    screenshotUri: draft.screenshotUri,
    pinned: draft.pinned || undefined,
    createdAt: now,
    updatedAt: editingItemId ? now : undefined,
  };
}

function getFallbackTitle(draft: PocketDraft) {
  if (draft.confirmation) return `${typeLabels[draft.type]} confirmation`;
  if (draft.type === 'note' && draft.note.trim()) return trimTitle(draft.note.trim());
  if (draft.type === 'flight') return draft.title.trim() || 'Flight details';
  if (draft.type === 'stay') return draft.title.trim() || 'Stay details';
  if (draft.screenshotUri && draft.type === 'other') return 'Pocket screenshot';
  if (draft.screenshotUri) return `${typeLabels[draft.type]} screenshot`;
  if (draft.type === 'note') return 'Travel note';
  return `${typeLabels[draft.type]} details`;
}

function trimTitle(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 42) return clean;
  return `${clean.slice(0, 39).trim()}...`;
}

function getNextPocketItem(items: PocketItem[]) {
  if (!items.length) return undefined;
  const now = new Date();
  const today = getDateOffset(0);
  const tomorrow = getDateOffset(1);
  const todayItems = [...items]
    .filter((item) => item.date === today)
    .sort((left, right) => getItemDateTime(left).getTime() - getItemDateTime(right).getTime());
  const upcomingToday = todayItems.find((item) => getItemDateTime(item).getTime() >= now.getTime() - 30 * 60 * 1000);
  if (upcomingToday) return upcomingToday;
  if (todayItems.length) return todayItems[todayItems.length - 1];

  const pinned = items.find((item) => item.pinned);
  if (pinned) return pinned;

  const dated = [...items]
    .filter((item) => item.date)
    .sort((left, right) => getSortTime(left) - getSortTime(right));
  return dated.find((item) => item.date === tomorrow) ?? dated.find((item) => getSortTime(item) >= startOfDay(now).getTime()) ?? items[0];
}

function groupPocketItems(items: PocketItem[]) {
  const today = getDateOffset(0);
  const tomorrow = getDateOffset(1);
  const sorted = [...items].sort((left, right) => getSortTime(left) - getSortTime(right));
  const recent = [...items]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);
  return {
    recent,
    pinned: sorted.filter((item) => item.pinned),
    today: sorted.filter((item) => item.date === today && !item.pinned),
    tomorrow: sorted.filter((item) => item.date === tomorrow && !item.pinned),
    upcoming: sorted.filter((item) => item.date && item.date > tomorrow && !item.pinned),
    undated: sorted.filter((item) => !item.date && !item.pinned),
  };
}

function getSortTime(item: PocketItem) {
  return new Date(`${item.date ?? '9999-12-31'}T${toSortableTime(item.time)}`).getTime();
}

function getItemDateTime(item: PocketItem) {
  return new Date(`${item.date ?? getDateOffset(0)}T${toSortableTime(item.time)}`);
}

function toSortableTime(time?: string) {
  if (!time) return '12:00:00';
  const parsed = Date.parse(`2026-01-01 ${time}`);
  if (Number.isNaN(parsed)) return '12:00:00';
  return new Date(parsed).toTimeString().slice(0, 8);
}

function parseTimeValue(value?: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const match = value?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return { hour: '9', minute: '00', period: 'AM' };
  const rawHour = Math.min(Math.max(Number(match[1]), 1), 12);
  const rawMinute = match[2] ?? '00';
  const minute = ['00', '15', '30', '45'].includes(rawMinute) ? rawMinute : '00';
  const period = match[3].toUpperCase() === 'PM' ? 'PM' : 'AM';
  return { hour: String(rawHour), minute, period };
}

function getTouchDistance(touches: ArrayLike<{ pageX: number; pageY: number }>) {
  const first = touches[0];
  const second = touches[1];
  const x = first.pageX - second.pageX;
  const y = first.pageY - second.pageY;
  return Math.sqrt(x * x + y * y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDatePickerMonth(value: string) {
  const parsed = parseDateValue(value);
  const base = parsed ?? new Date();
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: Array<Date | undefined> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(undefined);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  return days;
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateValue(date);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function formatDisplayDate(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function getPocketItemDetail(item: PocketItem) {
  return [formatDateRange(item.date, item.endDate), item.time, item.city, item.note].filter(Boolean).join(' / ') || 'Saved for quick recall';
}

function buildTravelSummary(trip: TripDraft, items: PocketItem[], options: ShareSummaryOptions) {
  const lines = [
    trip.title,
    trip.planStartDate ? `Dates: ${formatDateRange(trip.planStartDate, trip.planEndDate)}` : undefined,
    '',
    'Travel summary from GoWandr',
  ].filter((line): line is string => line !== undefined);

  const sections: string[] = [];
  if (options.flights) sections.push(formatSummarySection('Flights', items.filter(isFlightItem)));
  if (options.stays) sections.push(formatSummarySection('Stays', items.filter(isStayItem)));
  if (options.codes) sections.push(formatCodeSection(items.filter((item) => !!item.confirmation)));
  if (options.notes) sections.push(formatNoteSection(items.filter((item) => !!item.note || item.type === 'note')));

  const usefulSections = sections.filter(Boolean);
  if (!usefulSections.length) usefulSections.push('No selected Pocket details yet.');
  return [...lines, '', ...usefulSections].join('\n');
}

function formatSummarySection(title: string, items: PocketItem[]) {
  if (!items.length) return '';
  return [`${title}:`, ...items.map((item) => `- ${formatSummaryItem(item)}`)].join('\n');
}

function formatCodeSection(items: PocketItem[]) {
  if (!items.length) return '';
  return ['Confirmation codes:', ...items.map((item) => `- ${item.title}: ${item.confirmation}`)].join('\n');
}

function formatNoteSection(items: PocketItem[]) {
  if (!items.length) return '';
  return ['Notes:', ...items.map((item) => `- ${item.title}${item.note ? `: ${item.note}` : ''}`)].join('\n');
}

function formatSummaryItem(item: PocketItem) {
  const details = [formatDateRange(item.date, item.endDate), item.time, item.city, item.confirmation ? `Confirmation: ${item.confirmation}` : undefined, item.note]
    .filter(Boolean)
    .join(' | ');
  return details ? `${item.title} - ${details}` : item.title;
}

function isFlightItem(item: PocketItem) {
  const value = `${item.type} ${item.title}`.toLowerCase();
  return item.type === 'flight' || value.includes('flight') || value.includes('boarding') || value.includes('airline');
}

function isStayItem(item: PocketItem) {
  const value = `${item.type} ${item.title}`.toLowerCase();
  return item.type === 'stay' || value.includes('hotel') || value.includes('stay') || value.includes('check-in') || value.includes('check in');
}

function formatDateRange(start?: string, end?: string) {
  if (start && end) return `${start} to ${end}`;
  return start ?? '';
}

function openPocketLink(link?: string) {
  if (!link?.trim()) return;
  const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  Linking.openURL(normalized).catch(() => undefined);
}

const styles = StyleSheet.create({
  back: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', paddingVertical: 10 },
  kicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  title: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 38, lineHeight: 44, marginTop: 4 },
  body: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  previewBanner: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 14, backgroundColor: Platform.OS === 'android' ? '#E9FBF4' : 'rgba(168,240,212,0.26)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)' },
  previewBannerText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12.5, lineHeight: 17 },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: 12, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 14 },
  tripImage: { width: 64, height: 64, borderRadius: 18, overflow: 'hidden' },
  tripImageRadius: { borderRadius: 18 },
  tripCopy: { flex: 1 },
  tripLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 10.5, textTransform: 'uppercase' },
  tripTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 18, lineHeight: 23, marginTop: 3 },
  tripDates: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 12.5, marginTop: 2 },
  tripNextLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 10.5, textTransform: 'uppercase', marginTop: 8 },
  tripNextText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 13, lineHeight: 17, marginTop: 2 },
  nextCard: { gap: 9, borderRadius: 26, padding: 18, backgroundColor: '#10231D', borderWidth: 1, borderColor: 'rgba(168,240,212,0.18)', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  nextKicker: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  nextTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '800', fontSize: 22, lineHeight: 27 },
  nextBody: { ...androidTextReset, color: 'rgba(248,248,246,0.78)', fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  nextImage: { width: '100%', height: 170, borderRadius: 18, marginTop: 4 },
  promiseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, borderRadius: 18, padding: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(248,248,246,0.10)', opacity: 0.72 },
  promiseIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,248,246,0.12)' },
  promiseIconText: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  promiseCopy: { flex: 1 },
  promiseTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '800', fontSize: 16, lineHeight: 20 },
  promiseMeta: { ...androidTextReset, color: 'rgba(248,248,246,0.66)', fontFamily: font.semibold, fontWeight: '700', fontSize: 12, marginTop: 2 },
  shareSummaryButton: { borderRadius: 22, padding: 15, marginBottom: 14, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  shareSummaryTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 18, lineHeight: 23 },
  shareSummaryBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  sharePanel: { gap: 10, borderRadius: 24, padding: 15, marginBottom: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  sharePanelTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 20, lineHeight: 25 },
  sharePanelBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19 },
  shareOption: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderRadius: 16, paddingHorizontal: 12, backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  shareCheck: { ...androidTextReset, minWidth: 38, textAlign: 'center', color: 'rgba(32,38,35,0.48)', fontFamily: font.semibold, fontWeight: '800', fontSize: 11 },
  shareCheckActive: { color: colors.tealDark },
  shareOptionLabel: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 14 },
  quickCaptureButton: { minHeight: 132, borderRadius: 28, padding: 18, justifyContent: 'center', backgroundColor: '#A8F0D4', borderWidth: 1, borderColor: 'rgba(47,175,138,0.22)', shadowColor: '#173A33', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  quickCaptureIcon: { ...androidTextReset, width: 42, height: 42, borderRadius: 21, overflow: 'hidden', textAlign: 'center', lineHeight: 42, color: '#173A33', backgroundColor: 'rgba(255,255,255,0.62)', fontFamily: font.semibold, fontWeight: '800', fontSize: 24 },
  quickCaptureCopy: { flex: 1, minWidth: 0 },
  quickCaptureTitle: { ...androidTextReset, color: '#173A33', fontFamily: font.heading, fontWeight: '800', fontSize: 27, lineHeight: 32 },
  quickCaptureBody: { ...androidTextReset, color: 'rgba(23,58,51,0.72)', fontFamily: font.body, fontSize: 15, lineHeight: 21, marginTop: 5 },
  quickCapturePill: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 16, backgroundColor: '#173A33' },
  quickCapturePillText: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  secondaryAddButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 6 },
  secondaryAddText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  addPanel: { gap: 10, borderRadius: 26, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', marginTop: 14, marginBottom: 16 },
  addPanelSubhead: { ...androidTextReset, color: 'rgba(32,38,35,0.56)', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginTop: 4 },
  addOption: { flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 78, borderRadius: 20, padding: 14, backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  addOptionFeatured: { minHeight: 106, backgroundColor: '#A8F0D4', borderColor: 'rgba(47,175,138,0.24)' },
  addOptionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9FBF4' },
  addOptionIconFeatured: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.60)' },
  addOptionIconText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '800', fontSize: 16 },
  addOptionCopy: { flex: 1 },
  addOptionTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 17, lineHeight: 21 },
  addOptionTitleFeatured: { color: '#173A33', fontSize: 22, lineHeight: 27 },
  addOptionBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  addOptionBodyFeatured: { color: 'rgba(23,58,51,0.72)', fontSize: 14, lineHeight: 20 },
  addModalBackdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 18 : 12, backgroundColor: 'rgba(15,17,21,0.48)' },
  addModalSheet: { gap: 10, maxHeight: '88%', borderRadius: 30, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.96)' },
  addSheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, marginBottom: 8, backgroundColor: 'rgba(32,38,35,0.16)' },
  addPanelFooter: { ...androidTextReset, color: 'rgba(32,38,35,0.52)', fontFamily: font.body, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 2 },
  quickNoteBackdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 18 : 12, backgroundColor: 'rgba(15,17,21,0.48)' },
  quickNoteSheet: { borderRadius: 30, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.96)' },
  quickNoteInput: { minHeight: 154, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', backgroundColor: '#F8FAF9', color: colors.charcoal, fontFamily: font.body, fontSize: 19, lineHeight: 26, padding: 16, marginTop: 14 },
  quickNoteActions: { marginTop: 14 },
  formCard: { gap: 12, borderRadius: 26, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', marginBottom: 16 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  formTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 21 },
  formClose: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 4 },
  formCloseText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  reviewModalBackdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 18 : 12, backgroundColor: 'rgba(15,17,21,0.48)' },
  reviewModalSheet: { borderRadius: 30, overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.96)' },
  reviewCard: { padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.96)' },
  reviewHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, marginBottom: 14, backgroundColor: 'rgba(32,38,35,0.16)' },
  reviewImage: { width: '100%', height: 238, borderRadius: 22, backgroundColor: '#EEF2F0' },
  reviewCopy: { minWidth: 0, paddingTop: 16 },
  reviewTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 26, lineHeight: 31 },
  reviewBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14.5, lineHeight: 21, marginTop: 6 },
  reviewDateToggle: { minHeight: 46, borderRadius: 16, paddingHorizontal: 13, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  reviewDateToggleText: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 13.5 },
  reviewDateToggleAction: { ...androidTextReset, color: 'rgba(32,38,35,0.48)', fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  reviewDatePanel: { marginTop: 10, borderRadius: 20, padding: 12, backgroundColor: 'rgba(248,250,249,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  reviewActions: { gap: 10, marginTop: 18 },
  reviewPrimary: { minHeight: 54, borderRadius: 17, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#173A33', shadowColor: '#173A33', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  reviewPrimaryText: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, fontWeight: '800', fontSize: 15 },
  reviewSecondary: { minHeight: 54, borderRadius: 17, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.10)' },
  reviewSecondaryText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 15 },
  reviewCancel: { minHeight: 42, alignSelf: 'center', justifyContent: 'center', marginTop: 6, paddingHorizontal: 16 },
  reviewCancelText: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  editorModal: { flex: 1, backgroundColor: '#F6FFFB', paddingTop: Platform.OS === 'ios' ? 54 : 24 },
  editorHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(32,38,35,0.07)' },
  editorHeaderTitle: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 18, lineHeight: 22, textAlign: 'center' },
  editorHeaderButton: { minHeight: 40, minWidth: 58, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  editorHeaderButtonText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  editorScroll: { flex: 1 },
  editorContent: { padding: 18, paddingBottom: 56 },
  editorSaveArea: { marginTop: 26, paddingTop: 6 },
  editorDeleteButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  editorDeleteText: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '800', fontSize: 14 },
  typePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  typeChip: { minHeight: 38, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.76)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  typeChipActive: { backgroundColor: '#CFF8E9', borderColor: 'rgba(47,175,138,0.26)' },
  typeChipText: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  typeChipTextActive: { color: colors.tealDark },
  dateBlock: { marginTop: 12 },
  dateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  datePickerButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,38,35,0.10)', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.86)', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  datePickerButtonText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.body, fontSize: 14.5 },
  datePickerButtonPlaceholder: { color: 'rgba(32,38,35,0.46)' },
  datePickerChevron: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  calendarPanel: { marginTop: 10, borderRadius: 20, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  calendarNavButton: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9FBF4' },
  calendarNavText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  calendarTitle: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: { ...androidTextReset, width: `${100 / 7}%`, color: 'rgba(32,38,35,0.46)', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  calendarDaySelected: { backgroundColor: '#173A33' },
  calendarDayBlank: { opacity: 0 },
  calendarDayText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  calendarDayTextSelected: { color: colors.white },
  timeBlock: { marginTop: 12 },
  timePanel: { marginTop: 10, borderRadius: 20, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  timePickerLabel: { ...androidTextReset, color: 'rgba(32,38,35,0.58)', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginTop: 8, marginBottom: 8 },
  timeChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChipRow: { flexDirection: 'row', gap: 8 },
  timeChip: { width: '22.5%', minHeight: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  timeChipWide: { flex: 1, minHeight: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  timeChipActive: { backgroundColor: '#173A33', borderColor: '#173A33' },
  timeChipText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  timeChipTextActive: { color: colors.white },
  fieldRow: { flexDirection: 'row', gap: 10 },
  inputWrap: { flex: 1, marginTop: 10 },
  inputCompact: { flex: 1 },
  inputLabel: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, marginBottom: 6, textTransform: 'uppercase' },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,38,35,0.10)', backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.86)', color: colors.charcoal, fontFamily: font.body, fontSize: 14.5, paddingHorizontal: 13 },
  inputMultiline: { minHeight: 92, paddingTop: 13, textAlignVertical: 'top' },
  moreDetailsButton: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  moreDetailsText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  moreDetailsPanel: { marginTop: 12, borderRadius: 20, padding: 12, backgroundColor: 'rgba(248,250,249,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.06)' },
  screenshotButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4, backgroundColor: '#E9FBF4', borderWidth: 1, borderColor: 'rgba(47,175,138,0.22)' },
  screenshotButtonText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 14 },
  screenshotPreview: { width: '100%', height: 190, borderRadius: 18, marginTop: 10 },
  removeAttachmentButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  removeAttachmentText: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '800', fontSize: 12.5 },
  pinToggle: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  pinToggleActive: { backgroundColor: '#173A33', borderColor: '#173A33' },
  pinToggleText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  pinToggleTextActive: { color: colors.white },
  sections: { gap: 18, marginTop: 20, paddingBottom: 110 },
  section: { gap: 10 },
  recentSection: { marginTop: 4, marginBottom: 16 },
  sectionTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 22 },
  emptyState: { borderRadius: 22, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginTop: 16 },
  emptyTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 20, lineHeight: 25 },
  emptyBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  helperChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  helperChip: { minHeight: 36, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9FBF4' },
  helperChipText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  cardList: { gap: 12 },
  pocketCard: { flexDirection: 'row', gap: 12, borderRadius: 24, padding: 12, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#173A33', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  pocketCardCompact: { padding: 10, borderRadius: 20 },
  cardThumb: { width: 78, height: 92, borderRadius: 18, backgroundColor: '#EEF2F0' },
  cardThumbFrame: { width: 78, height: 92, borderRadius: 18, overflow: 'hidden', backgroundColor: '#EEF2F0' },
  cardThumbFrameCompact: { width: 54, height: 62, borderRadius: 15 },
  cardThumbImage: { width: '100%', height: '100%' },
  cardThumbCue: { position: 'absolute', left: 7, right: 7, bottom: 7, minHeight: 25, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,17,21,0.70)' },
  cardThumbCueCompact: { left: 5, right: 5, bottom: 5, minHeight: 21 },
  cardThumbCueText: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, fontWeight: '800', fontSize: 10.5 },
  cardThumbCompact: { width: 54, height: 62, borderRadius: 15 },
  cardThumbEmpty: { width: 78, height: 92, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F0' },
  cardThumbEmptyText: { ...androidTextReset, color: 'rgba(32,38,35,0.44)', fontFamily: font.semibold, fontWeight: '800', fontSize: 16 },
  pocketCopy: { flex: 1, minWidth: 0 },
  pocketMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pocketType: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 10.5, textTransform: 'uppercase' },
  pinnedText: { ...androidTextReset, color: '#8B6A00', fontFamily: font.semibold, fontWeight: '800', fontSize: 10.5, textTransform: 'uppercase' },
  pocketTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 18, lineHeight: 22, marginTop: 4 },
  pocketDetail: { ...androidTextReset, color: 'rgba(32,38,35,0.66)', fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  confirmationText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12.5, marginTop: 5 },
  editPill: { minHeight: 34, borderRadius: 999, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF9EF' },
  editPillText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  viewer: { flex: 1, backgroundColor: '#F6FFFB', paddingTop: Platform.OS === 'ios' ? 58 : 28 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  viewerHeaderActions: { flexDirection: 'row', gap: 8 },
  viewerButton: { minHeight: 40, borderRadius: 999, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  viewerButtonText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  viewerDeleteButton: { backgroundColor: '#FFF1EF' },
  viewerDeleteButtonText: { ...androidTextReset, color: '#B84A3F', fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  viewerImageButton: { width: '100%', height: '48%', backgroundColor: '#0F1115' },
  viewerImage: { width: '100%', height: '100%', backgroundColor: '#0F1115' },
  viewerImageCue: { position: 'absolute', right: 14, bottom: 14, minHeight: 34, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,17,21,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  viewerImageCueText: { ...androidTextReset, color: '#FFFFFF', fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  viewerEmptyImage: { width: '100%', height: '34%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10231D' },
  viewerEmptyText: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.heading, fontWeight: '800', fontSize: 24 },
  viewerCopy: { padding: 18 },
  viewerType: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  viewerTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 28, lineHeight: 34, marginTop: 6 },
  viewerDetail: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 8 },
  viewerCode: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 16, marginTop: 12 },
  viewerNote: { ...androidTextReset, color: 'rgba(32,38,35,0.74)', fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 12 },
  openLinkButton: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16, backgroundColor: '#173A33' },
  openLinkText: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, fontWeight: '800', fontSize: 14 },
  openImageButton: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16, backgroundColor: '#173A33' },
  openImageText: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, fontWeight: '800', fontSize: 14 },
  zoomViewer: { flex: 1, backgroundColor: '#050807', paddingTop: Platform.OS === 'ios' ? 54 : 24 },
  zoomHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  zoomHeaderButton: { minHeight: 40, minWidth: 64, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  zoomHeaderButtonText: { ...androidTextReset, color: '#FFFFFF', fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  zoomTitle: { ...androidTextReset, flex: 1, color: 'rgba(255,255,255,0.86)', fontFamily: font.semibold, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  zoomStage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  zoomImage: { width: '100%', height: '100%' },
  zoomHint: { ...androidTextReset, color: 'rgba(255,255,255,0.62)', fontFamily: font.body, fontSize: 12.5, lineHeight: 18, textAlign: 'center', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 28 : 20 },
  paywallPreview: { gap: 11, borderRadius: 26, padding: 18, backgroundColor: '#10231D', borderWidth: 1, borderColor: 'rgba(168,240,212,0.18)' },
  tripChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 10, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  tripChoiceImage: { width: 58, height: 58, borderRadius: 17, overflow: 'hidden' },
  tripChoiceImageRadius: { borderRadius: 17 },
  tripChoiceCopy: { flex: 1 },
  tripChoiceTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 16 },
  tripChoiceMeta: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 12.5, marginTop: 3 },
  tripChoiceAction: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
});
