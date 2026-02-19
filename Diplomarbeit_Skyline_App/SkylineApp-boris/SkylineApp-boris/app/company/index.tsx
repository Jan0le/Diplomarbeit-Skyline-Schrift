import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import {
    ensureCompanyInviteCode,
    listCompanyMembers,
    regenerateCompanyInviteCode,
    removeCompanyMember
} from '../../services/companyService';
import { supabase } from '../../services/db';
import { useFlights } from '../../store';
import type { CompanyMember, Flight } from '../../types';

export default function CompanyIndexScreen() {
  const router = useRouter();
  const {
    memberships,
    currentCompanyId,
    currentCompanyRole,
    switchCompany,
    refreshMemberships,
    accountType
  } = useAuth();
  const [statsLoading, setStatsLoading] = useState(false);
  const [companyStats, setCompanyStats] = useState({
    trips: 0,
    distanceKm: 0,
    countries: 0,
  });
  const [inviteCode, setInviteCode] = useState<string>('—');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberList, setMemberList] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [companyFlights, setCompanyFlights] = useState<Flight[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const flights = useFlights();

  const activeMembership = useMemo(() => {
    if (currentCompanyId) {
      return memberships.find(m => m.companyId === currentCompanyId) || null;
    }
    return memberships[0] || null;
  }, [currentCompanyId, memberships]);

  const companyMembers = useMemo(() => {
    if (!activeMembership) return [];
    return memberships.filter(m => m.companyId === activeMembership.companyId);
  }, [activeMembership, memberships]);

  const companyName = activeMembership?.company?.name || 'Your Company';
  const companyIdentifier = activeMembership?.companyId || currentCompanyId || '—';
  const roleLabel = (currentCompanyRole || accountType || 'worker')
    .toUpperCase();
  const isOwner = currentCompanyRole === 'owner';

  const totalTrips = companyStats.trips;
  const totalDistance = companyStats.distanceKm;
  const totalCountries = companyStats.countries;

  const hasOtherMemberships = memberships.length > 1;
  const memberSummary = `${memberList.length} member${memberList.length === 1 ? '' : 's'}`;
  const loadCompanyFlights = useCallback(async () => {
    if (!activeMembership) {
      setCompanyFlights([]);
      return;
    }

    setFlightsLoading(true);
    try {
      
      // Query flights by company_id instead of all member flights
      const { data, error } = await supabase
        .from('user_flights')
        .select(`
            id,
            profile_id,
            from_airport_id,
            to_airport_id,
            date,
            flight_number,
            airline,
            status,
            distance,
            distance_km,
            duration,
            company_id,
            created_at,
            updated_at,
            from_airport:from_airport_id (id, iata, icao, name, city, country, latitude, longitude),
            to_airport:to_airport_id (id, iata, icao, name, city, country, latitude, longitude)
          `)
        .eq('company_id', activeMembership.companyId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform to Flight format
      const transformedFlights: Flight[] = (data || [])
        .filter((row: any) => !!row?.from_airport && !!row?.to_airport)
        .map((row: any) => ({
        id: row.id,
        userId: row.profile_id,
        from: {
          id: row.from_airport.id,
          iata: row.from_airport.iata,
          icao: row.from_airport.icao,
          name: row.from_airport.name,
          city: row.from_airport.city,
          country: row.from_airport.country,
          latitude: row.from_airport.latitude,
          longitude: row.from_airport.longitude,
        },
        to: {
          id: row.to_airport.id,
          iata: row.to_airport.iata,
          icao: row.to_airport.icao,
          name: row.to_airport.name,
          city: row.to_airport.city,
          country: row.to_airport.country,
          latitude: row.to_airport.latitude,
          longitude: row.to_airport.longitude,
        },
        date: row.date,
        flightNumber: row.flight_number,
        airline: row.airline,
        status: row.status || 'upcoming',
        distance: row.distance,
        distanceKm: row.distance_km,
        duration: row.duration,
        companyId: row.company_id || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      setCompanyFlights(transformedFlights);
    } catch (e) {
      setCompanyFlights([]);
    } finally {
      setFlightsLoading(false);
    }
  }, [activeMembership]);

  const loadCompanyStats = useCallback(async () => {
    if (!activeMembership) {
      setCompanyStats({ trips: 0, distanceKm: 0, countries: 0 });
      return;
    }

    setStatsLoading(true);
    try {
      // Get ALL company members, not just current user's memberships
      const allCompanyMembers = await listCompanyMembers(activeMembership.companyId);
      const memberIds = allCompanyMembers.map(m => m.userId);

      if (memberIds.length === 0) {
        setCompanyStats({ trips: 0, distanceKm: 0, countries: 0 });
        setStatsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_flights')
        .select(`
            id,
            profile_id,
            distance,
            distance_km,
            from_airport:from_airport_id (country),
            to_airport:to_airport_id (country)
          `)
        .in('profile_id', memberIds)
        .eq('company_id', activeMembership.companyId);

      if (error) throw error;

      const trips = data?.length ?? 0;
      let distanceSum = 0;
      const countries = new Set<string>();

      (data || []).forEach(flight => {
        if (typeof flight.distance_km === 'number') {
          distanceSum += flight.distance_km;
        } else if (flight.distance) {
          const match = String(flight.distance).replace(/[^\d]/g, '').match(/(\d+)/);
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (!Number.isNaN(parsed)) distanceSum += parsed;
          }
        }
        const fromCountry = (flight as any)?.from_airport?.country;
        const toCountry = (flight as any)?.to_airport?.country;
        if (fromCountry) countries.add(fromCountry);
        if (toCountry) countries.add(toCountry);
      });

      setCompanyStats({
        trips,
        distanceKm: distanceSum,
        countries: countries.size,
      });
    } catch (e) {
      setCompanyStats({ trips: 0, distanceKm: 0, countries: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, [activeMembership]);

  // Only use useFocusEffect to avoid duplicate calls when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (activeMembership) {
        loadCompanyFlights();
        if (isOwner) {
          loadCompanyStats();
        }
      }
    }, [activeMembership, loadCompanyFlights, loadCompanyStats, isOwner])
  );
  
  useEffect(() => {
    refreshMemberships();
  }, []);

  // Reload flights when memberships change (e.g., after joining a company)
  // Only reload if memberships actually changed (not on every render)
  const membershipsRef = useRef(memberships.length);
  useEffect(() => {
    if (memberships.length !== membershipsRef.current && memberships.length > 0 && activeMembership) {
      membershipsRef.current = memberships.length;
      loadCompanyFlights();
    }
  }, [memberships.length, activeMembership, loadCompanyFlights]);
  const handleCopyInvite = useCallback(() => {
    if (!inviteCode || inviteCode === '—') {
      Alert.alert('Invite code unavailable', 'Create or select a company first.');
      return;
    }
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(inviteCode).then(() => {
        Alert.alert('Invite code copied', 'Share it with your teammates to let them join.');
      }).catch(() => {
        Alert.alert('Invite code', inviteCode);
      });
    } else {
      Alert.alert('Invite code', inviteCode);
    }
  }, [inviteCode]);

  const reloadInviteCode = useCallback(async (force?: boolean) => {
    if (!activeMembership?.companyId || !isOwner) {
      setInviteCode('—');
      return;
    }
    try {
      setInviteLoading(true);
      const code = force
        ? await regenerateCompanyInviteCode(activeMembership.companyId)
        : await ensureCompanyInviteCode(activeMembership.companyId);
      setInviteCode(code);
    } catch (error) {
      setInviteCode('—');
    } finally {
      setInviteLoading(false);
    }
  }, [activeMembership?.companyId, isOwner]);

  const reloadMembers = useCallback(async () => {
    if (!activeMembership?.companyId) {
      setMemberList([]);
      return;
    }
    setMembersLoading(true);
    try {
      const data = await listCompanyMembers(activeMembership.companyId);
      setMemberList(data);
    } catch (error) {
      setMemberList([]);
    } finally {
      setMembersLoading(false);
    }
  }, [activeMembership?.companyId]);

  useEffect(() => {
    reloadInviteCode(false);
  }, [reloadInviteCode]);

  useEffect(() => {
    reloadMembers();
  }, [reloadMembers]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a0b0b', '#0f0f0f']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>Company Dashboard</Text>
              <Text style={styles.heroTitle}>{companyName}</Text>
            </View>
            <View style={styles.roleBadge}>
              <MaterialIcons name="military-tech" size={16} color="#ffede4" />
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaLabel}>Company ID</Text>
            <Text style={styles.heroMetaValue}>{companyIdentifier}</Text>
          </View>

          {isOwner && (
            <View style={styles.heroStatsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="public" size={18} color="#ff6b6b" />
                <Text style={styles.statValue}>{statsLoading ? '…' : totalCountries.toString()}</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="flight-takeoff" size={18} color="#845ec2" />
                <Text style={styles.statValue}>{statsLoading ? '…' : totalTrips.toString()}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="straighten" size={18} color="#43e97b" />
                <Text style={styles.statValue}>
                  {statsLoading
                    ? '…'
                    : totalDistance > 0
                      ? `${Math.round(totalDistance).toLocaleString()} km`
                      : '0 km'}
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {isOwner && (
          <>
            <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.inviteCard}>
              <View style={styles.inviteHeaderRow}>
                <Text style={styles.sectionTitle}>Your invite code</Text>
                <Pressable style={styles.copyButton} onPress={handleCopyInvite}>
                  <MaterialIcons name="content-copy" size={16} color="#ff1900" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </Pressable>
              </View>
              <Text style={styles.inviteCodeValue}>{inviteLoading ? '…' : inviteCode}</Text>
              <Text style={styles.inviteHint}>Share this code with teammates so they can join instantly via &quot;Join Company&quot;.</Text>
              <Button
                title={inviteLoading ? 'Refreshing…' : 'Regenerate code'}
                onPress={() => reloadInviteCode(true)}
                disabled={inviteLoading}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.actionsCard}>
              <View style={styles.actionsHeader}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Pressable style={styles.manageButton} onPress={() => router.push('/company/invite')}>
                  <MaterialIcons name="settings" size={16} color="#fff" />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </Pressable>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.actionItem} onPress={() => router.push('/company/invite')}>
                  <MaterialIcons name="person-add" size={20} color="#ff1900" />
                  <Text style={styles.actionTitle}>Invite User</Text>
                  <Text style={styles.actionSubtitle}>Grow your team</Text>
                </Pressable>
                <Pressable style={styles.actionItem} onPress={() => router.push('/add-flight-manual?company=true')}>
                  <MaterialIcons name="flight" size={20} color="#ff1900" />
                  <Text style={styles.actionTitle}>Plan Trip</Text>
                  <Text style={styles.actionSubtitle}>Add a business flight</Text>
                </Pressable>
                <Pressable style={styles.actionItem} onPress={() => router.push('/flight-calendar')}>
                  <MaterialIcons name="calendar-month" size={20} color="#ff1900" />
                  <Text style={styles.actionTitle}>Calendar</Text>
                  <Text style={styles.actionSubtitle}>View schedules</Text>
                </Pressable>
              </View>
            </Animated.View>
          </>
        )}

        {/* Company Flights Section - shown for both Owner and Worker */}
        {activeMembership && (
          <Animated.View entering={FadeInDown.delay(isOwner ? 200 : 180).springify()} style={styles.companyFlightsCard}>
            <View style={styles.companyFlightsHeader}>
              <Text style={styles.sectionTitle}>Company Flights</Text>
              <Pressable onPress={() => router.push('/flight-calendar')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </Pressable>
            </View>
            {flightsLoading ? (
              <View style={styles.emptyFlightsContainer}>
                <Text style={styles.emptyFlightsText}>Loading flights...</Text>
              </View>
            ) : companyFlights.length === 0 ? (
              <View style={styles.emptyFlightsContainer}>
                <MaterialIcons name="flight-takeoff" size={32} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyFlightsText}>No flights yet</Text>
                <Text style={styles.emptyFlightsSubtext}>Add your first business trip to get started</Text>
                <Button 
                  title="Add Flight" 
                  onPress={() => router.push('/add-flight-manual')}
                  style={{ marginTop: 16 }}
                />
              </View>
            ) : (
              <View style={styles.flightsList}>
                {companyFlights.slice(0, 5).map((flight: Flight) => (
                  <Pressable
                    key={flight.id}
                    style={styles.flightRow}
                    onPress={() => router.push(`/trip-details?id=${flight.id}`)}
                  >
                    <View style={styles.flightIcon}>
                      <MaterialIcons name="flight" size={20} color="#ff1900" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.flightRoute}>
                        {flight.from?.iata || flight.from?.icao || flight.from?.city || '—'} → {flight.to?.iata || flight.to?.icao || flight.to?.city || '—'}
                      </Text>
                      <Text style={styles.flightDate}>
                        {new Date(flight.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                ))}
                {companyFlights.length > 5 && (
                  <Pressable 
                    style={styles.moreFlightsButton}
                    onPress={() => router.push('/flight-calendar')}
                  >
                    <Text style={styles.moreFlightsText}>
                      View {companyFlights.length - 5} more flight{companyFlights.length - 5 !== 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {!isOwner && (
          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.workerActionsCard}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.workerActionsRow}>
                <Pressable 
                  style={styles.workerActionItem} 
                  onPress={() => router.push('/add-flight-manual')}
                >
                  <MaterialIcons name="add" size={24} color="#ff1900" />
                  <Text style={styles.workerActionTitle}>Add Flight</Text>
                </Pressable>
                <Pressable 
                  style={styles.workerActionItem} 
                  onPress={() => router.push('/flight-calendar')}
                >
                  <MaterialIcons name="calendar-today" size={24} color="#ff1900" />
                  <Text style={styles.workerActionTitle}>Calendar</Text>
                </Pressable>
                <Pressable 
                  style={styles.workerActionItem} 
                  onPress={() => router.push('/company/join')}
                >
                  <MaterialIcons name="group-add" size={24} color="#ff1900" />
                  <Text style={styles.workerActionTitle}>Join Another</Text>
                </Pressable>
              </View>
            </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.teamCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <Text style={styles.sectionSubtitle}>{memberSummary}</Text>
          </View>
          <View style={styles.teamList}>
            {membersLoading ? (
              <Text style={styles.emptyText}>Loading members…</Text>
            ) : memberList.length === 0 ? (
              <Text style={styles.emptyText}>No team members yet. Share your invite code to add colleagues.</Text>
            ) : (
              memberList.map(member => (
                <View key={`${member.companyId}-${member.userId}`} style={styles.teamRow}>
                  <View style={styles.teamIcon}>
                    <MaterialIcons name="badge" size={18} color="#ff1900" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamName}>
                      {member.user?.fullName || member.user?.email || member.userId.slice(0, 8)}
                    </Text>
                    <Text style={styles.teamRole}>{member.role.toUpperCase()}</Text>
                  </View>
                  {isOwner && member.role !== 'owner' && (
                    <Pressable
                      style={styles.removeButton}
                      onPress={async () => {
                        Alert.alert(
                          'Remove member',
                          'Are you sure you want to remove this teammate?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await removeCompanyMember(member.companyId, member.userId);
                                  await reloadMembers();
                                } catch (error) {
                                  Alert.alert('Error', 'Could not remove member. Try again later.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <MaterialIcons name="person-remove" size={18} color="#ff1900" />
                    </Pressable>
                  )}
                  {member.role === 'owner' && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
          {isOwner && (
            <Pressable style={styles.viewMembersButton} onPress={() => router.push('/company/invite')}>
              <Text style={styles.viewMembersText}>Show invite code</Text>
              <MaterialIcons name="chevron-right" size={18} color="#ff1900" />
            </Pressable>
          )}
        </Animated.View>

        {hasOtherMemberships && (
          <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.switcherCard}>
            <Text style={styles.sectionTitle}>Other Companies</Text>
            <View style={{ height: 12 }} />
            {memberships
              .filter(m => m.companyId !== activeMembership?.companyId)
              .map(membership => (
                <Pressable
                  key={membership.companyId}
                  style={styles.switchRow}
                  onPress={() => switchCompany(membership.companyId)}
                >
                  <View style={styles.switchIcon}>
                    <MaterialIcons name="domain" size={18} color="#ff1900" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchName}>{membership.company?.name || membership.companyId}</Text>
                    <Text style={styles.switchRole}>Role: {membership.role}</Text>
                  </View>
                  <MaterialIcons name="arrow-forward-ios" size={16} color="#ff1900" />
                </Pressable>
              ))}
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,25,0,0.08)',
    gap: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,25,0,0.18)',
  },
  roleBadgeText: {
    color: '#ffede4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroMeta: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 14,
  },
  heroMetaLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroMetaValue: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionsCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 20,
  },
  workerInfoCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 12,
  },
  workerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 19,
  },
  companyFlightsCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 16,
  },
  companyFlightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerFlightsCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 16,
  },
  workerFlightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllLink: {
    color: '#ff1900',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyFlightsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyFlightsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyFlightsSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
  },
  flightsList: {
    gap: 12,
  },
  flightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  flightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,25,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flightRoute: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  flightDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  moreFlightsButton: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.3)',
    backgroundColor: 'rgba(255,25,0,0.08)',
  },
  moreFlightsText: {
    color: '#ff1900',
    fontSize: 13,
    fontWeight: '600',
  },
  workerActionsCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 16,
  },
  workerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  workerActionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  workerActionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,25,0,0.35)',
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionItem: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  teamCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  teamList: {
    gap: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,25,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  teamRole: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  inviteCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 12,
  },
  inviteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  inviteHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,25,0,0.15)',
  },
  copyButtonText: {
    color: '#ff1900',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,25,0,0.18)',
  },
  primaryBadgeText: {
    color: '#ffede4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  viewMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    alignSelf: 'flex-start',
  },
  viewMembersText: {
    color: '#ff1900',
    fontSize: 13,
    fontWeight: '600',
  },
  switcherCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  switchIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,25,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  switchRole: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,25,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
