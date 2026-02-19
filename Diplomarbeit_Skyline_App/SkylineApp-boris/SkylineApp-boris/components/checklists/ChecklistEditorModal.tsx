import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BorderRadius, Colors, IconSizes, Spacing, Typography } from '../../constants/DesignTokens';
import { useAppStore } from '../../store';
import { Checklist, ChecklistItem, ChecklistTemplate, Purpose } from '../../types';
import AppModal from '../AppModal';
import { useToast } from '../ToastProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  flightId: string;
  checklistToEdit?: Checklist | null;
};

// Helper function for date formatting
const formatReminderForDisplay = (isoDate: string | undefined): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

export default function ChecklistEditorModal({ visible, onClose, flightId, checklistToEdit }: Props) {
  const addChecklist = useAppStore((s: any) => s.addChecklist);
  const updateChecklist = useAppStore((s: any) => s.updateChecklistAction);
  const loadTemplatesByPurpose = useAppStore((s: any) => s.loadTemplatesByPurpose);
  const templates = useAppStore((s: any) => s.templates);
  const { showToast } = useToast();

  const [purpose, setPurpose] = useState<Purpose>(checklistToEdit?.purpose || 'private');
  const [title, setTitle] = useState<string>(checklistToEdit?.title || '');
  const [items, setItems] = useState<ChecklistItem[]>((checklistToEdit?.items || []).map((i, idx) => ({ ...i, orderIndex: idx })));
  const [reminderAt, setReminderAt] = useState<string | undefined>(checklistToEdit?.reminderAt);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(() => {
    if (checklistToEdit?.reminderAt) {
      return new Date(checklistToEdit.reminderAt);
    }
    return new Date();
  });
  const [isSaving, setIsSaving] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const templateRequestRef = useRef(0);

  const loadTemplates = useCallback(async (nextPurpose: Purpose) => {
    const requestId = ++templateRequestRef.current;
    setTemplatesLoading(true);
    try {
      await loadTemplatesByPurpose(nextPurpose);
    } catch (error) {
      if (__DEV__) console.error('Error loading templates:', error);
    } finally {
      if (templateRequestRef.current === requestId) {
        setTemplatesLoading(false);
      }
    }
  }, [loadTemplatesByPurpose]);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;

    const loadChecklistData = async () => {
      const initialPurpose: Purpose = checklistToEdit?.purpose || 'private';
      await loadTemplates(initialPurpose);
      if (!isMounted) return;

      if (checklistToEdit?.id) {
        try {
          const { supabaseService } = await import('../../services/supabase');
          const freshChecklist = await supabaseService.getChecklists(flightId);
          const found = freshChecklist.find(c => c.id === checklistToEdit.id);
          const source = found || checklistToEdit;

          setPurpose(source.purpose || 'private');
          setTitle(source.title || '');
          setItems((source.items || []).map((i, idx) => ({ ...i, orderIndex: i.orderIndex ?? idx })));
          if (source.reminderAt) {
            const date = new Date(source.reminderAt);
            setReminderDate(date);
            setReminderAt(source.reminderAt);
          } else {
            setReminderDate(new Date());
            setReminderAt(undefined);
          }
        } catch (error) {
          if (__DEV__) console.error('Error loading checklist data:', error);
          setPurpose(checklistToEdit.purpose || 'private');
          setTitle(checklistToEdit.title || '');
          setItems((checklistToEdit.items || []).map((i, idx) => ({ ...i, orderIndex: i.orderIndex ?? idx })));
          if (checklistToEdit.reminderAt) {
            const date = new Date(checklistToEdit.reminderAt);
            setReminderDate(date);
            setReminderAt(checklistToEdit.reminderAt);
          } else {
            setReminderDate(new Date());
            setReminderAt(undefined);
          }
        }
      } else {
        setPurpose('private');
        setTitle('');
        setItems([]);
        setReminderDate(new Date());
        setReminderAt(undefined);
      }
    };

    loadChecklistData();
    return () => {
      isMounted = false;
    };
  }, [visible, checklistToEdit, flightId, loadTemplates]);

  const clTemplates: ChecklistTemplate[] = useMemo(() => templates?.checklist || [], [templates]);

  const addItem = () => {
    setItems((prev) => prev.concat({ id: Math.random().toString(36).slice(2), text: '', checked: false, orderIndex: prev.length }));
  };

  const updateItem = (id: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id).map((it, idx) => ({ ...it, orderIndex: idx })));
  };

  const applyTemplate = (tpl: ChecklistTemplate) => {
    setTitle(tpl.title);
    setPurpose(tpl.purpose);
    setItems(tpl.items.map((it, idx) => ({ id: Math.random().toString(36).slice(2), text: it.text, checked: false, orderIndex: it.orderIndex ?? idx })));
  };

  const handleReminderDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowReminderPicker(false);
    }
    if (selectedDate) {
      setReminderDate(selectedDate);
      setReminderAt(selectedDate.toISOString());
    }
  };

  const save = () => {
    if (isSaving) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast('error', 'Error', 'Please enter a title', 2000);
      return;
    }

    const validItems = items.filter((item) => item.text.trim().length > 0);

    // Remove duplicates based on text (case-insensitive)
    const seenTexts = new Set<string>();
    const uniqueItems = validItems.filter((item) => {
      const normalizedText = item.text.trim().toLowerCase();
      if (seenTexts.has(normalizedText)) {
        return false;
      }
      seenTexts.add(normalizedText);
      return true;
    });

    const payloadItems = uniqueItems.map(({ id, ...rest }, idx) => ({
      ...rest,
      text: rest.text.trim(),
      orderIndex: rest.orderIndex ?? idx,
    }));
    const optimisticItems: ChecklistItem[] = uniqueItems.map((item, idx) => ({
      ...item,
      text: item.text.trim(),
      orderIndex: item.orderIndex ?? idx,
    }));

    const state = useAppStore.getState() as any;
    const previousChecklists = [ ...((state.checklistsByFlight?.[flightId] || []) as Checklist[]) ];
    const now = new Date();
    const tempId = checklistToEdit ? null : `local-checklist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setIsSaving(true);

    // Optimistic UI update: immediate visible feedback in list.
    useAppStore.setState((currentState: any) => {
      const existing: Checklist[] = (currentState.checklistsByFlight?.[flightId] || []) as Checklist[];

      if (checklistToEdit) {
        const optimisticUpdated: Checklist = {
          ...checklistToEdit,
          title: trimmedTitle,
          purpose,
          reminderAt,
          items: optimisticItems,
          updatedAt: now,
        };
        const hasChecklist = existing.some((c) => c.id === checklistToEdit.id);
        const next = hasChecklist
          ? existing.map((c) => (c.id === checklistToEdit.id ? optimisticUpdated : c))
          : existing.concat(optimisticUpdated);
        return {
          checklistsByFlight: {
            ...(currentState.checklistsByFlight || {}),
            [flightId]: next,
          },
          checklistsLoadingByFlight: {
            ...(currentState.checklistsLoadingByFlight || {}),
            [flightId]: false,
          },
          checklistsLoadedByFlight: {
            ...(currentState.checklistsLoadedByFlight || {}),
            [flightId]: true,
          },
        };
      }

      const optimisticCreated: Checklist = {
        id: tempId!,
        profileId: state.user?.id || 'local',
        flightId,
        purpose,
        title: trimmedTitle,
        items: optimisticItems,
        reminderAt,
        createdAt: now,
        updatedAt: now,
      };

      return {
        checklistsByFlight: {
          ...(currentState.checklistsByFlight || {}),
          [flightId]: existing.concat(optimisticCreated),
        },
        checklistsLoadingByFlight: {
          ...(currentState.checklistsLoadingByFlight || {}),
          [flightId]: false,
        },
        checklistsLoadedByFlight: {
          ...(currentState.checklistsLoadedByFlight || {}),
          [flightId]: true,
        },
      };
    });

    showToast('success', 'Saving', 'Checklist is saving in background', 1400);
    onClose();
    setIsSaving(false);

    void (async () => {
      try {
        if (checklistToEdit) {
          await updateChecklist(
            checklistToEdit.id,
            { title: trimmedTitle, purpose, reminderAt },
            payloadItems,
            flightId
          );
        } else {
          const persisted = await addChecklist(
            flightId,
            { title: trimmedTitle, purpose, reminderAt },
            payloadItems as any
          );
          useAppStore.setState((currentState: any) => {
            const list: Checklist[] = (currentState.checklistsByFlight?.[flightId] || []) as Checklist[];
            const cleaned = list.filter((c) => c.id !== tempId && c.id !== persisted.id);
            return {
              checklistsByFlight: {
                ...(currentState.checklistsByFlight || {}),
                [flightId]: cleaned.concat(persisted),
              },
              checklistsLoadingByFlight: {
                ...(currentState.checklistsLoadingByFlight || {}),
                [flightId]: false,
              },
              checklistsLoadedByFlight: {
                ...(currentState.checklistsLoadedByFlight || {}),
                [flightId]: true,
              },
            };
          });
        }

        showToast('success', 'Saved', 'Checklist saved successfully', 1800);
      } catch (error: any) {
        if (__DEV__) console.error('Error saving checklist:', error);
        useAppStore.setState((currentState: any) => ({
          checklistsByFlight: {
            ...(currentState.checklistsByFlight || {}),
            [flightId]: previousChecklists,
          },
          checklistsLoadingByFlight: {
            ...(currentState.checklistsLoadingByFlight || {}),
            [flightId]: false,
          },
          checklistsLoadedByFlight: {
            ...(currentState.checklistsLoadedByFlight || {}),
            [flightId]: true,
          },
        }));
        showToast('error', 'Error', error?.message || 'Failed to save checklist', 3000);
      }
    })();
  };

  return (
    <AppModal visible={visible} onClose={onClose} title={checklistToEdit ? 'Edit Checklist' : 'New Checklist'} subtitle="Create a checklist for this flight">
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.segment}>
            <Pressable onPress={() => { setPurpose('private'); void loadTemplates('private'); }} style={[styles.segmentBtn, purpose === 'private' && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, purpose === 'private' && styles.segmentTextActive]}>Private</Text>
            </Pressable>
            <Pressable onPress={() => { setPurpose('business'); void loadTemplates('business'); }} style={[styles.segmentBtn, purpose === 'business' && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, purpose === 'business' && styles.segmentTextActive]}>Business</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={title}
            onChangeText={setTitle}
          />

          <Pressable onPress={() => setShowReminderPicker(true)} style={styles.input}>
            <View style={styles.reminderInputContent}>
              <Text style={[styles.reminderInputText, !reminderAt && styles.reminderInputPlaceholder]}>
                {reminderAt ? formatReminderForDisplay(reminderAt) : 'Set Reminder (Date & Time)'}
              </Text>
              {reminderAt && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setReminderAt(undefined);
                  }}
                  style={styles.clearReminderBtn}
                >
                  <MaterialIcons name="close" size={IconSizes.md} color="rgba(255,255,255,0.7)" />
                </Pressable>
              )}
            </View>
          </Pressable>

          {showReminderPicker && (
            Platform.OS === 'ios' ? (
              <AppModal
                visible={showReminderPicker}
                onClose={() => setShowReminderPicker(false)}
                title="Set Reminder"
                subtitle="Select date and time"
                presentationStyle="pageSheet"
                keyboardAvoiding={false}
              >
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={reminderDate}
                    mode="datetime"
                    display="spinner"
                    onChange={handleReminderDateChange}
                  />
                  <Pressable
                    style={styles.pickerDoneBtn}
                    onPress={() => setShowReminderPicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              </AppModal>
            ) : (
              <DateTimePicker
                value={reminderDate}
                mode="datetime"
                display="default"
                onChange={handleReminderDateChange}
              />
            )
          )}

          <View style={styles.templatesHeader}>
            <Text style={styles.templatesTitle}>Templates</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesList}>
            {templatesLoading ? (
              <View style={styles.templatesState}>
                <ActivityIndicator size="small" color={Colors.primary.main} />
                <Text style={styles.templatesStateText}>Loading templates...</Text>
              </View>
            ) : clTemplates.length === 0 ? (
              <View style={styles.templatesState}>
                <Text style={styles.templatesStateText}>No templates available</Text>
              </View>
            ) : (
              clTemplates.map((tpl) => (
                <Pressable key={tpl.id} onPress={() => applyTemplate(tpl)} style={styles.templateCard}>
                  <LinearGradient colors={["rgba(255,25,0,0.12)", "rgba(24,24,24,0.85)"]} style={StyleSheet.absoluteFill} />
                  <View style={styles.templateCardContent}>
                    <MaterialIcons name={tpl.purpose === 'business' ? 'work' : 'person'} size={IconSizes.md} color="#ff1900" />
                    <Text numberOfLines={2} style={styles.templateTitle}>{tpl.title}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>Items</Text>
            <Pressable onPress={addItem} style={styles.addItemBtn}>
              <MaterialIcons name="add" size={IconSizes.md} color="#fff" />
            </Pressable>
          </View>
          {items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Pressable onPress={() => updateItem(it.id, { checked: !it.checked })} style={styles.checkbox}>
                <MaterialIcons name={it.checked ? 'check-box' : 'check-box-outline-blank'} size={IconSizes.xl} color="#ff1900" />
              </Pressable>
              <TextInput
                style={styles.itemInput}
                placeholder="Item"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={it.text}
                onChangeText={(t) => updateItem(it.id, { text: t })}
              />
              <Pressable onPress={() => removeItem(it.id)} style={styles.removeItemBtn}>
                <MaterialIcons name="delete" size={IconSizes.md} color="#ff1900" />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* Actions fixed at bottom, outside ScrollView */}
        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={isSaving}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            style={[styles.saveBtn, (isSaving || !title.trim()) && styles.saveBtnDisabled]}
            disabled={isSaving || !title.trim()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LinearGradient
              colors={isSaving ? ["rgba(255,25,0,0.5)", "rgba(255,59,0,0.5)"] : ["#ff1900", "#ff3b00"]}
              style={styles.saveGradient}
            >
              <MaterialIcons name="save" size={IconSizes.md} color="#fff" />
              <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: 80, // Space for fixed actions
    gap: Spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(255,25,0,0.18)'
  },
  segmentText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Typography.fontFamily.display,
  },
  segmentTextActive: {
    color: '#fff'
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.component.inputPadding,
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  reminderInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderInputText: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    flex: 1,
  },
  reminderInputPlaceholder: {
    color: 'rgba(255,255,255,0.5)',
  },
  clearReminderBtn: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  pickerContainer: {
    padding: Spacing.xl,
  },
  pickerDoneBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  pickerDoneText: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
  },
  templatesHeader: {
    marginTop: Spacing.xs,
  },
  templatesTitle: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.display,
  },
  templatesList: {
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  templatesState: {
    minHeight: 64,
    minWidth: 220,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  templatesStateText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
  },
  templateCard: {
    width: 200,
    height: 64,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  templateCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md
  },
  templateTitle: {
    color: '#fff',
    fontFamily: Typography.fontFamily.display,
  },
  itemsHeader: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  itemsTitle: {
    color: '#fff',
    fontFamily: Typography.fontFamily.display,
  },
  addItemBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  checkbox: {
    width: 28,
    alignItems: 'center'
  },
  itemInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: Spacing.xs + 2,
  },
  removeItemBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  cancelText: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.regular,
  },
  saveBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  saveText: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
  }
});


