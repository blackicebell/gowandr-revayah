import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { getMomentumStages, getNextBestStep } from '../logic/momentum';
import { paceGuidance } from '../logic/tripPace';
import { androidTextReset, colors, font } from '../theme/colors';
import { PlanChecklistItem, TripDraft } from '../types';
import { shareTripPlan } from '../utils/shareCards';

type ChecklistGroup = {
  title: string;
  helper: string;
  items: PlanChecklistItem[];
};

type ChecklistStatus = 'empty' | 'active' | 'complete';
type PlanningSection = 'checklist' | 'dates' | 'share' | 'reminders';

export function TripLabScreen({
  trip,
  trips,
  isPlus = false,
  onBack,
  onSelectTrip,
  onUpgradeRequired,
  onUndoFinalPlan,
  onUpdateChecklist,
  onUpdateDates,
}: {
  trip?: TripDraft;
  trips: TripDraft[];
  isPlus?: boolean;
  onBack: () => void;
  onSelectTrip: (tripId: string) => void;
  onUpgradeRequired?: () => void;
  onUndoFinalPlan: (tripId: string) => void;
  onUpdateChecklist: (tripId: string, checklist: PlanChecklistItem[]) => void;
  onUpdateDates: (tripId: string, dates: { startDate?: string; endDate?: string }) => void;
}) {
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [openPlanningSections, setOpenPlanningSections] = useState<PlanningSection[]>([]);
  const [morePlanningOpen, setMorePlanningOpen] = useState(false);
  const [showAllAnchors, setShowAllAnchors] = useState(false);

  if (!trip) {
    return <PlanEmptyState trips={trips} onBack={onBack} onSelectTrip={onSelectTrip} />;
  }

  const checklist = trip.planChecklist?.length ? trip.planChecklist : buildFallbackChecklist(trip);
  const guidance = paceGuidance[trip.pace];
  const topIdeas = trip.ideas.filter((idea) => idea.priority === 'Must-do').slice(0, guidance.idealMustDos);
  const backupIdeas = trip.ideas.filter((idea) => idea.priority !== 'Must-do').slice(0, 3);
  const doneCount = checklist.filter((item) => item.done).length;
  const progress = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
  const checklistGroups = buildChecklistGroups(checklist, trip.companionType);
  const nextItem = checklist.find((item) => !item.done);
  const focus = getNextBestStep({ ...trip, planChecklist: checklist });
  const timeline = getMomentumStages({ ...trip, planChecklist: checklist });
  const whyReasons = buildWhyReasons(trip, topIdeas);
  const readinessMessage = getReadinessMessage(progress);
  const dateSummary = getDateSummary(trip.planStartDate, trip.planEndDate);
  const focusPlanningSection = getFocusPlanningSection(focus.intent);
  const focusChecklistGroup = focus.intent === 'checklist' && nextItem ? findChecklistGroupTitle(nextItem, checklistGroups) : undefined;
  const effectiveMorePlanningOpen = morePlanningOpen || Boolean(focusPlanningSection);

  const updateChecklist = (items: PlanChecklistItem[]) => onUpdateChecklist(trip.id, items);

  const toggleTask = (taskId: string) => {
    updateChecklist(checklist.map((item) => (item.id === taskId ? { ...item, done: !item.done } : item)));
  };

  const deleteTask = (taskId: string) => {
    updateChecklist(checklist.filter((item) => item.id !== taskId));
  };

  const addTaskToGroup = (category: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    updateChecklist([...checklist, { id: `custom-${Date.now()}`, title: cleanTitle, done: false, category }]);
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((current) => (current.includes(title) ? current.filter((item) => item !== title) : [...current, title]));
  };

  const completeNextTask = () => {
    if (focus.intent === 'checklist' && nextItem) toggleTask(nextItem.id);
  };

  const addOpenPlanningSection = (section: PlanningSection) => {
    setOpenPlanningSections((current) => (current.includes(section) ? current : [...current, section]));
  };

  const togglePlanningSection = (section: PlanningSection) => {
    setOpenPlanningSections((current) => (current.includes(section) ? current.filter((item) => item !== section) : [...current, section]));
  };

  const handleFocusCta = () => {
    if (focus.intent === 'dates') {
      setMorePlanningOpen(true);
      addOpenPlanningSection('dates');
      return;
    }

    if (focus.intent === 'share') {
      setMorePlanningOpen(true);
      addOpenPlanningSection('share');
      return;
    }

    if (focus.intent === 'checklist') {
      setMorePlanningOpen(true);
      addOpenPlanningSection('checklist');
      if (focusChecklistGroup) {
        setOpenGroups((current) => (current.includes(focusChecklistGroup) ? current : [...current, focusChecklistGroup]));
      }
      completeNextTask();
    }
  };

  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back home</Text>

      <ImageBackground source={{ uri: trip.heroImage }} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.shade} />
        <View style={styles.committedBadge}>
          <Text style={styles.committedBadgeText}>Committed</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroLabel}>Your next trip</Text>
          <Text style={styles.heroTitle}>{trip.title}</Text>
          <Text style={styles.heroBody}>{trip.subtitle}</Text>
          <Text style={styles.heroNext}>Next: {focus.title}</Text>
        </View>
      </ImageBackground>

      <MomentumTimeline stages={timeline} />

      <View style={styles.todayCard}>
        <View style={styles.readinessHeader}>
          <View style={styles.readinessCopy}>
            <Text style={styles.readinessKicker}>Today's Focus</Text>
            <Text style={styles.readinessTitle}>{focus.title}</Text>
            <Text style={styles.todayReason}>{focus.reason}</Text>
            <Text style={styles.todayTime}>{focus.effort}</Text>
          </View>
          <TouchableOpacity onPress={handleFocusCta} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>{focus.intent === 'dates' ? 'Set dates' : focus.cta}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.readinessBody}>{doneCount} of {checklist.length} complete. {readinessMessage}</Text>
      </View>

      <View style={styles.whyCard}>
        <Text style={styles.whyKicker}>Why this trip?</Text>
        <Text style={styles.whyHelper}>{trip.companionType === 'Solo' ? 'The few moments that make this trip worth doing.' : 'The few moments that made this trip worth choosing.'}</Text>
        <View style={styles.anchorPillList}>
          {topIdeas.slice(0, 3).map((idea) => (
            <View key={idea.id} style={styles.anchorPill}>
              <Text style={styles.anchorPillText}>{idea.title}</Text>
            </View>
          ))}
          {!topIdeas.length && (
            <View style={styles.anchorPill}>
              <Text style={styles.anchorPillText}>No anchors chosen yet</Text>
            </View>
          )}
        </View>
        {whyReasons.slice(0, 2).map((reason) => (
          <View key={reason} style={styles.whyRow}>
            <Text style={styles.whyCheck}>OK</Text>
            <Text style={styles.whyText}>{reason}</Text>
          </View>
        ))}
        {showAllAnchors && (
          <View style={styles.ideaList}>
            {topIdeas.map((idea, index) => (
              <View key={idea.id} style={styles.ideaRow}>
                <Text style={styles.ideaNumber}>{index + 1}</Text>
                <View style={styles.ideaCopy}>
                  <Text style={styles.ideaTitle}>{idea.title}</Text>
                  <Text style={styles.ideaReason}>This is one of the reasons this trip is worth taking.</Text>
                  <Text style={styles.ideaMeta}>{idea.category}</Text>
                </View>
              </View>
            ))}
            {!!backupIdeas.length && (
              <View style={styles.backupStrip}>
                <Text style={styles.backupLabel}>Backup ideas</Text>
                <Text style={styles.backupText}>{backupIdeas.map((idea) => idea.title).join(' / ')}</Text>
              </View>
            )}
          </View>
        )}
        {(topIdeas.length > 0 || backupIdeas.length > 0) && (
          <TouchableOpacity onPress={() => setShowAllAnchors((current) => !current)} style={styles.viewAnchorsButton}>
            <Text style={styles.viewAnchorsText}>{showAllAnchors ? 'Hide anchors' : 'View all anchors'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.morePlanningCard}>
        <TouchableOpacity onPress={() => setMorePlanningOpen((current) => !current)} activeOpacity={0.82} style={styles.morePlanningHeader}>
          <View style={styles.morePlanningCopy}>
            <Text style={styles.morePlanningKicker}>More Planning</Text>
            <Text style={styles.morePlanningTitle}>Checklist, dates, sharing, and reminders.</Text>
          </View>
          <Text style={styles.morePlanningChevron}>{effectiveMorePlanningOpen ? 'v' : '+'}</Text>
        </TouchableOpacity>

        {!isPlus && effectiveMorePlanningOpen && (
          <View style={styles.plusPlanCard}>
            <Text style={styles.plusPlanKicker}>GoWandr Plus</Text>
            <Text style={styles.plusPlanTitle}>Keep this trip moving.</Text>
            <Text style={styles.plusPlanBody}>Unlock the full Plan workspace: checklist, dates, sharing, reminders, and every next step that turns a decision into a real trip.</Text>
            <Button label="Unlock full Plan" onPress={() => onUpgradeRequired?.()} />
          </View>
        )}

        {isPlus && effectiveMorePlanningOpen && (
          <View style={styles.morePlanningBody}>
            <PlanningAccordion
              title="Checklist"
              helper={`${doneCount} of ${checklist.length} prep tasks complete.`}
              open={openPlanningSections.includes('checklist') || focusPlanningSection === 'checklist'}
              focused={focusPlanningSection === 'checklist'}
              onToggle={() => togglePlanningSection('checklist')}
            >
              <Text style={styles.sectionHelper}>Open one category when you are ready to handle it.</Text>
              <View style={styles.checklist}>
                {checklistGroups.map((group) => (
                  <ChecklistAccordion
                    key={group.title}
                    group={group}
                    open={openGroups.includes(group.title) || focusChecklistGroup === group.title}
                    onToggle={() => toggleGroup(group.title)}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onAddTask={addTaskToGroup}
                  />
                ))}
              </View>
            </PlanningAccordion>

            <PlanningAccordion
              title="Trip Dates"
              helper={dateSummary}
              open={openPlanningSections.includes('dates') || focusPlanningSection === 'dates'}
              focused={focusPlanningSection === 'dates'}
              onToggle={() => togglePlanningSection('dates')}
            >
              <View style={styles.dateCard}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateHeaderCopy}>
                    <Text style={styles.dateKicker}>Dates</Text>
                    <Text style={styles.dateTitle}>{dateSummary}</Text>
                  </View>
                </View>
                <View style={styles.dateFields}>
                  <DateField label="Start" value={trip.planStartDate ?? ''} onChange={(startDate) => onUpdateDates(trip.id, { startDate, endDate: trip.planEndDate })} />
                  <DateField label="End" value={trip.planEndDate ?? ''} onChange={(endDate) => onUpdateDates(trip.id, { startDate: trip.planStartDate, endDate })} />
                </View>
              </View>
            </PlanningAccordion>

            <PlanningAccordion
              title="Share Plan"
              helper={trip.companionType === 'Solo' ? 'Send the essentials to someone trusted.' : 'Give the group the same simple plan.'}
              open={openPlanningSections.includes('share') || focusPlanningSection === 'share'}
              focused={focusPlanningSection === 'share'}
              onToggle={() => togglePlanningSection('share')}
            >
              <View style={styles.shareCard}>
                <ImageBackground source={{ uri: trip.heroImage }} style={styles.sharePreview} imageStyle={styles.sharePreviewImage}>
                  <View style={styles.shareShade} />
                  <Text style={styles.sharePreviewLabel}>GoWandr committed trip</Text>
                  <Text style={styles.sharePreviewTitle}>{trip.title}</Text>
                  <Text style={styles.sharePreviewMeta}>{topIdeas.length || trip.tags.length} anchors / Plan in progress</Text>
                </ImageBackground>
                <Text style={styles.shareTitle}>{trip.companionType === 'Solo' ? 'Share with someone trusted' : 'Share with the group'}</Text>
                <Text style={styles.shareBody}>{trip.companionType === 'Solo' ? 'Send the plan so someone knows the direction, rough dates, and main ideas.' : 'Send the committed plan and checklist so everyone knows what is decided and what still needs doing.'}</Text>
              </View>
              <View style={styles.shareActionWrap}>
                <Button label={trip.companionType === 'Solo' ? 'Share with someone trusted' : 'Share with the group'} onPress={() => shareTripPlan(trip, trip.pace, topIdeas)} />
              </View>
            </PlanningAccordion>

            <PlanningAccordion title="Helpful Reminders" helper="Small things worth remembering later." open={openPlanningSections.includes('reminders')} onToggle={() => togglePlanningSection('reminders')}>
              <View style={styles.moduleGrid}>
                <PlanModule label="Timeline" title="Before / during" body="Keep prep separate from the actual trip flow." />
                <PlanModule label="Budget" title="Range first" body="Agree on a comfortable range before booking anything." />
                <PlanModule label="Reservations" title="Track holds" body="Flights, stays, restaurants, and anchor activities." />
                <PlanModule label="Safety" title="Manual check" body="Save emergency contacts and key document notes." />
              </View>
            </PlanningAccordion>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onUndoFinalPlan(trip.id)} style={styles.reconsiderLink}>
          <Text style={styles.reconsiderText}>Need to reconsider this trip?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getDatePickerMonth(value));
  const calendarDays = buildCalendarDays(visibleMonth);

  const chooseDate = (date: Date) => {
    onChange(formatDateValue(date));
    setPickerOpen(false);
  };

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dateField}>
        <Text style={styles.dateFieldLabel}>{label}</Text>
        {React.createElement('input', {
          type: 'date',
          value,
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
          style: webDateInputStyle,
          'aria-label': `${label} trip date`,
        })}
      </View>
    );
  }

  return (
    <View style={styles.dateField}>
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <View style={styles.planDateChips}>
        <PlanDateChip label="No date" active={!value} onPress={() => onChange('')} />
        <PlanDateChip label="Today" active={value === getDateOffset(0)} onPress={() => onChange(getDateOffset(0))} />
        <PlanDateChip label="Tomorrow" active={value === getDateOffset(1)} onPress={() => onChange(getDateOffset(1))} />
      </View>
      <TouchableOpacity onPress={() => setPickerOpen((current) => !current)} style={styles.planDatePickerButton}>
        <Text style={[styles.planDatePickerText, !value && styles.planDatePickerPlaceholder]}>{value ? formatDisplayDate(value) : 'Pick a date'}</Text>
        <Text style={styles.planDatePickerAction}>{pickerOpen ? 'Close' : 'Open'}</Text>
      </TouchableOpacity>
      {pickerOpen && (
        <View style={styles.planCalendarPanel}>
          <View style={styles.planCalendarHeader}>
            <TouchableOpacity onPress={() => moveMonth(-1)} style={styles.planCalendarNavButton}>
              <Text style={styles.planCalendarNavText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.planCalendarTitle}>{formatMonthLabel(visibleMonth)}</Text>
            <TouchableOpacity onPress={() => moveMonth(1)} style={styles.planCalendarNavButton}>
              <Text style={styles.planCalendarNavText}>Next</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.planWeekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.planWeekdayText}>{day}</Text>
            ))}
          </View>
          <View style={styles.planCalendarGrid}>
            {calendarDays.map((date, index) => {
              const dateValue = date ? formatDateValue(date) : '';
              const selected = !!date && value === dateValue;
              return (
                <TouchableOpacity
                  key={dateValue || `blank-${index}`}
                  disabled={!date}
                  onPress={() => date && chooseDate(date)}
                  style={[styles.planCalendarDay, selected && styles.planCalendarDaySelected, !date && styles.planCalendarDayBlank]}
                >
                  <Text style={[styles.planCalendarDayText, selected && styles.planCalendarDayTextSelected]}>{date ? date.getDate() : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function PlanDateChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.planDateChip, active && styles.planDateChipActive]}>
      <Text style={[styles.planDateChipText, active && styles.planDateChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PlanModule({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <View style={styles.moduleCard}>
      <Text style={styles.moduleLabel}>{label}</Text>
      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.moduleBody}>{body}</Text>
    </View>
  );
}

function PlanningAccordion({
  title,
  helper,
  open,
  focused = false,
  onToggle,
  children,
}: {
  title: string;
  helper: string;
  open: boolean;
  focused?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.planningAccordion, focused && styles.planningAccordionFocused]}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.82} style={styles.planningAccordionHeader}>
        <View style={styles.planningAccordionCopy}>
          <View style={styles.planningTitleRow}>
            <Text style={styles.planningAccordionTitle}>{title}</Text>
            {focused && (
              <View style={styles.focusBadge}>
                <Text style={styles.focusBadgeText}>Focus</Text>
              </View>
            )}
          </View>
          <Text style={styles.planningAccordionHelper}>{helper}</Text>
        </View>
        <Text style={styles.planningAccordionChevron}>{open ? 'v' : '+'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.planningAccordionBody}>{children}</View>}
    </View>
  );
}

function MomentumTimeline({ stages }: { stages: ReturnType<typeof getMomentumStages> }) {
  return (
    <View style={styles.timelineCard}>
      <Text style={styles.timelineKicker}>Trip momentum</Text>
      <View style={styles.timelineRow}>
        {stages.map((stage, index) => (
          <View key={stage.label} style={styles.timelineStep}>
            <View style={[styles.timelineDot, stage.complete && styles.timelineDotDone, stage.current && styles.timelineDotCurrent]}>
              <Text style={[styles.timelineDotText, (stage.complete || stage.current) && styles.timelineDotTextActive]}>{stage.complete ? '✓' : stage.current ? '→' : ''}</Text>
            </View>
            {index < stages.length - 1 && <View style={[styles.timelineLine, stages[index + 1].complete && styles.timelineLineDone]} />}
            <Text style={[styles.timelineLabel, stage.current && styles.timelineLabelCurrent]}>{stage.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ChecklistAccordion({
  group,
  open,
  onToggle,
  onToggleTask,
  onDeleteTask,
  onAddTask,
}: {
  group: ChecklistGroup;
  open: boolean;
  onToggle: () => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (category: string, title: string) => void;
}) {
  const [newTask, setNewTask] = useState('');
  const animation = useRef(new Animated.Value(open ? 1 : 0)).current;
  const doneCount = group.items.filter((item) => item.done).length;
  const totalCount = group.items.length;
  const progress = totalCount ? doneCount / totalCount : 0;
  const status = getChecklistStatus(doneCount, totalCount);
  const meta = getChecklistGroupMeta(group.title);
  const nextItem = group.items.find((item) => !item.done);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: open ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animation, open]);

  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;
    onAddTask(group.title, title);
    setNewTask('');
  };

  return (
    <Animated.View style={[styles.checkGroup, open && styles.checkGroupOpen, status === 'active' && styles.checkGroupActive, status === 'complete' && styles.checkGroupComplete]}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.78} style={styles.checkGroupHeader}>
        <View style={styles.checkGroupHeaderTop}>
          <View style={styles.checkGroupTitleWrap}>
            <Text style={styles.checkGroupTitle}>{group.title}</Text>
            <Text style={styles.checkGroupHint}>{meta.preview}</Text>
            {!!nextItem && <Text style={styles.checkGroupNext}>Next: {nextItem.title}</Text>}
          </View>
          <View style={styles.checkGroupRight}>
            <Text style={[styles.checkGroupStatus, status === 'complete' && styles.checkGroupStatusComplete]}>
            {status === 'complete' ? '✓ Complete' : `${doneCount} of ${totalCount} complete`}
            </Text>
            <Animated.Text
              style={[
                styles.checkChevron,
                status === 'complete' && styles.checkChevronComplete,
                {
                  transform: [
                    {
                      rotate: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              v
            </Animated.Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.miniProgressTrack}>
        <View style={[styles.miniProgressFill, status === 'complete' && styles.miniProgressFillComplete, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <Animated.View
        style={{
          maxHeight: animation.interpolate({ inputRange: [0, 1], outputRange: [0, 720] }),
          opacity: animation,
          overflow: 'hidden',
        }}
      >
        <View style={styles.taskList}>
          {group.items.map((item) => (
            <View key={item.id} style={styles.taskRow}>
              <TouchableOpacity onPress={() => onToggleTask(item.id)} style={[styles.checkBox, item.done && styles.checkBoxDone]}>
                <Text style={styles.checkText}>{item.done ? 'OK' : ''}</Text>
              </TouchableOpacity>
              <Text style={[styles.taskTitle, item.done && styles.taskTitleDone]}>{item.title}</Text>
              <TouchableOpacity onPress={() => onDeleteTask(item.id)} style={styles.taskDelete}>
                <Text style={styles.taskDeleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.groupAddRow}>
            <TextInput value={newTask} onChangeText={setNewTask} placeholder={`Add to ${group.title.toLowerCase()}`} placeholderTextColor="rgba(32,38,35,0.48)" style={styles.taskInput} />
            <TouchableOpacity onPress={addTask} style={styles.addTaskButton}>
              <Text style={styles.addTaskText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function PlanEmptyState({ trips, onBack, onSelectTrip }: { trips: TripDraft[]; onBack: () => void; onSelectTrip: (tripId: string) => void }) {
  const candidates = useMemo(() => trips.slice(0, 6), [trips]);

  return (
    <View>
      <Text style={styles.back} onPress={onBack}>Back home</Text>
      <Text style={styles.kicker}>Plan</Text>
      <Text style={styles.title}>No final trip yet</Text>
      <Text style={styles.body}>Commit to one trip when it feels like the one to make happen. You can change it later.</Text>

      <View style={styles.emptyHero}>
        <Text style={styles.emptyHeroTitle}>How Plan starts</Text>
        <Text style={styles.emptyHeroBody}>Compare a few trip ideas, then commit to one. Or choose a draft yourself and start preparing.</Text>
      </View>

      <Text style={styles.sectionTitle}>Choose a trip to plan</Text>
      <View style={styles.candidateList}>
        {candidates.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => onSelectTrip(item.id)} style={styles.candidateRow}>
            <ImageBackground source={{ uri: item.heroImage }} style={styles.candidateThumb} imageStyle={styles.candidateThumbImage} />
            <View style={styles.candidateCopy}>
              <Text style={styles.candidateTitle}>{item.title}</Text>
              <Text style={styles.candidateMeta}>{item.pace} pace / {item.companionType}</Text>
            </View>
            <View style={styles.candidateActionPill}>
              <Text style={styles.candidateActionText}>Plan</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function buildFallbackChecklist(trip: TripDraft): PlanChecklistItem[] {
  const items = [
    { title: 'Confirm dates', category: 'Logistics' },
    { title: 'Set budget range', category: 'Logistics' },
    { title: 'Book flights or transport', category: 'Logistics' },
    { title: 'Book stay', category: 'Reservations' },
    { title: 'Save anchor reservations', category: 'Reservations' },
    { title: 'Plan arrival transport', category: 'Logistics' },
    { title: 'Check passport / visa needs', category: 'Documents' },
    { title: 'Check health, shots, or travel advisories', category: 'Documents' },
    { title: 'Pack essentials', category: 'Packing' },
    {
      title: trip.companionType === 'Solo' ? 'Share plan with a trusted person' : 'Share committed plan with the people going',
      category: trip.companionType === 'Solo' ? 'Safety share' : 'Group coordination',
    },
  ];

  return items.map((item, index) => ({ id: `fallback-${index}`, title: item.title, done: false, category: item.category }));
}

function buildChecklistGroups(checklist: PlanChecklistItem[], companionType: TripDraft['companionType']): ChecklistGroup[] {
  const groups: ChecklistGroup[] = [
    { title: 'Logistics', helper: 'Dates, transport, and arrival basics.', items: [] },
    { title: 'Reservations', helper: 'Hotels, flights, restaurants, and holds.', items: [] },
    { title: 'Documents', helper: 'Passport, visa, insurance, and safety.', items: [] },
    { title: 'Packing', helper: 'Clothing and essentials.', items: [] },
    { title: companionType === 'Solo' ? 'Safety share' : 'Group coordination', helper: companionType === 'Solo' ? 'Keep someone trusted in the loop.' : 'Make sure the group knows what is decided.', items: [] },
  ];

  checklist.forEach((item) => {
    const assignedIndex = groups.findIndex((group) => group.title.toLowerCase() === item.category?.toLowerCase());
    if (assignedIndex >= 0) {
      groups[assignedIndex].items.push(item);
      return;
    }

    const title = item.title.toLowerCase();
    let groupIndex = 0;
    if (title.includes('reservation') || title.includes('restaurant') || title.includes('activity') || title.includes('book stay') || title.includes('hotel') || title.includes('lodging')) groupIndex = 1;
    if (title.includes('passport') || title.includes('visa') || title.includes('health') || title.includes('shot') || title.includes('advisories') || title.includes('safety')) groupIndex = 2;
    if (title.includes('pack')) groupIndex = 3;
    if (title.includes('share') || title.includes('group') || title.includes('trusted') || title.includes('member')) groupIndex = 4;
    groups[groupIndex].items.push(item);
  });

  return groups.filter((group) => group.items.length);
}

function getChecklistStatus(doneCount: number, totalCount: number): ChecklistStatus {
  if (totalCount > 0 && doneCount === totalCount) return 'complete';
  if (doneCount > 0) return 'active';
  return 'empty';
}

function getChecklistGroupMeta(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes('reservation')) return { preview: 'Hotel, flights, restaurants' };
  if (normalized.includes('document')) return { preview: 'Passport, visa, insurance' };
  if (normalized.includes('packing')) return { preview: 'Clothing and essentials' };
  if (normalized.includes('group')) return { preview: 'Confirm attendees and share plans' };
  if (normalized.includes('safety')) return { preview: 'Share plans with someone trusted' };
  return { preview: 'Dates, transport, and arrival basics' };
}

function getFocusPlanningSection(intent: ReturnType<typeof getNextBestStep>['intent']): PlanningSection | undefined {
  if (intent === 'dates') return 'dates';
  if (intent === 'checklist') return 'checklist';
  if (intent === 'share') return 'share';
  return undefined;
}

function findChecklistGroupTitle(item: PlanChecklistItem, groups: ChecklistGroup[]) {
  return groups.find((group) => group.items.some((groupItem) => groupItem.id === item.id))?.title;
}

function buildWhyReasons(trip: TripDraft, topIdeas: TripDraft['ideas']) {
  const reasons: string[] = [];
  if (trip.latestMatchupResult?.summary) reasons.push(trip.latestMatchupResult.summary);
  topIdeas.slice(0, 2).forEach((idea) => {
    reasons.push(`${idea.title} is one of the anchors.`);
  });
  if (trip.tags.length) reasons.push(`${capitalize(trip.tags[0])} is the mood you chose.`);
  if (trip.pace) reasons.push(`${trip.pace} pace fits how this trip should feel.`);
  return reasons.slice(0, 4);
}

function buildSuggestedTasks(trip: TripDraft, checklist: PlanChecklistItem[]) {
  const existing = new Set(checklist.map((item) => item.title.toLowerCase()));
  const suggestions = [
    trip.companionType === 'Solo' ? 'Send stay details to a trusted person' : 'Assign one person to lodging research',
    trip.companionType === 'Solo' ? 'Save local emergency numbers' : 'Confirm who is actually in',
    'Check weather before packing',
    'Save confirmation numbers in one place',
    'List non-negotiable budget limits',
    trip.pace === 'Packed' ? 'Mark one flexible recovery block' : 'Pick one anchor reservation',
  ];

  return suggestions.filter((task) => !existing.has(task.toLowerCase())).slice(0, 4);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getReadinessMessage(progress: number) {
  if (progress >= 80) return 'This is feeling real. Keep the plan lightweight and confirm the last details.';
  if (progress >= 45) return 'You have momentum. Knock out the next practical step before adding more ideas.';
  return 'Start with the basics: dates, budget, transport, stay, and the first anchor.';
}

function getDateSummary(startDate?: string, endDate?: string) {
  if (startDate && endDate) return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  if (startDate) return `Starts ${formatDate(startDate)}`;
  if (endDate) return `Ends ${formatDate(endDate)}`;
  return 'Dates not set yet';
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

const webDateInputStyle = {
  width: '100%',
  minHeight: 46,
  border: '0',
  outline: 'none',
  color: '#202623',
  fontSize: 15,
  fontFamily: 'InterTight_500Medium',
} as const;

const styles = StyleSheet.create({
  back: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', paddingVertical: 10 },
  kicker: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', textTransform: 'uppercase', fontSize: 12 },
  title: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 36, lineHeight: 43, marginTop: 4, letterSpacing: -0.36 },
  body: { color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 18 },
  hero: { minHeight: 206, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  heroImage: { borderRadius: 28 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.36)' },
  heroCopy: { padding: 18, paddingRight: 88 },
  heroLabel: { color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '600', textTransform: 'uppercase', fontSize: 11 },
  heroTitle: { color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 29, lineHeight: 34, marginTop: 5, letterSpacing: -0.29 },
  heroBody: { ...androidTextReset, color: 'rgba(255,255,255,0.88)', fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  heroNext: { ...androidTextReset, alignSelf: 'flex-start', color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 12, lineHeight: 16, marginTop: 10, borderRadius: 999, overflow: 'hidden', backgroundColor: '#A8F0D4', paddingHorizontal: 10, paddingVertical: 6 },
  committedBadge: { position: 'absolute', right: 16, top: 16, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: Platform.OS === 'android' ? '#A8F0D4' : 'rgba(168,240,212,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)' },
  committedBadgeText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  readinessRing: { position: 'absolute', right: 16, top: 16, width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#A8F0D4' : 'rgba(168,240,212,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)' },
  readinessValue: { ...androidTextReset, color: '#173A33', fontFamily: font.heading, fontWeight: '700', fontSize: 18 },
  readinessLabel: { ...androidTextReset, color: 'rgba(23,58,51,0.72)', fontFamily: font.semibold, fontWeight: '600', fontSize: 10, marginTop: -2 },
  dateCard: { borderRadius: 24, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3, marginBottom: 12 },
  dateHeader: { marginBottom: 14 },
  dateHeaderCopy: { flex: 1 },
  dateKicker: { color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  dateTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 19, lineHeight: 24, marginTop: 4 },
  dateFields: { gap: 12 },
  dateField: { minHeight: 74, borderRadius: 18, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', padding: 13, justifyContent: 'center' },
  dateFieldLabel: { ...androidTextReset, color: colors.muted, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
  dateHelper: { color: colors.muted, fontFamily: font.body, fontSize: 13, lineHeight: 18, marginTop: 11 },
  planDateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 9 },
  planDateChip: { minHeight: 36, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  planDateChipActive: { backgroundColor: '#CFF8E9', borderColor: 'rgba(47,175,138,0.26)' },
  planDateChipText: { ...androidTextReset, color: 'rgba(32,38,35,0.62)', fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  planDateChipTextActive: { color: colors.tealDark },
  planDatePickerButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,38,35,0.10)', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planDatePickerText: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.body, fontSize: 14.5 },
  planDatePickerPlaceholder: { color: 'rgba(32,38,35,0.46)' },
  planDatePickerAction: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  planCalendarPanel: { marginTop: 10, borderRadius: 20, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  planCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  planCalendarNavButton: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9FBF4' },
  planCalendarNavText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '800', fontSize: 12 },
  planCalendarTitle: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.heading, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  planWeekdayRow: { flexDirection: 'row', marginBottom: 6 },
  planWeekdayText: { ...androidTextReset, width: `${100 / 7}%`, color: 'rgba(32,38,35,0.46)', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textAlign: 'center' },
  planCalendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  planCalendarDay: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  planCalendarDaySelected: { backgroundColor: '#173A33' },
  planCalendarDayBlank: { opacity: 0 },
  planCalendarDayText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '800', fontSize: 13 },
  planCalendarDayTextSelected: { color: colors.white },
  whyCard: { borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3, gap: 10, marginBottom: 12 },
  whyKicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  whyHelper: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: -4 },
  whyRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  whyCheck: { ...androidTextReset, width: 24, height: 24, borderRadius: 12, lineHeight: 24, textAlign: 'center', overflow: 'hidden', backgroundColor: '#A8F0D4', color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 9 },
  whyText: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.body, fontSize: 14.5, lineHeight: 20 },
  anchorPillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  anchorPill: { maxWidth: '100%', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.44)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)' },
  anchorPillText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13 },
  viewAnchorsButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.68)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  viewAnchorsText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  timelineCard: { borderRadius: 24, padding: 15, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3, marginBottom: 12 },
  timelineKicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', marginBottom: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStep: { flex: 1, alignItems: 'center', minHeight: 58 },
  timelineDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,38,35,0.06)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', zIndex: 2 },
  timelineDotDone: { backgroundColor: '#2FAF8A', borderColor: '#2FAF8A' },
  timelineDotCurrent: { backgroundColor: 'rgba(168,240,212,0.78)', borderColor: 'rgba(47,175,138,0.28)' },
  timelineDotText: { ...androidTextReset, color: 'rgba(32,38,35,0.4)', fontFamily: font.semibold, fontWeight: '700', fontSize: 12 },
  timelineDotTextActive: { color: '#173A33' },
  timelineLine: { position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, backgroundColor: 'rgba(32,38,35,0.08)', zIndex: 1 },
  timelineLineDone: { backgroundColor: 'rgba(47,175,138,0.38)' },
  timelineLabel: { ...androidTextReset, color: 'rgba(32,38,35,0.48)', fontFamily: font.semibold, fontWeight: '600', fontSize: 10.5, marginTop: 8, textAlign: 'center' },
  timelineLabelCurrent: { color: colors.tealDark },
  todayCard: { borderRadius: 26, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)', shadowColor: '#2FAF8A', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 5, marginBottom: 12 },
  readinessCard: { borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4, marginBottom: 12 },
  readinessHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  readinessCopy: { flex: 1 },
  readinessKicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  readinessTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 21, lineHeight: 25, marginTop: 4 },
  readinessPercent: { ...androidTextReset, color: colors.tealDark, fontFamily: font.heading, fontWeight: '700', fontSize: 26 },
  readinessBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 12 },
  todayReason: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  todayTime: { ...androidTextReset, alignSelf: 'flex-start', color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 12, lineHeight: 16, marginTop: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.42)', paddingHorizontal: 9, paddingVertical: 5 },
  todayButton: { minHeight: 48, borderRadius: 17, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4', borderWidth: 1, borderColor: 'rgba(47,175,138,0.18)', shadowColor: '#2FAF8A', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  todayButtonText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 13 },
  nextStepPill: { marginTop: 13, borderRadius: 18, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.44)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.24)', padding: 12, gap: 3 },
  nextStepLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  nextStepText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '600', fontSize: 14 },
  resultCard: { borderRadius: 22, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 4 },
  resultLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  resultTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 20, marginTop: 5 },
  resultBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  morePlanningCard: { borderRadius: 26, padding: 16, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3, marginTop: 2 },
  morePlanningHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  morePlanningCopy: { flex: 1 },
  morePlanningKicker: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  morePlanningTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 18, lineHeight: 23, marginTop: 5 },
  morePlanningChevron: { ...androidTextReset, width: 34, height: 34, borderRadius: 17, lineHeight: 33, textAlign: 'center', overflow: 'hidden', color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 15, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.42)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.16)' },
  morePlanningBody: { gap: 10, paddingTop: 12 },
  plusPlanCard: { gap: 10, borderRadius: 22, padding: 16, marginTop: 12, backgroundColor: Platform.OS === 'android' ? '#14231F' : 'rgba(20,35,31,0.96)', borderWidth: 1, borderColor: 'rgba(168,240,212,0.24)' },
  plusPlanKicker: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  plusPlanTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 21, lineHeight: 26 },
  plusPlanBody: { ...androidTextReset, color: 'rgba(248,248,246,0.78)', fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  planningAccordion: { borderRadius: 22, padding: 14, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(248,250,249,0.66)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  planningAccordionFocused: { borderColor: 'rgba(47,175,138,0.32)', backgroundColor: Platform.OS === 'android' ? '#F0FFF9' : 'rgba(240,255,249,0.84)' },
  planningAccordionHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  planningAccordionCopy: { flex: 1 },
  planningTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  planningAccordionTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 17 },
  planningAccordionHelper: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  planningAccordionChevron: { ...androidTextReset, width: 30, height: 30, borderRadius: 15, lineHeight: 29, textAlign: 'center', overflow: 'hidden', color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)' },
  planningAccordionBody: { paddingTop: 12 },
  focusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#A8F0D4' },
  focusBadgeText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '700', fontSize: 10 },
  sectionTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 21, marginTop: 20, marginBottom: 9, letterSpacing: -0.2 },
  sectionHelper: { color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 14, lineHeight: 20, marginTop: -4, marginBottom: 10 },
  ideaList: { gap: 10 },
  ideaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.paper, padding: 14, borderWidth: 1, borderColor: colors.line },
  ideaNumber: { width: 34, height: 34, borderRadius: 17, textAlign: 'center', textAlignVertical: 'center', lineHeight: 34, backgroundColor: colors.teal, color: colors.white, fontFamily: font.semibold, fontWeight: '600' },
  ideaCopy: { flex: 1 },
  ideaTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16 },
  ideaReason: { color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 18, marginTop: 3 },
  ideaMeta: { color: colors.muted, fontFamily: font.semibold, fontWeight: '600', marginTop: 2 },
  emptyState: { borderRadius: 20, backgroundColor: colors.paper, padding: 16, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16 },
  emptyBody: { color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 14, lineHeight: 20, marginTop: 5 },
  backupStrip: { marginTop: 10, borderRadius: 18, padding: 13, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.64)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  backupLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  backupText: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  paceNote: { backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : colors.cloud, borderRadius: 20, padding: 14, marginTop: 14, borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  paceNoteTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 15 },
  paceNoteBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontWeight: '400', fontSize: 14, lineHeight: 20, marginTop: 5 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.08)', overflow: 'hidden', marginTop: 14 },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: '#2FAF8A' },
  checklist: { gap: 12 },
  checkGroup: { borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', gap: 13 },
  checkGroupOpen: { backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.9)', shadowColor: '#173A33', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  checkGroupActive: { borderColor: 'rgba(47,175,138,0.24)' },
  checkGroupComplete: { borderColor: 'rgba(35,151,110,0.34)', backgroundColor: 'rgba(240,255,249,0.92)' },
  checkGroupHeader: { minHeight: 66, gap: 10, borderRadius: 18 },
  checkGroupHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkGroupTitleWrap: { flex: 1, minWidth: 0 },
  checkGroupTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 18, lineHeight: 23 },
  checkGroupHint: { ...androidTextReset, color: 'rgba(32,38,35,0.52)', fontFamily: font.body, fontSize: 13, lineHeight: 18, marginTop: 4 },
  checkGroupNext: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 12, lineHeight: 17, marginTop: 3 },
  checkGroupRight: { width: 82, alignItems: 'flex-end', gap: 7 },
  checkGroupCount: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 12 },
  checkGroupStatus: { ...androidTextReset, color: 'rgba(32,38,35,0.52)', fontFamily: font.semibold, fontWeight: '600', fontSize: 10.5, lineHeight: 14, textAlign: 'right' },
  checkGroupStatusComplete: { color: '#23976E' },
  checkChevron: { ...androidTextReset, width: 30, height: 30, borderRadius: 15, lineHeight: 29, textAlign: 'center', overflow: 'hidden', color: colors.tealDark, fontFamily: font.semibold, fontWeight: '700', fontSize: 13, backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.38)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.14)' },
  checkChevronComplete: { backgroundColor: 'rgba(47,175,138,0.18)', borderColor: 'rgba(47,175,138,0.24)' },
  miniProgressTrack: { height: 4, borderRadius: 999, backgroundColor: 'rgba(32,38,35,0.08)', overflow: 'hidden' },
  miniProgressFill: { height: 4, borderRadius: 999, backgroundColor: '#A8F0D4' },
  miniProgressFillComplete: { backgroundColor: '#2FAF8A' },
  taskList: { gap: 9, paddingTop: 3 },
  checkGroupHelper: { color: colors.muted, fontFamily: font.body, fontSize: 13, lineHeight: 19, marginBottom: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 18, backgroundColor: Platform.OS === 'android' ? '#F8FAF9' : 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', paddingHorizontal: 12, paddingVertical: 8 },
  checkBox: { width: 30, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(32,38,35,0.16)', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.68)' },
  checkBoxDone: { backgroundColor: '#2FAF8A', borderColor: '#2FAF8A' },
  checkText: { ...androidTextReset, color: colors.white, fontFamily: font.semibold, fontSize: 10, fontWeight: '600' },
  taskTitle: { ...androidTextReset, flex: 1, color: colors.charcoal, fontFamily: font.body, fontSize: 14.5, lineHeight: 20 },
  taskTitleDone: { color: 'rgba(32,38,35,0.46)', textDecorationLine: 'line-through' },
  taskDelete: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 6 },
  taskDeleteText: { ...androidTextReset, color: 'rgba(184,74,63,0.82)', fontFamily: font.semibold, fontSize: 12, fontWeight: '600' },
  groupAddRow: { flexDirection: 'row', gap: 9, paddingTop: 3 },
  addTaskRow: { flexDirection: 'row', gap: 9, marginTop: 10 },
  taskInput: { flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,38,35,0.08)', backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.76)', color: colors.charcoal, fontFamily: font.body, paddingHorizontal: 14, fontSize: 14 },
  addTaskButton: { minWidth: 72, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8F0D4' },
  addTaskText: { ...androidTextReset, color: '#173A33', fontFamily: font.semibold, fontWeight: '600' },
  suggestionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestionCard: { width: '48%', minHeight: 86, borderRadius: 20, padding: 13, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  suggestionPlus: { ...androidTextReset, width: 28, height: 28, borderRadius: 14, lineHeight: 28, textAlign: 'center', backgroundColor: '#A8F0D4', color: '#173A33', fontFamily: font.semibold, fontWeight: '700', marginBottom: 8 },
  suggestionText: { ...androidTextReset, color: colors.charcoal, fontFamily: font.semibold, fontWeight: '600', fontSize: 13.5, lineHeight: 18 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: { width: '48%', minHeight: 128, borderRadius: 22, padding: 14, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  moduleLabel: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  moduleTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 17, marginTop: 8 },
  moduleBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  shareCard: { borderRadius: 26, padding: 16, backgroundColor: '#14231F', marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  sharePreview: { minHeight: 176, justifyContent: 'flex-end', borderRadius: 22, overflow: 'hidden', padding: 16, marginBottom: 16 },
  sharePreviewImage: { borderRadius: 20 },
  shareShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.36)' },
  sharePreviewLabel: { ...androidTextReset, color: '#A8F0D4', fontFamily: font.semibold, fontWeight: '600', fontSize: 11, textTransform: 'uppercase' },
  sharePreviewTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 25, lineHeight: 30, marginTop: 6 },
  sharePreviewMeta: { ...androidTextReset, color: 'rgba(255,255,255,0.84)', fontFamily: font.body, fontSize: 13.5, marginTop: 4 },
  shareTitle: { ...androidTextReset, color: colors.white, fontFamily: font.heading, fontWeight: '700', fontSize: 18 },
  shareBody: { ...androidTextReset, color: 'rgba(248,248,246,0.74)', fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  shareActionWrap: { marginBottom: 22 },
  actions: { gap: 10, marginTop: 8 },
  reconsiderLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  reconsiderText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 14 },
  emptyHero: { borderRadius: 24, padding: 18, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)', marginBottom: 4 },
  emptyHeroTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 20 },
  emptyHeroBody: { ...androidTextReset, color: colors.muted, fontFamily: font.body, fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  candidateList: { gap: 10 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.78)', paddingVertical: 10, paddingLeft: 10, paddingRight: 14, borderWidth: 1, borderColor: 'rgba(32,38,35,0.07)' },
  candidateThumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden' },
  candidateThumbImage: { borderRadius: 16 },
  candidateCopy: { flex: 1 },
  candidateTitle: { ...androidTextReset, color: colors.charcoal, fontFamily: font.heading, fontWeight: '700', fontSize: 16 },
  candidateMeta: { ...androidTextReset, color: colors.muted, fontFamily: font.semibold, fontWeight: '600', fontSize: 12, marginTop: 3 },
  candidateActionPill: { minHeight: 38, minWidth: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#DDF9EF' : 'rgba(168,240,212,0.48)', borderWidth: 1, borderColor: 'rgba(47,175,138,0.2)', paddingHorizontal: 14 },
  candidateActionText: { ...androidTextReset, color: colors.tealDark, fontFamily: font.semibold, fontWeight: '600', fontSize: 13 },
});
