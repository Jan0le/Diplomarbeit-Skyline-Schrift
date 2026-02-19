import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppStore } from '../../store';
import { Checklist } from '../../types';
import ChecklistEditorModal from './ChecklistEditorModal';
import { useToast } from '../ToastProvider';
import { BorderRadius, Colors, IconSizes, Spacing, Typography } from '../../constants/DesignTokens';

type Props = {
  flightId: string;
  hideFab?: boolean;
  openCreateTrigger?: number;
};

export default function ChecklistList({ flightId, hideFab, openCreateTrigger }: Props) {
  const loadChecklistsForFlight = useAppStore((s: any) => s.loadChecklistsForFlight);
  const checklistsByFlight = useAppStore((s: any) => s.checklistsByFlight);
  const checklistsLoadingByFlight = useAppStore((s: any) => s.checklistsLoadingByFlight);
  const checklistsLoadedByFlight = useAppStore((s: any) => s.checklistsLoadedByFlight);
  const del = useAppStore((s: any) => s.deleteChecklistAction);
  const { showToast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Checklist | null>(null);
  const [filter, setFilter] = useState<'all' | 'business' | 'private'>('all');

  useEffect(() => {
    if (flightId) {
      loadChecklistsForFlight(flightId);
    }
  }, [flightId, loadChecklistsForFlight]);

  useEffect(() => {
    if (typeof openCreateTrigger === 'number' && openCreateTrigger > 0) {
      // open editor when trigger changes
      setEditing(null);
      setEditorOpen(true);
    }
  }, [openCreateTrigger]);

  const listsSrc: Checklist[] = (checklistsByFlight?.[flightId] || []) as Checklist[];
  const isLoading = !!checklistsLoadingByFlight?.[flightId];
  const hasLoaded = !!checklistsLoadedByFlight?.[flightId];
  const showInitialLoading = (isLoading || !hasLoaded) && listsSrc.length === 0;
  // Deduplicate by ID to prevent duplicate checklists from showing
  const uniqueLists = Array.from(
    new Map(listsSrc.map(cl => [cl.id, cl])).values()
  );
  const lists: Checklist[] = uniqueLists.filter(l => filter === 'all' ? true : l.purpose === filter);

  const getProgress = (cl: Checklist) => {
    const total = cl.items.length || 0;
    const done = cl.items.filter((i) => i.checked).length;
    return { total, done };
  };

  const handleDelete = async (checklistId: string) => {
    const previousLists: Checklist[] = (useAppStore.getState().checklistsByFlight?.[flightId] || []) as Checklist[];
    useAppStore.setState((state: any) => ({
      checklistsByFlight: {
        ...(state.checklistsByFlight || {}),
        [flightId]: ((state.checklistsByFlight?.[flightId] || []) as Checklist[]).filter((c) => c.id !== checklistId),
      },
    }));

    try {
      await del(checklistId, flightId);
      showToast('success', 'Deleted', 'Checklist deleted', 2000);
    } catch (error: any) {
      if (__DEV__) console.error('Error deleting checklist:', error);
      useAppStore.setState((state: any) => ({
        checklistsByFlight: {
          ...(state.checklistsByFlight || {}),
          [flightId]: previousLists,
        },
      }));
      showToast('error', 'Error', error?.message || 'Failed to delete checklist', 3000);
    }
  };

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
        {showInitialLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={Colors.primary.main} />
            <Text style={styles.loadingText}>Loading checklists...</Text>
          </View>
        )}
        {!showInitialLoading && lists.map((cl, idx) => {
          const { total, done } = getProgress(cl);
          const open = total - done;
          return (
            <Animated.View key={cl.id} entering={FadeInDown.delay(100 + idx * 80).springify()} style={styles.card}>
              <LinearGradient colors={["rgba(30,30,30,0.98)", "rgba(20,20,20,0.95)"]} style={styles.cardGradient}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <MaterialIcons name={cl.purpose === 'business' ? 'work' : 'checklist'} size={IconSizes.md} color="#ff1900" />
                    <Text numberOfLines={1} style={styles.cardTitle}>{cl.title || 'Checklist'}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    {!!cl.reminderAt && <MaterialIcons name="notifications" size={IconSizes.md} color="#fff" style={{ opacity: 0.7 }} />}
                    <View style={styles.badgeOpen}><Text style={styles.badgeOpenText}>{open}</Text></View>
                    <Pressable 
                      onPress={() => { 
                        setEditing(cl); 
                        setEditorOpen(true); 
                      }} 
                      style={styles.iconBtn}
                    >
                      <MaterialIcons name="edit" size={IconSizes.md} color="#ff1900" />
                    </Pressable>
                    <Pressable 
                      onPress={() => { void handleDelete(cl.id); }}
                      style={styles.iconBtn}
                    >
                      <MaterialIcons name="delete" size={IconSizes.md} color="#ff1900" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.progressRow}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFg, { width: total > 0 ? `${(done / total) * 100}%` : '0%' }]} />
                  </View>
                  <Text style={styles.progressText}>{done}/{total} done</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          );
        })}
        {!showInitialLoading && lists.length === 0 && (
          <View style={styles.empty}> 
            <MaterialIcons name="checklist" size={32} color="rgba(255,255,255,0.4)" />
            <Text style={styles.emptyText}>No checklists yet</Text>
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

      <ChecklistEditorModal
        visible={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        flightId={flightId}
        checklistToEdit={editing}
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFg: {
    height: 4,
    backgroundColor: '#ff1900',
  },
  progressText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.xs + 2,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeOpen: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff1900',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeOpenText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.display,
  },
});


