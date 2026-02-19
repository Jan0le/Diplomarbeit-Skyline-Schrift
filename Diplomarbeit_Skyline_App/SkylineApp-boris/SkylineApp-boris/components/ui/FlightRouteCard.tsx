import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, IconSizes, Spacing, Typography } from '../../constants/DesignTokens';
import { Flight } from '../../types';

type FlightRouteCardProps = {
  flight: Flight;
  variant?: 'compact' | 'full';
  onPress?: () => void;
  accessibilityLabel?: string;
};

function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toTimeString().slice(0, 5);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FlightRouteCard({
  flight,
  variant = 'full',
  onPress,
  accessibilityLabel,
}: FlightRouteCardProps) {
  const fromIata = (flight.from?.iata || flight.from?.icao || '???').toString().toUpperCase();
  const toIata = (flight.to?.iata || flight.to?.icao || '???').toString().toUpperCase();
  const label =
    accessibilityLabel ?? `Flight ${flight.flightNumber || ''} from ${fromIata} to ${toIata}`;

  const content = (
    <LinearGradient
      colors={[Colors.background.secondary, Colors.background.primary]}
      style={styles.gradient}
    >
      <View style={styles.header}>
        <View style={styles.flightIdRow}>
          <MaterialIcons name="flight" size={IconSizes.sm} color={Colors.primary.main} />
          <Text style={styles.flightNumber}>
            {flight.flightNumber || 'Flight'}
          </Text>
          {flight.airline && (
            <Text style={styles.airline}>• {flight.airline}</Text>
          )}
        </View>
        <View
          style={[
            styles.statusChip,
            {
              backgroundColor:
                flight.status === 'completed'
                  ? 'rgba(76,175,80,0.2)'
                  : flight.status === 'cancelled'
                    ? 'rgba(244,67,54,0.2)'
                    : 'rgba(33,150,243,0.2)',
              borderColor:
                flight.status === 'completed'
                  ? 'rgba(76,175,80,0.5)'
                  : flight.status === 'cancelled'
                    ? 'rgba(244,67,54,0.5)'
                    : 'rgba(33,150,243,0.5)',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  flight.status === 'completed'
                    ? '#4CAF50'
                    : flight.status === 'cancelled'
                      ? '#F44336'
                      : '#2196F3',
              },
            ]}
          >
            {flight.status.charAt(0).toUpperCase() + flight.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.airportBlock}>
          <Text style={styles.iataCode}>{fromIata}</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {flight.from?.city || flight.from?.name || '—'}
          </Text>
          <Text style={styles.timeLabel}>{formatTime(flight.departureAt)}</Text>
        </View>

        <View style={styles.routeConnector}>
          <View style={styles.routeDash} />
          <View style={styles.planeCircle}>
            <MaterialIcons
              name="flight"
              size={IconSizes.md}
              color="#fff"
              style={{ transform: [{ rotate: '90deg' }] }}
            />
          </View>
          <View style={styles.routeDash} />
        </View>

        <View style={[styles.airportBlock, { alignItems: 'flex-end' }]}>
          <Text style={styles.iataCode}>{toIata}</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {flight.to?.city || flight.to?.name || '—'}
          </Text>
          <Text style={styles.timeLabel}>{formatTime(flight.arrivalAt)}</Text>
        </View>
      </View>

      {variant === 'full' && (
        <View style={styles.metaStrip}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={IconSizes.xs} color={Colors.text.tertiary} />
            <Text style={styles.metaText}>{formatDate(flight.date)}</Text>
          </View>
          {flight.duration && (
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={IconSizes.xs} color={Colors.text.tertiary} />
              <Text style={styles.metaText}>{flight.duration}</Text>
            </View>
          )}
          {flight.distance && (
            <View style={styles.metaItem}>
              <MaterialIcons name="straighten" size={IconSizes.xs} color={Colors.text.tertiary} />
              <Text style={styles.metaText}>{flight.distance}</Text>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityHint="Opens trip details"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.95,
  },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  flightIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  flightNumber: {
    fontFamily: Typography.fontFamily.display,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  airline: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  statusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  airportBlock: {
    flex: 1,
  },
  iataCode: {
    fontFamily: Typography.fontFamily.display,
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  cityName: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  timeLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  routeDash: {
    width: 24,
    height: 1,
    backgroundColor: Colors.border.primary,
  },
  planeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
});
