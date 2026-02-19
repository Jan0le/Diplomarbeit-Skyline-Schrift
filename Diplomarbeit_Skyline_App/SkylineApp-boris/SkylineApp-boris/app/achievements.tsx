import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenWrapper from '../components/ScreenWrapper';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/DesignTokens';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/db';
import { useFlightStats, useFlights } from '../store';

type CatalogItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

const FALLBACK_CATALOG: CatalogItem[] = [
  { id: 'first-flight', title: 'First Flight', description: 'Completed your first flight', icon: 'flight' },
  { id: 'frequent-flyer-10', title: 'Frequent Flyer', description: 'Completed 10+ flights', icon: 'card-membership' },
  { id: 'explorer-5-countries', title: 'Explorer', description: 'Visited 5+ countries', icon: 'public' },
  { id: 'distance-10k', title: '10,000 KM', description: 'Flew a total of 10,000 km', icon: 'straighten' },
  { id: 'distance-50k', title: '50,000 KM', description: 'Flew a total of 50,000 km', icon: 'military-tech' },
  { id: 'red-eye-completed', title: 'Red-Eye Runner', description: 'Completed a red-eye flight', icon: 'nightlight' },
];

export default function AchievementsScreen() {
  const { user } = useAuth();
  const flights = useFlights();
  const stats = useFlightStats();
  // Start with fallback catalog so UI is immediately populated; DB load refines it in the background
  const [catalog, setCatalog] = useState<CatalogItem[]>(FALLBACK_CATALOG);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: ach }, { data: ua }] = await Promise.all([
          supabase.from('achievements').select('id,title,description,icon').order('id'),
          user?.id
            ? supabase.from('user_achievements').select('achievement_id').eq('profile_id', user.id)
            : Promise.resolve({ data: [] as any[] })
        ]);
        const rows = (ach || []) as CatalogItem[];
        setCatalog(rows.length ? rows : FALLBACK_CATALOG);
        setUnlocked(new Set((ua || []).map(r => String((r as any).achievement_id))));
      } catch (e) {
        // If DB tables aren't seeded yet, still show fallback catalog
        setCatalog(FALLBACK_CATALOG);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const progressById = useMemo(() => {
    const completedFlights = flights.filter(f => f.status === 'completed').length;
    const countries = new Set(
      flights.flatMap(f => [f.from.country, f.to.country].filter(Boolean))
    ).size;
    return {
      'first-flight': { value: Math.min(completedFlights, 1), max: 1 },
      'frequent-flyer-10': { value: Math.min(completedFlights, 10), max: 10 },
      'explorer-5-countries': { value: Math.min(countries, 5), max: 5 },
      'distance-10k': { value: Math.min(stats.totalDistance, 10000), max: 10000 },
      'distance-50k': { value: Math.min(stats.totalDistance, 50000), max: 50000 },
      'red-eye-completed': { value: 0, max: 1 },
    } as Record<string, { value: number; max: number }>;
  }, [flights, stats.totalDistance]);

  const unlockedCount = useMemo(() => {
    return (catalog || []).filter(a => unlocked.has(a.id)).length;
  }, [catalog, unlocked]);

  const totalCount = catalog?.length || 0;
  const overallPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <ScreenWrapper title="Achievements" showBackButton>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.summaryCard}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,25,0,0.25)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.summaryHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Your progress</Text>
              <Text style={styles.summarySubtitle}>
                {loading ? 'Loading…' : `${unlockedCount}/${totalCount} unlocked • ${overallPct}%`}
              </Text>
            </View>
            <View style={styles.summaryIconWrap}>
              <MaterialIcons name="emoji-events" size={22} color={Colors.primary.main} />
            </View>
          </View>
          <View style={styles.summaryProgressTrack}>
            <View style={[styles.summaryProgressFill, { width: `${Math.max(0, Math.min(100, overallPct))}%` }]} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.list}>
          {(catalog || []).map((a, idx) => {
            const isUnlocked = unlocked.has(a.id);
            const prog = progressById[a.id] || { value: 0, max: 1 };
            const pct = Math.max(0, Math.min(1, prog.max ? prog.value / prog.max : 0));
            return (
              <Animated.View key={a.id} entering={FadeInDown.delay(50 * idx).springify()} style={styles.card}>
                <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={isUnlocked ? ['rgba(67,233,123,0.10)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.25)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.cardInner}>
                  <View style={styles.rowTop}>
                    <View style={styles.iconWrap}>
                      <MaterialIcons name={a.icon as any} size={22} color={isUnlocked ? '#43e97b' : Colors.primary.main} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{a.title}</Text>
                      <Text style={styles.desc}>{a.description}</Text>
                    </View>
                    {isUnlocked ? (
                      <MaterialIcons name="check-circle" size={20} color="#43e97b" />
                    ) : (
                      <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.5)" />
                    )}
                  </View>

                  <View style={styles.progressBarWrap}>
                    <View style={[styles.progressBarFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {prog.value}/{prog.max}{a.id.startsWith('distance') ? ' km' : ''}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
          {!loading && catalog.length === 0 && (
            <View style={{ padding: 20 }}>
              <Text style={styles.emptyText}>No achievements found.</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.lg,
  },
  summaryCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Shadows.lg,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,25,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  summaryProgressTrack: {
    marginTop: Spacing.md,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: 8,
    backgroundColor: Colors.primary.main,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardInner: {
    padding: Spacing.lg,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,25,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
  },
  desc: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  progressBarWrap: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary.main,
  },
  progressText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.sm,
  },
  emptyText: {
    color: Colors.text.secondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
});


