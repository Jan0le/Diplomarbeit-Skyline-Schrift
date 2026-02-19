import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorite_flight_ids';

export async function getFavoriteFlights(): Promise<string[]> {
  const json = await AsyncStorage.getItem(FAVORITES_KEY);
  return json ? JSON.parse(json) : [];
}

export async function setFavoriteFlights(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export async function toggleFavoriteFlight(id: string): Promise<boolean> {
  const current = await getFavoriteFlights();
  let updated;
  let isNowFavorite;
  if (current.includes(id)) {
    updated = current.filter(favId => favId !== id);
    isNowFavorite = false;
  } else {
    updated = [...current, id];
    isNowFavorite = true;
  }
  await setFavoriteFlights(updated);
  return isNowFavorite;
}

export async function isFlightFavorite(id: string): Promise<boolean> {
  const current = await getFavoriteFlights();
  return current.includes(id);
} 