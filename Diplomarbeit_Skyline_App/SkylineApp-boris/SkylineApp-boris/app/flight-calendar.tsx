import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore, useFlights } from '../store';
import { getUserEvents, type CalendarEventRow } from '../services/calendarService';
import { ensureDefaultRemindersForEvents, schedulePendingReminders } from '../services/reminderService';

const { width } = Dimensions.get('window');

export default function FlightCalendarScreen() {
  const { user } = useAuth();
  const flights = useFlights();
  const loadFlightsFromStore = useAppStore(state => state.loadFlights);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [showFlights, setShowFlights] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Load flights from Supabase when screen gains focus
  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!user?.id || isCancelled) {
          return;
        }
        loadFlightsFromStore();
        getUserEvents(user.id).then(result => {
          if (!isCancelled) {
            setEvents(result);
          }
        }).catch(() => {
          if (!isCancelled) {
            setEvents([]);
          }
        });
      });
      return () => {
        isCancelled = true;
        task?.cancel?.();
      };
    }, [user?.id, loadFlightsFromStore])
  );

  useEffect(() => {
    (async () => {
      try {
        if (events.length > 0) {
          await ensureDefaultRemindersForEvents(events);
          await schedulePendingReminders();
        }
      } catch {}
    })();
  }, [events]);

  // Set loading to false once flights are loaded
  useEffect(() => {
    if (flights.length >= 0) {
      setLoading(false);
    }
  }, [flights]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
    setSelectedDate(null);
  }, []);

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, []);

  const formatDateKey = useCallback((date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, []);

  const getFlightsForDate = useCallback((date: Date) => {
    if (!date) return [];
    
    const dateKey = formatDateKey(date);
    return flights.filter(flight => {
      try {
        const flightDate = new Date(flight.date);
        const flightDateKey = formatDateKey(flightDate);
        return flightDateKey === dateKey;
      } catch (error) {
        if (__DEV__) console.warn('Invalid flight date:', flight.date);
        return false;
      }
    });
  }, [flights, formatDateKey]);

  const getEventsForDate = useCallback((date: Date) => {
    if (!date) return [] as CalendarEventRow[];
    const dateKey = formatDateKey(date);
    return events.filter(ev => {
      if (!ev.starts_at) return false;
      const evDateKey = formatDateKey(new Date(ev.starts_at));
      return evDateKey === dateKey;
    });
  }, [events, formatDateKey]);

  const isToday = useCallback((date: Date) => {
    if (!date) return false;
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
  }, [formatDateKey]);

  const isSelected = useCallback((date: Date) => {
    if (!date || !selectedDate) return false;
    return formatDateKey(date) === formatDateKey(selectedDate);
  }, [selectedDate, formatDateKey]);

  const hasFlights = useCallback((date: Date) => {
    if (!date) return false;
    const c1 = showFlights ? getFlightsForDate(date).length : 0;
    const c2 = showEvents ? getEventsForDate(date).length : 0;
    return c1 + c2 > 0;
  }, [getFlightsForDate, getEventsForDate, showFlights, showEvents]);

  const renderCalendarGrid = useCallback(() => {
    const days = getDaysInMonth(currentDate);
    
    return (
      <View style={styles.calendarGrid}>
        {dayNames.map((day, index) => (
          <View key={`header-${index}`} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
        
        {days.map((day, index) => {
          const dayKey = day ? formatDateKey(day) : `empty-${index}`;
          const isDayToday = day ? isToday(day) : false;
          const isDaySelected = day ? isSelected(day) : false;
          const dayHasFlights = day ? hasFlights(day) : false;
          
          return (
            <Pressable
              key={dayKey}
              style={[
                styles.dayCell,
                isDayToday && styles.todayCell,
                isDaySelected && styles.selectedCell,
                dayHasFlights && styles.flightDayCell,
              ]}
              onPress={() => {
                if (day) {
                  setSelectedDate(new Date(day)); // Create new instance to ensure state update
                }
              }}
              disabled={!day}
            >
              {day && (
                <>
                  <Text style={[
                    styles.dayText,
                    isDayToday && styles.todayText,
                    isDaySelected && styles.selectedText,
                    dayHasFlights && styles.flightDayText,
                  ]}>
                    {day.getDate()}
                  </Text>
                  {dayHasFlights && (
                    <View style={styles.flightDot} />
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }, [currentDate, getDaysInMonth, formatDateKey, isToday, isSelected, hasFlights]);

  const renderSelectedDateFlights = useCallback(() => {
    if (!selectedDate) return null;

    const dayFlights = getFlightsForDate(selectedDate);
    const dayEvents = getEventsForDate(selectedDate);

    return (
      <Animated.View 
        entering={FadeInUp.springify()}
        style={styles.flightsContainer}
      >
        <Text style={styles.flightsTitle}>
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
        
        {showFlights && dayFlights.length > 0 ? (
          <View style={styles.flightsList}>
            {dayFlights.map((flight, index) => (
              <Animated.View key={index} entering={FadeInDown.delay(index * 100).springify()}>
                <Pressable style={styles.flightCard} onPress={() => router.push(`/trip-details?id=${flight.id}`)}>
                <View style={styles.flightHeader}>
                  <Text style={styles.flightDate}>
                    {new Date(flight.date).toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    flight.status === 'completed' && styles.statusBadgeCompleted,
                    flight.status === 'cancelled' && styles.statusBadgeCancelled
                  ]}>
                    <Text style={styles.statusText}>
                      {flight.status === 'upcoming' ? 'Upcoming' : 
                       flight.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.flightRoute}>
                  <View style={styles.airportSection}>
                    <Text style={styles.airportCode}>{flight.from.iata}</Text>
                    <Text style={styles.airportCity}>{flight.from.city}</Text>
                  </View>
                  
                  <View style={styles.routeConnector}>
                    <View style={styles.flightLine} />
                    <MaterialIcons name="flight" size={16} color="#ff1900" />
                    <View style={styles.flightLine} />
                  </View>
                  
                  <View style={styles.airportSection}>
                    <Text style={styles.airportCode}>{flight.to.iata}</Text>
                    <Text style={styles.airportCity}>{flight.to.city}</Text>
                  </View>
                </View>
                
                <View style={styles.flightDetails}>
                  <Text style={styles.flightNumber}>{flight.flightNumber || 'N/A'}</Text>
                  {flight.duration && (
                    <Text style={styles.flightTime}>{flight.duration}</Text>
                  )}
                </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ) : (!showFlights ? null : (
          <Animated.View 
            entering={FadeInUp.springify()}
            style={styles.noFlightsCard}
          >
            <MaterialIcons name="flight-takeoff" size={32} color="rgba(255,255,255,0.5)" />
            <Text style={styles.noFlightsText}>No flights on this date</Text>
            <Text style={styles.noFlightsSubtext}>Add a flight to see it here</Text>
          </Animated.View>
        ))}
        {showEvents && dayEvents.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.flightsTitle}>Events</Text>
            <View style={styles.flightsList}>
              {dayEvents.map((ev, idx) => (
                <Animated.View key={ev.id} entering={FadeInDown.delay(idx * 80).springify()}>
                  <View style={styles.flightCard}>
                    <View style={styles.flightHeader}>
                      <Text style={styles.flightDate}>
                        {ev.starts_at ? new Date(ev.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {ev.ends_at ? ` - ${new Date(ev.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </Text>
                      <View style={[styles.statusBadge]}>
                        <Text style={styles.statusText}>{ev.source_type}</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{ev.title}</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    );
  }, [selectedDate, getFlightsForDate, getEventsForDate]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['rgba(255,25,0,0.05)', '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <Pressable 
            style={styles.backButton}
            onPress={() => {
              const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
              if (canGoBack) router.back();
              else router.replace('/(tabs)/home');
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          
          <Text style={styles.headerTitle}>Flight Calendar</Text>
          
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Month Navigation */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.monthNavigation}
        >
          <Pressable 
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <MaterialIcons name="chevron-left" size={24} color="#ff1900" />
          </Pressable>
          
          <Text style={styles.monthTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          
          <Pressable 
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <MaterialIcons name="chevron-right" size={24} color="#ff1900" />
          </Pressable>
        </Animated.View>

        {/* Calendar */}
        <Animated.View 
          entering={FadeInDown.delay(300).springify()}
          style={styles.calendarContainer}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={styles.calendarCard}
          >
            {renderCalendarGrid()}
          </LinearGradient>
        </Animated.View>

        {/* Filters */}
        <View style={styles.filterSegment}>
          <Pressable 
            onPress={() => setShowFlights(v => !v)} 
            style={[styles.filterChip, showFlights && styles.filterChipActive]}
          >
            <MaterialIcons name="flight" size={14} color={showFlights ? '#fff' : '#ff1900'} />
            <Text style={[styles.filterChipText, showFlights && styles.filterChipTextActive]}>Flights</Text>
          </Pressable>
          <Pressable 
            onPress={() => setShowEvents(v => !v)} 
            style={[styles.filterChip, showEvents && styles.filterChipActive]}
          >
            <MaterialIcons name="event" size={14} color={showEvents ? '#fff' : '#ff1900'} />
            <Text style={[styles.filterChipText, showEvents && styles.filterChipTextActive]}>Events</Text>
          </Pressable>
        </View>

        {/* Selected Date Flights */}
        {renderSelectedDateFlights()}

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,25,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Filter segmented control
  filterSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,25,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.2)',
  },
  filterChipActive: {
    backgroundColor: '#ff1900',
    borderColor: 'rgba(255,25,0,0.8)'
  },
  filterChipText: {
    color: '#ff1900',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  calendarContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: `${100/7}%`,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayHeaderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  dayCell: {
    width: `${100/7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  todayCell: {
    backgroundColor: 'rgba(255,25,0,0.2)',
    borderRadius: 16,
  },
  selectedCell: {
    backgroundColor: '#ff1900',
    borderRadius: 16,
  },
  flightDayCell: {
    // Additional styling for days with flights
  },
  dayText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  todayText: {
    color: '#ff1900',
    fontWeight: '700',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  flightDayText: {
    color: '#43e97b',
    fontWeight: '600',
  },
  flightDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#43e97b',
  },
  flightsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  flightsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  flightsList: {
    gap: 10,
  },
  flightCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flightDate: {
    color: '#ff1900',
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#43e97b', // Green for upcoming
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeCompleted: {
    backgroundColor: '#2196F3', // Blue for completed
  },
  statusBadgeCancelled: {
    backgroundColor: '#FF5252', // Red for cancelled
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  airportSection: {
    flex: 1,
    alignItems: 'center',
  },
  airportCode: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  airportCity: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  flightLine: {
    width: 35,
    height: 2,
    backgroundColor: '#ff1900',
  },
  flightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flightNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flightTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  noFlightsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noFlightsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  noFlightsSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});
