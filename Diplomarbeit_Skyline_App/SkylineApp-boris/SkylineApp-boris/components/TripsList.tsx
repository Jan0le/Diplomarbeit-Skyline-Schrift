import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Trip {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
  airline: string;
  flightNumber: string;
  distance?: number;
}

interface TripsListProps {
  trips: Trip[];
}

export default function TripsList({ trips }: TripsListProps) {
  const handleTripPress = (tripId: string) => {
    router.push(`/trip-details?id=${tripId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Trips</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {trips.map((trip, index) => (
          <Animated.View
            key={trip.id}
            entering={FadeInDown.delay(index * 100).springify()}
          >
            <Pressable
              style={({ pressed }) => [
                styles.tripCard,
                pressed && styles.tripCardPressed
              ]}
              onPress={() => handleTripPress(trip.id)}
            >
              <LinearGradient
                colors={['rgba(255,25,0,0.12)', 'rgba(24,24,24,0.85)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              
              <View style={styles.tripContent}>
                <View style={styles.routeContainer}>
                  <Text style={styles.origin}>{trip.origin}</Text>
                  <View style={styles.routeLine}>
                    <MaterialIcons name="flight" size={20} color="#ff1900" />
                  </View>
                  <Text style={styles.destination}>{trip.destination}</Text>
                </View>

                <View style={styles.tripInfo}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="airplanemode-active" size={16} color="#888" />
                    <Text style={styles.infoText}>{trip.airline}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="event" size={16} color="#888" />
                    <Text style={styles.infoText}>
                      {new Date(trip.departureDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.viewDetails}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#ff1900" />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    marginLeft: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  tripCard: {
    width: 280,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tripCardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: 'rgba(255,25,0,0.3)',
  },
  tripContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeLine: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  origin: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  destination: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  tripInfo: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    color: '#888',
    marginLeft: 8,
    fontSize: 14,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  viewDetailsText: {
    color: '#ff1900',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
}); 