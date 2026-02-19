import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, IconSizes, Spacing, Typography } from '../constants/DesignTokens';
import { useAppStore } from '../store';

type TabKey = 'overview' | 'flights' | 'checklists' | 'notes' | 'documents' | 'users';

type TabConfig = {
  key: TabKey;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: number;
};

type Props = {
  flightId: string;
  overview: React.ReactNode;
  flights?: React.ReactNode;
  notes: React.ReactNode;
  checklists: React.ReactNode;
  documents?: React.ReactNode;
  users?: React.ReactNode;
  activeTab?: TabKey;
  onActiveChange?: (tab: TabKey) => void;
};

export default function TripTabs({
  flightId,
  overview,
  flights,
  notes,
  checklists,
  documents,
  users,
  activeTab,
  onActiveChange,
}: Props) {
  const [internalActive, setInternalActive] = useState<TabKey>('overview');
  const notesByFlight = useAppStore((s: any) => s.notesByFlight);
  const clByFlight = useAppStore((s: any) => s.checklistsByFlight);
  const scrollRef = useRef<ScrollView>(null);
  const active = activeTab ?? internalActive;

  const openItems = useMemo(() => {
    const lists = (clByFlight?.[flightId] || []) as any[];
    return lists.reduce((sum, cl) => sum + cl.items.filter((i: any) => !i.checked).length, 0);
  }, [clByFlight, flightId]);

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const list = (notesByFlight?.[flightId] || []) as any[];
    return list.filter((n) => {
      if (!n.reminderAt) return false;
      const t = new Date(n.reminderAt);
      return t >= now && t <= in24h;
    }).length;
  }, [notesByFlight, flightId]);

  const tabs: TabConfig[] = useMemo(() => {
    const result: TabConfig[] = [
      { key: 'overview', label: 'Overview', icon: 'dashboard' },
    ];
    if (flights) {
      result.push({ key: 'flights', label: 'Flights', icon: 'flight' });
    }
    result.push(
      { key: 'checklists', label: 'Checklists', icon: 'checklist', badge: openItems || undefined },
      { key: 'notes', label: 'Notes', icon: 'sticky-note-2', badge: upcomingReminders || undefined },
    );
    if (documents) {
      result.push({ key: 'documents', label: 'Docs', icon: 'folder' });
    }
    if (users) {
      result.push({ key: 'users', label: 'Team', icon: 'group' });
    }
    return result;
  }, [flights, documents, users, openItems, upcomingReminders]);

  const handleTabPress = (key: TabKey) => {
    if (activeTab === undefined) {
      setInternalActive(key);
    }
    onActiveChange?.(key);
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityHint={`Switch to ${tab.label} tab`}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[Colors.primary.main, Colors.primary.light]}
                    style={styles.tabPillGradient}
                  >
                    <MaterialIcons name={tab.icon} size={IconSizes.md} color="#fff" />
                    <Text style={styles.tabLabelActive}>{tab.label}</Text>
                    {!!tab.badge && (
                      <View style={styles.badgeActive}>
                        <Text style={styles.badgeTextActive}>{tab.badge}</Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.tabPillInner}>
                    <MaterialIcons name={tab.icon} size={IconSizes.md} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.tabLabel}>{tab.label}</Text>
                    {!!tab.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tab.badge}</Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {active === 'overview' && overview}
        {active === 'flights' && flights}
        {active === 'checklists' && checklists}
        {active === 'notes' && notes}
        {active === 'documents' && documents}
        {active === 'users' && users}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  tabBarWrapper: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  tabPill: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  tabPillActive: {
    // active styling is handled by gradient
  },
  tabPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs + 2,
  },
  tabPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.component.inputPadding,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: Spacing.xs + 2,
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.display,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#fff',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.display,
    letterSpacing: 0.3,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,25,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs + 1,
  },
  badgeText: {
    color: Colors.primary.main,
    fontSize: 11,
    fontFamily: Typography.fontFamily.display,
  },
  badgeActive: {
    minWidth: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs + 1,
  },
  badgeTextActive: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Typography.fontFamily.display,
  },
  content: {
    paddingTop: Spacing.md,
  },
});
