import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenWrapper from '../components/ScreenWrapper';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { fetchPendingNotifications } from '../services/notificationRegistry';

type LocalNotification = {
  id: string;
  title: string;
  body: string;
  fireAt: string;
  data?: Record<string, any>;
};

export default function PendingNotificationsScreen() {
  const { user } = useAuth();
  const [localList, setLocalList] = useState<LocalNotification[]>([]);
  const [serverList, setServerList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const scheduled = Notifications.getAllScheduledNotificationsAsync
        ? await Notifications.getAllScheduledNotificationsAsync()
        : [];
      const mapped: LocalNotification[] = (scheduled || []).map((n: any, idx: number) => ({
        id: n?.identifier ?? `local-${idx}`,
        title: n?.content?.title ?? '',
        body: n?.content?.body ?? '',
        fireAt: n?.trigger?.date ? new Date(n.trigger.date).toISOString() : '',
        data: n?.content?.data,
      }));
      setLocalList(mapped);

      if (user?.id) {
        const serverPending = await fetchPendingNotifications(user.id);
        setServerList(serverPending);
      }
    } catch (e) {
      if (__DEV__) console.warn('load pending notifications failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  return (
    <ScreenWrapper
      title="Pending notifications"
      showBackButton
      onBackPress={() => {
        const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
        if (canGoBack) router.back();
        else router.replace('/(tabs)/home');
      }}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Local (device)</Text>
          <Pressable onPress={load} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={18} color="#ff1900" />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#ff1900" />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}

        {!loading && localList.length === 0 && (
          <Text style={styles.empty}>No scheduled local notifications.</Text>
        )}

        {!loading && localList.map((n, idx) => (
          <Animated.View key={n.id} entering={FadeInDown.delay(50 * idx).springify()} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{n.title || 'Untitled'}</Text>
              <Text style={styles.cardTime}>{n.fireAt ? new Date(n.fireAt).toLocaleString() : 'n/a'}</Text>
            </View>
            {n.body ? <Text style={styles.cardBody}>{n.body}</Text> : null}
            {n.data ? <Text style={styles.cardMeta}>data: {JSON.stringify(n.data)}</Text> : null}
          </Animated.View>
        ))}

        <View style={styles.sectionSpacer} />

        <View style={styles.headerRow}>
          <Text style={styles.title}>Server pending</Text>
        </View>

        {!loading && serverList.length === 0 && (
          <Text style={styles.empty}>No pending server notifications.</Text>
        )}

        {!loading && serverList.map((n, idx) => (
          <Animated.View key={n.id} entering={FadeInDown.delay(50 * idx).springify()} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{n.payload?.title || n.kind}</Text>
              <Text style={styles.cardTime}>{n.fire_at ? new Date(n.fire_at).toLocaleString() : 'n/a'}</Text>
            </View>
            {n.payload?.body ? <Text style={styles.cardBody}>{n.payload.body}</Text> : null}
            {n.payload?.data ? <Text style={styles.cardMeta}>data: {JSON.stringify(n.payload.data)}</Text> : null}
            <Text style={styles.cardMeta}>status: {n.status}</Text>
          </Animated.View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.4)',
  },
  refreshText: { color: '#ff1900', fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  loadingText: { color: 'rgba(255,255,255,0.8)' },
  empty: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  cardBody: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  cardMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  sectionSpacer: { height: 18 },
});
