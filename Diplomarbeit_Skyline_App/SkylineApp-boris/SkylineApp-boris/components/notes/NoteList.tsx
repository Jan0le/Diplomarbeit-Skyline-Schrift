import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppStore } from '../../store';
import { Note } from '../../types';
import NoteEditorModal from './NoteEditorModal';
import { BorderRadius, Colors, IconSizes, Spacing, Typography } from '../../constants/DesignTokens';

type Props = {
  flightId: string;
  hideFab?: boolean;
  openCreateTrigger?: number;
};

export default function NoteList({ flightId, hideFab, openCreateTrigger }: Props) {
  const loadNotesForFlight = useAppStore((s: any) => s.loadNotesForFlight);
  const notesByFlight = useAppStore((s: any) => s.notesByFlight);
  const del = useAppStore((s: any) => s.deleteNoteAction);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [filter, setFilter] = useState<'all' | 'business' | 'private'>('all');

  useEffect(() => {
    loadNotesForFlight(flightId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId]);

  useEffect(() => {
    if (typeof openCreateTrigger === 'number' && openCreateTrigger > 0) {
      setEditing(null);
      setEditorOpen(true);
    }
  }, [openCreateTrigger]);

  const notesSrc: Note[] = (notesByFlight?.[flightId] || []) as Note[];
  const notes: Note[] = notesSrc.filter(n => filter === 'all' ? true : n.purpose === filter);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Pressable onPress={() => setFilter('all')} style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </Pressable>
        <Pressable onPress={() => setFilter('business')} style={[styles.filterBtn, filter === 'business' && styles.filterBtnActive]}>
          <Text style={[styles.filterText, filter === 'business' && styles.filterTextActive]}>Business</Text>
        </Pressable>
        <Pressable onPress={() => setFilter('private')} style={[styles.filterBtn, filter === 'private' && styles.filterBtnActive]}>
          <Text style={[styles.filterText, filter === 'private' && styles.filterTextActive]}>Private</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {notes.map((note, idx) => (
          <Animated.View key={note.id} entering={FadeInDown.delay(100 + idx * 80).springify()} style={styles.card}>
            <LinearGradient colors={["rgba(30,30,30,0.98)", "rgba(20,20,20,0.95)"]} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <MaterialIcons name={note.purpose === 'business' ? 'work' : 'person'} size={IconSizes.md} color="#ff1900" />
                  <Text numberOfLines={1} style={styles.cardTitle}>{note.title || 'Note'}</Text>
                </View>
                <View style={styles.cardActions}>
                  {!!note.reminderAt && <MaterialIcons name="notifications" size={IconSizes.md} color="#fff" style={{ opacity: 0.7 }} />}
                  <Pressable onPress={() => { setEditing(note); setEditorOpen(true); }} style={styles.iconBtn}>
                    <MaterialIcons name="edit" size={IconSizes.md} color="#ff1900" />
                  </Pressable>
                  <Pressable onPress={() => del(note.id)} style={styles.iconBtn}>
                    <MaterialIcons name="delete" size={IconSizes.md} color="#ff1900" />
                  </Pressable>
                </View>
              </View>
              <Text numberOfLines={4} style={styles.cardContent}>{note.content || '—'}</Text>
            </LinearGradient>
          </Animated.View>
        ))}
        {notes.length === 0 && (
          <View style={styles.empty}> 
            <MaterialIcons name="note-add" size={32} color="rgba(255,255,255,0.4)" />
            <Text style={styles.emptyText}>No notes yet</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {!hideFab && (
        <Pressable style={styles.fab} onPress={() => { setEditing(null); setEditorOpen(true); }}>
          <LinearGradient colors={["#ff1900", "#ff3b00"]} style={styles.fabGradient}>
            <MaterialIcons name="add" size={IconSizes.xl} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}

      <NoteEditorModal
        visible={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        flightId={flightId}
        noteToEdit={editing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  filterBtnActive: {
    backgroundColor: 'rgba(255,25,0,0.18)'
  },
  filterText: {
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.display,
  },
  filterTextActive: {
    color: Colors.text.primary
  },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.md,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.display,
    fontSize: Typography.fontSize.base,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardContent: {
    color: Colors.text.primary,
    opacity: 0.9,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    pointerEvents: 'box-none',
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center'
  }
});


