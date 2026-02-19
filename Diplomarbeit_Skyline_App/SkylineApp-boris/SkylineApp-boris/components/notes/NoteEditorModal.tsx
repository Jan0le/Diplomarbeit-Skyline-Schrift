import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppStore } from '../../store';
import { Note, NoteTemplate, Purpose } from '../../types';
import AppModal from '../AppModal';
import { useToast } from '../ToastProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  flightId: string;
  noteToEdit?: Note | null;
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

export default function NoteEditorModal({ visible, onClose, flightId, noteToEdit }: Props) {
  const addNote = useAppStore((s: any) => s.addNote);
  const updateNote = useAppStore((s: any) => s.updateNoteAction);
  const loadTemplatesByPurpose = useAppStore((s: any) => s.loadTemplatesByPurpose);
  const templates = useAppStore((s: any) => s.templates);
  const { showToast } = useToast();

  const [purpose, setPurpose] = useState<Purpose>(noteToEdit?.purpose || 'private');
  const [title, setTitle] = useState<string>(noteToEdit?.title || '');
  const [content, setContent] = useState<string>(noteToEdit?.content || '');
  const [reminderAt, setReminderAt] = useState<string | undefined>(noteToEdit?.reminderAt);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(() => {
    if (noteToEdit?.reminderAt) {
      return new Date(noteToEdit.reminderAt);
    }
    return new Date();
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setPurpose(noteToEdit?.purpose || 'private');
      setTitle(noteToEdit?.title || '');
      setContent(noteToEdit?.content || '');
      if (noteToEdit?.reminderAt) {
        const date = new Date(noteToEdit.reminderAt);
        setReminderDate(date);
        setReminderAt(noteToEdit.reminderAt);
      } else {
        setReminderDate(new Date());
        setReminderAt(undefined);
      }
      loadTemplatesByPurpose(noteToEdit?.purpose || 'private');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const noteTemplates: NoteTemplate[] = useMemo(() => templates?.note || [], [templates]);

  const applyTemplate = (tpl: NoteTemplate) => {
    setTitle(tpl.title);
    setContent(tpl.content || '');
    setPurpose(tpl.purpose);
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

    const state = useAppStore.getState() as any;
    const previousNotes = [ ...((state.notesByFlight?.[flightId] || []) as Note[]) ];
    const trimmedTitle = title.trim();
    const payload = { title: trimmedTitle, content, purpose, reminderAt };
    const now = new Date();
    const tempId = noteToEdit ? null : `local-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setIsSaving(true);

    // Optimistic UI update: user sees the note immediately.
    useAppStore.setState((currentState: any) => {
      const existing: Note[] = (currentState.notesByFlight?.[flightId] || []) as Note[];

      if (noteToEdit) {
        const optimisticUpdated: Note = {
          ...noteToEdit,
          ...payload,
          title: trimmedTitle,
          updatedAt: now,
        };
        const hasNote = existing.some((n) => n.id === noteToEdit.id);
        const next = hasNote
          ? existing.map((n) => (n.id === noteToEdit.id ? optimisticUpdated : n))
          : existing.concat(optimisticUpdated);
        return {
          notesByFlight: {
            ...(currentState.notesByFlight || {}),
            [flightId]: next,
          },
        };
      }

      const optimisticCreated: Note = {
        id: tempId!,
        profileId: state.user?.id || 'local',
        flightId,
        purpose,
        title: trimmedTitle,
        content,
        reminderAt,
        createdAt: now,
        updatedAt: now,
      };

      return {
        notesByFlight: {
          ...(currentState.notesByFlight || {}),
          [flightId]: existing.concat(optimisticCreated),
        },
      };
    });

    showToast('success', 'Saving', 'Note is saving in background', 1400);
    onClose();
    setIsSaving(false);

    void (async () => {
      try {
        if (noteToEdit) {
          await updateNote(noteToEdit.id, payload);
        } else {
          const persisted = await addNote(flightId, payload);
          useAppStore.setState((currentState: any) => {
            const list: Note[] = (currentState.notesByFlight?.[flightId] || []) as Note[];
            const cleaned = list.filter((n) => n.id !== tempId && n.id !== persisted.id);
            return {
              notesByFlight: {
                ...(currentState.notesByFlight || {}),
                [flightId]: cleaned.concat(persisted),
              },
            };
          });
        }

        showToast('success', 'Saved', 'Note saved successfully', 1800);
      } catch (error: any) {
        if (__DEV__) console.error('Error saving note:', error);
        useAppStore.setState((currentState: any) => ({
          notesByFlight: {
            ...(currentState.notesByFlight || {}),
            [flightId]: previousNotes,
          },
        }));
        showToast('error', 'Error', error?.message || 'Failed to save note', 3000);
      }
    })();
  };

  return (
    <AppModal visible={visible} onClose={onClose} title={noteToEdit ? 'Edit Note' : 'New Note'} subtitle="Add details for this flight">
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.segment}>
            <Pressable onPress={() => { setPurpose('private'); loadTemplatesByPurpose('private'); }} style={[styles.segmentBtn, purpose === 'private' && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, purpose === 'private' && styles.segmentTextActive]}>Private</Text>
            </Pressable>
            <Pressable onPress={() => { setPurpose('business'); loadTemplatesByPurpose('business'); }} style={[styles.segmentBtn, purpose === 'business' && styles.segmentBtnActive]}>
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

          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Content"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
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
                  <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
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
            {noteTemplates.map((tpl) => (
              <Pressable key={tpl.id} onPress={() => applyTemplate(tpl)} style={styles.templateCard}>
                <LinearGradient colors={["rgba(255,25,0,0.12)", "rgba(24,24,24,0.85)"]} style={StyleSheet.absoluteFill} />
                <View style={styles.templateCardContent}>
                  <MaterialIcons name={tpl.purpose === 'business' ? 'work' : 'person'} size={18} color="#ff1900" />
                  <Text numberOfLines={2} style={styles.templateTitle}>{tpl.title}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
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
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            disabled={isSaving}
          >
            <LinearGradient 
              colors={isSaving ? ["rgba(255,25,0,0.5)", "rgba(255,59,0,0.5)"] : ["#ff1900", "#ff3b00"]} 
              style={styles.saveGradient}
            >
              <MaterialIcons name="save" size={18} color="#fff" />
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
    padding: 16,
    paddingBottom: 80, // Space for fixed actions
    gap: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(255,25,0,0.18)'
  },
  segmentText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#fff'
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
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
    fontSize: 16,
    flex: 1,
  },
  reminderInputPlaceholder: {
    color: 'rgba(255,255,255,0.5)',
  },
  clearReminderBtn: {
    marginLeft: 8,
    padding: 4,
  },
  pickerContainer: {
    padding: 20,
  },
  pickerDoneBtn: {
    marginTop: 16,
    backgroundColor: '#ff1900',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  multiline: {
    minHeight: 120,
  },
  templatesHeader: {
    marginTop: 4,
  },
  templatesTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  templatesList: {
    gap: 10,
    paddingVertical: 8,
  },
  templateCard: {
    width: 160,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  templateCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12
  },
  templateTitle: {
    color: '#fff',
    fontWeight: '700'
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  saveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});


