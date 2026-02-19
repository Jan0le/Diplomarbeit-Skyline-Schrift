import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Flight } from '../types';

type ReminderKind = 'checkin_24h' | 'boarding_60m' | 'boarding_30m' | 'missing_docs_12h' | 'receipt_2h';

type FlightReminderIds = Partial<Record<ReminderKind, string>>;
type ReminderStore = Record<string, FlightReminderIds>; // flightId -> ids

const storeKey = (userId: string) => `flight_reminder_ids_v1_${userId}`;

async function loadStore(userId: string): Promise<ReminderStore> {
  try {
    const raw = await AsyncStorage.getItem(storeKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveStore(userId: string, store: ReminderStore): Promise<void> {
  try {
    await AsyncStorage.setItem(storeKey(userId), JSON.stringify(store));
  } catch {}
}

function isoMinus(departureAt: string, ms: number): string | null {
  const d = new Date(departureAt);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t - ms).toISOString();
}

function isoPlus(iso: string, ms: number): string | null {
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + ms).toISOString();
}

export async function cancelAutoRemindersForFlight(userId: string, flightId: string): Promise<void> {
  const { cancelLocalNotification } = await import('./notifications');
  const { cancelNotificationsByFlight } = await import('./notificationRegistry');
  const store = await loadStore(userId);
  const ids = store[flightId];
  if (ids) {
    for (const id of Object.values(ids)) {
      if (typeof id === 'string' && id.length > 0) {
        await cancelLocalNotification(id);
      }
    }
  }
  delete store[flightId];
  await saveStore(userId, store);
  await cancelNotificationsByFlight(userId, flightId);
}

export async function scheduleAutoRemindersForFlight(userId: string, flight: Flight): Promise<void> {
  // Cancel existing to keep idempotent behavior
  await cancelAutoRemindersForFlight(userId, flight.id);

  const SettingsService = (await import('./settingsService')).default;
  const settings = await SettingsService.getInstance().getSettings();
  if (!settings.notifications) return;

  const { scheduleNotificationPersisted } = await import('./notifications');
  const ids: FlightReminderIds = {};

  const dep = flight.departureAt;
  const arr = flight.arrivalAt;
  if (!dep) return;

  const urlTrip = `/trip-details?id=${flight.id}`;
  const urlDocs = `/trip-details?id=${flight.id}&tutorial=1`;

  // Check-in reminder: 24h before departure
  if (settings.reminderCheckIn) {
    const when = isoMinus(dep, 24 * 60 * 60 * 1000);
    const id = when
      ? await scheduleNotificationPersisted({
          userId,
          kind: 'flight.checkin',
          whenISO: when,
          title: 'Check-in available',
          body: 'Check-in is usually available 24h before departure. Open Trip Details to add/update info.',
          data: { url: urlTrip, flightId: flight.id },
        })
      : null;
    if (id) ids.checkin_24h = id;
  }

  // Boarding reminders: 60m + 30m
  if (settings.reminderBoarding) {
    const when60 = isoMinus(dep, 60 * 60 * 1000);
    const id60 = when60
      ? await scheduleNotificationPersisted({
          userId,
          kind: 'flight.boarding60',
          whenISO: when60,
          title: 'Boarding soon ✈️',
          body: 'Your flight boards in about 60 minutes. Check gate/terminal and make sure your docs are ready.',
          data: { url: urlDocs, flightId: flight.id },
        })
      : null;
    if (id60) ids.boarding_60m = id60;

    const when30 = isoMinus(dep, 30 * 60 * 1000);
    const id30 = when30
      ? await scheduleNotificationPersisted({
          userId,
          kind: 'flight.boarding30',
          whenISO: when30,
          title: 'Boarding soon ✈️',
          body: 'Your flight boards soon. Open Trip Details to check gate and documents.',
          data: { url: urlDocs, flightId: flight.id },
        })
      : null;
    if (id30) ids.boarding_30m = id30;
  }

  // Missing docs reminder: 12h before departure (heuristic message; can be cancelled later when docs exist)
  if (settings.reminderMissingDocs) {
    const when = isoMinus(dep, 12 * 60 * 60 * 1000);
    const id = when
      ? await scheduleNotificationPersisted({
          userId,
          kind: 'flight.missing_docs',
          whenISO: when,
          title: 'Documents check',
          body: 'Quick check: do you have your boarding pass / booking confirmation saved? Upload it now to avoid stress.',
          data: { url: urlDocs, flightId: flight.id },
        })
      : null;
    if (id) ids.missing_docs_12h = id;
  }

  // Receipt reminder: 2h after arrival (if arrivalAt exists)
  if (settings.reminderReceipt && arr) {
    const when = isoPlus(arr, 2 * 60 * 60 * 1000);
    const id = when
      ? await scheduleNotificationPersisted({
          userId,
          kind: 'flight.receipt',
          whenISO: when,
          title: 'Add receipts',
          body: 'Don’t forget to upload receipts for your business trip (hotel, taxi, etc.).',
          data: { url: urlDocs, flightId: flight.id },
        })
      : null;
    if (id) ids.receipt_2h = id;
  }

  // Save ids
  const store = await loadStore(userId);
  store[flight.id] = ids;
  await saveStore(userId, store);
}





