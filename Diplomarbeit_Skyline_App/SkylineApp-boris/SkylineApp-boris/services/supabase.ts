/**
 * 🗄️ SUPABASE DATABASE SERVICE
 * Bereit für Integration in neuem Chat
 */

import { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  Airport,
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  DatabaseService,
  Flight,
  FlightFilters,
  Note,
  NoteTemplate,
  Purpose,
  User,
  UserStats
} from '../types';
import { supabase } from './db';

export class SupabaseService implements DatabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;

  private constructor() {
    this.supabase = supabase;
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // =============================================
  // USER MANAGEMENT
  // =============================================

  async createUser(userData: { id: string; name: string; email: string; preferences: User['preferences'] }): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert([{
        id: userData.id,
        full_name: userData.name,
        avatar_url: null,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.full_name,
      email: userData.email,
      preferences: userData.preferences,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getUser(id: string): Promise<User | null> {
    // TODO: Implement Supabase user retrieval
    throw new Error('Method not implemented - ready for Supabase integration');
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // TODO: Implement Supabase user update
    throw new Error('Method not implemented - ready for Supabase integration');
  }

  async deleteUser(id: string): Promise<void> {
    // TODO: Implement Supabase user deletion
    throw new Error('Method not implemented - ready for Supabase integration');
  }

  // =============================================
  // FLIGHT MANAGEMENT
  // =============================================

  async createFlight(flightData: Omit<Flight, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flight> {
    try {
      // Try to get user from session
      const { data: sessionData } = await this.supabase.auth.getSession();
      let user = sessionData.session?.user;
      
      // If no session, try getUser
      if (!user) {
        const { data: userData } = await this.supabase.auth.getUser();
        user = userData.user ?? undefined;
      }
      
      // If STILL no user, use a default/test user ID
      let userId: string;
      if (user) {
        userId = user.id;
      } else {
        // Try to get ANY user from profiles table as fallback
        const { data: profiles } = await this.supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .single();
        
        if (profiles) {
          userId = profiles.id;
        } else {
          throw new Error("No user available. Please create an account first.");
        }
      }

      // Get or create airports
      const fromAirport = await this.getOrCreateAirport(flightData.from);
      const toAirport = await this.getOrCreateAirport(flightData.to);

      // Create flight record in user_flights table
      const { data, error} = await this.supabase
        .from('user_flights')
        .insert([{
          profile_id: userId,
          from_airport_id: fromAirport.id,
          to_airport_id: toAirport.id,
          date: flightData.date,
          departure_at: (flightData as any).departureAt || null,
          arrival_at: (flightData as any).arrivalAt || null,
          flight_number: flightData.flightNumber,
          airline: flightData.airline,
          confirmation_code: flightData.confirmationCode,
          booking_reference: flightData.bookingReference,
          seat: flightData.seat,
          gate: flightData.gate,
          terminal: flightData.terminal,
          status: flightData.status,
          notes: flightData.notes,
          images: flightData.images || [],
          duration: flightData.duration,
          distance: flightData.distance,
          distance_km: (flightData as any).distanceKm || null,
          company_id: flightData.companyId || null
        }])
        .select(`
          id,
          profile_id,
          from_airport_id,
          to_airport_id,
          date,
          departure_at,
          arrival_at,
          flight_number,
          airline,
          confirmation_code,
          booking_reference,
          seat,
          gate,
          terminal,
          status,
          notes,
          images,
          duration,
          distance,
          distance_km,
          company_id,
          created_at,
          updated_at,
          from_airport:from_airport_id (
            id, iata, name, city, country, latitude, longitude
          ),
          to_airport:to_airport_id (
            id, iata, name, city, country, latitude, longitude
          )
        `)
        .single();

      if (error) throw error;

      const fromRow: any = Array.isArray((data as any).from_airport) ? (data as any).from_airport[0] : (data as any).from_airport;
      const toRow: any = Array.isArray((data as any).to_airport) ? (data as any).to_airport[0] : (data as any).to_airport;
      if (!fromRow || !toRow) throw new Error('Airport join missing in createFlight response');

      // Transform to Flight type
      const flight: Flight = {
        id: data.id,
        userId: data.profile_id,
        from: {
          id: fromRow.id,
          iata: fromRow.iata,
          name: fromRow.name,
          city: fromRow.city,
          country: fromRow.country,
          latitude: fromRow.latitude,
          longitude: fromRow.longitude
        },
        to: {
          id: toRow.id,
          iata: toRow.iata,
          name: toRow.name,
          city: toRow.city,
          country: toRow.country,
          latitude: toRow.latitude,
          longitude: toRow.longitude
        },
        date: data.date,
        departureAt: (data as any).departure_at ?? undefined,
        arrivalAt: (data as any).arrival_at ?? undefined,
        flightNumber: data.flight_number,
        airline: data.airline,
        confirmationCode: data.confirmation_code,
        bookingReference: data.booking_reference,
        seat: data.seat,
        gate: data.gate,
        terminal: data.terminal,
        status: data.status,
        notes: data.notes,
        images: data.images,
        duration: data.duration,
        distance: data.distance,
        distanceKm: (data as any).distance_km ?? undefined,
        companyId: data.company_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return flight;
    } catch (error) {
      throw error;
    }
  }

  async getFlights(userId: string, filters?: FlightFilters): Promise<Flight[]> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) return [];

      // Fetch company memberships to include accessible company flights
      const { data: memberships } = await this.supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id);

      const companyIds = (memberships || [])
        .map(m => m.company_id)
        .filter((id): id is string => !!id);

      let query = this.supabase
        .from('user_flights')
        .select(`
          id,
          profile_id,
          from_airport_id,
          to_airport_id,
          date,
          departure_at,
          arrival_at,
          flight_number,
          airline,
          confirmation_code,
          booking_reference,
          seat,
          gate,
          terminal,
          status,
          notes,
          images,
          duration,
          distance,
          distance_km,
          company_id,
          company:company_id (id, name),
          created_at,
          updated_at,
          from_airport:from_airport_id (
            id, iata, name, city, country, latitude, longitude
          ),
          to_airport:to_airport_id (
            id, iata, name, city, country, latitude, longitude
          )
        `)
        .order('date', { ascending: true });

      // Include personal flights plus company flights where user is a member
      if (companyIds.length > 0) {
        query = query.or([
          `profile_id.eq.${user.id}`,
          `company_id.in.(${companyIds.join(',')})`
        ].join(','));
      } else {
        query = query.eq('profile_id', user.id);
      }

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to Flight array (normalize embedded airport joins which may come back as arrays)
      const flights: Flight[] = (data || [])
        .map((flight: any) => {
          const fromRow = Array.isArray(flight.from_airport) ? flight.from_airport[0] : flight.from_airport;
          const toRow = Array.isArray(flight.to_airport) ? flight.to_airport[0] : flight.to_airport;
          if (!fromRow || !toRow) return null;
          const mapped: Flight = {
            id: flight.id,
            userId: flight.profile_id,
            from: {
              id: fromRow.id,
              iata: fromRow.iata,
              name: fromRow.name,
              city: fromRow.city,
              country: fromRow.country,
              latitude: fromRow.latitude,
              longitude: fromRow.longitude
            },
            to: {
              id: toRow.id,
              iata: toRow.iata,
              name: toRow.name,
              city: toRow.city,
              country: toRow.country,
              latitude: toRow.latitude,
              longitude: toRow.longitude
            },
            date: flight.date,
            departureAt: (flight as any).departure_at ?? undefined,
            arrivalAt: (flight as any).arrival_at ?? undefined,
            flightNumber: flight.flight_number,
            airline: flight.airline,
            confirmationCode: flight.confirmation_code,
            bookingReference: flight.booking_reference,
            seat: flight.seat,
            gate: flight.gate,
            terminal: flight.terminal,
            status: flight.status,
            notes: flight.notes,
            images: flight.images,
            duration: flight.duration,
            distance: flight.distance,
            distanceKm: (flight as any).distance_km ?? undefined,
            companyId: flight.company_id || undefined,
            companyName: (flight as any).company?.name ?? undefined,
            createdAt: new Date(flight.created_at),
            updatedAt: new Date(flight.updated_at)
          };
          return mapped;
        })
        .filter((f: Flight | null): f is Flight => !!f);

      return flights;
    } catch (error) {
      throw error;
    }
  }

  async getFlight(id: string): Promise<Flight | null> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('user_flights')
        .select(`
          id,
          profile_id,
          from_airport_id,
          to_airport_id,
          date,
          departure_at,
          arrival_at,
          flight_number,
          airline,
          confirmation_code,
          booking_reference,
          seat,
          gate,
          terminal,
          status,
          notes,
          images,
          duration,
          distance,
          created_at,
          updated_at,
          from_airport:from_airport_id (
            id, iata, name, city, country, latitude, longitude
          ),
          to_airport:to_airport_id (
            id, iata, name, city, country, latitude, longitude
          )
        `)
        .eq('id', id)
        .eq('profile_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      const fromRow: any = Array.isArray((data as any).from_airport) ? (data as any).from_airport[0] : (data as any).from_airport;
      const toRow: any = Array.isArray((data as any).to_airport) ? (data as any).to_airport[0] : (data as any).to_airport;
      if (!fromRow || !toRow) throw new Error('Airport join missing in getFlight response');

      // Transform to Flight type
      const flight: Flight = {
        id: data.id,
        userId: data.profile_id,
        from: {
          id: fromRow.id,
          iata: fromRow.iata,
          name: fromRow.name,
          city: fromRow.city,
          country: fromRow.country,
          latitude: fromRow.latitude,
          longitude: fromRow.longitude
        },
        to: {
          id: toRow.id,
          iata: toRow.iata,
          name: toRow.name,
          city: toRow.city,
          country: toRow.country,
          latitude: toRow.latitude,
          longitude: toRow.longitude
        },
        date: data.date,
        departureAt: (data as any).departure_at ?? undefined,
        arrivalAt: (data as any).arrival_at ?? undefined,
        flightNumber: data.flight_number,
        airline: data.airline,
        confirmationCode: data.confirmation_code,
        bookingReference: data.booking_reference,
        seat: data.seat,
        gate: data.gate,
        terminal: data.terminal,
        status: data.status,
        notes: data.notes,
        images: data.images,
        duration: data.duration,
        distance: data.distance,
        distanceKm: (data as any).distance_km ?? undefined,
        companyId: (data as any).company_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return flight;
    } catch (error) {
      throw error;
    }
  }

  async updateFlight(id: string, updates: Partial<Flight>): Promise<Flight> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No user logged in");

      // Prepare update data
      const updateData: any = {};
      
      if (updates.from) {
        const fromAirport = await this.getOrCreateAirport(updates.from);
        updateData.from_airport_id = fromAirport.id;
      }
      if (updates.to) {
        const toAirport = await this.getOrCreateAirport(updates.to);
        updateData.to_airport_id = toAirport.id;
      }
      if (updates.date) updateData.date = updates.date;
      if ('departureAt' in updates) updateData.departure_at = (updates as any).departureAt ?? null;
      if ('arrivalAt' in updates) updateData.arrival_at = (updates as any).arrivalAt ?? null;
      if (updates.flightNumber) updateData.flight_number = updates.flightNumber;
      if (updates.airline) updateData.airline = updates.airline;
      if (updates.confirmationCode) updateData.confirmation_code = updates.confirmationCode;
      if (updates.bookingReference) updateData.booking_reference = updates.bookingReference;
      if (updates.seat) updateData.seat = updates.seat;
      if (updates.gate) updateData.gate = updates.gate;
      if (updates.terminal) updateData.terminal = updates.terminal;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes) updateData.notes = updates.notes;
      if (updates.images) updateData.images = updates.images;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.distance) updateData.distance = updates.distance;
      if (typeof (updates as any).distanceKm === 'number') updateData.distance_km = (updates as any).distanceKm;

      const { data, error } = await this.supabase
        .from('user_flights')
        .update(updateData)
        .eq('id', id)
        .eq('profile_id', user.id)
        .select(`
          id,
          profile_id,
          from_airport_id,
          to_airport_id,
          date,
          departure_at,
          arrival_at,
          flight_number,
          airline,
          confirmation_code,
          booking_reference,
          seat,
          gate,
          terminal,
          status,
          notes,
          images,
          duration,
          distance,
          distance_km,
          created_at,
          updated_at,
          from_airport:from_airport_id (
            id, iata, name, city, country, latitude, longitude
          ),
          to_airport:to_airport_id (
            id, iata, name, city, country, latitude, longitude
          )
        `)
        .single();

      if (error) throw error;

      const fromRow: any = Array.isArray((data as any).from_airport) ? (data as any).from_airport[0] : (data as any).from_airport;
      const toRow: any = Array.isArray((data as any).to_airport) ? (data as any).to_airport[0] : (data as any).to_airport;
      if (!fromRow || !toRow) throw new Error('Airport join missing in updateFlight response');

      // Transform to Flight type
      const flight: Flight = {
        id: data.id,
        userId: data.profile_id,
        from: {
          id: fromRow.id,
          iata: fromRow.iata,
          name: fromRow.name,
          city: fromRow.city,
          country: fromRow.country,
          latitude: fromRow.latitude,
          longitude: fromRow.longitude
        },
        to: {
          id: toRow.id,
          iata: toRow.iata,
          name: toRow.name,
          city: toRow.city,
          country: toRow.country,
          latitude: toRow.latitude,
          longitude: toRow.longitude
        },
        date: data.date,
        departureAt: (data as any).departure_at ?? undefined,
        arrivalAt: (data as any).arrival_at ?? undefined,
        flightNumber: data.flight_number,
        airline: data.airline,
        confirmationCode: data.confirmation_code,
        bookingReference: data.booking_reference,
        seat: data.seat,
        gate: data.gate,
        terminal: data.terminal,
        status: data.status,
        notes: data.notes,
        images: data.images,
        duration: data.duration,
        distance: data.distance,
        distanceKm: (data as any).distance_km ?? undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return flight;
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // EMAIL ACCOUNTS / IMPORTS (FA-03)
  // =============================================

  async upsertEmailAccount(input: {
    provider: string;
    email: string;
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpiresAt: Date | null;
    syncEnabled: boolean;
    metadata?: any;
  }): Promise<any> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { data, error } = await this.supabase
      .from('email_accounts')
      .upsert(
        [
          {
            profile_id: user.id,
            provider: input.provider,
            email: input.email,
            access_token: input.accessToken,
            refresh_token: input.refreshToken,
            access_token_expires_at: input.accessTokenExpiresAt ? input.accessTokenExpiresAt.toISOString() : null,
            sync_enabled: input.syncEnabled,
            is_connected: true,
            metadata: input.metadata ?? null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'profile_id,email,provider' as any }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async listEmailAccounts(): Promise<any[]> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('email_accounts')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async deleteEmailAccount(accountId: string): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');
    const { error } = await this.supabase
      .from('email_accounts')
      .delete()
      .eq('id', accountId)
      .eq('profile_id', user.id);
    if (error) throw error;
  }

  async setEmailAccountSyncEnabled(accountId: string, enabled: boolean): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');
    const { error } = await this.supabase
      .from('email_accounts')
      .update({ sync_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('profile_id', user.id);
    if (error) throw error;
  }

  async updateEmailAccountTokens(accountId: string, input: { accessToken: string; refreshToken?: string; expiresAt?: Date | null }): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');
    const { error } = await this.supabase
      .from('email_accounts')
      .update({
        access_token: input.accessToken,
        refresh_token: input.refreshToken ?? null,
        access_token_expires_at: input.expiresAt ? input.expiresAt.toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('profile_id', user.id);
    if (error) throw error;
  }

  async upsertEmailImport(input: {
    emailAccountId: string;
    provider: string;
    messageId: string;
    receivedAt?: Date;
    subject?: string;
    snippet?: string;
    rawPayload?: any;
    parseStatus: string;
    parseError?: string | null;
    flightId?: string | null;
  }): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { error } = await this.supabase
      .from('email_imports')
      .upsert(
        [
          {
            profile_id: user.id,
            email_account_id: input.emailAccountId,
            provider: input.provider,
            message_id: input.messageId,
            received_at: input.receivedAt ? input.receivedAt.toISOString() : null,
            subject: input.subject ?? null,
            snippet: input.snippet ?? null,
            raw_payload: input.rawPayload ?? null,
            parse_status: input.parseStatus,
            parse_error: input.parseError ?? null,
            flight_id: input.flightId ?? null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'profile_id,provider,message_id' as any }
      );
    if (error) throw error;
  }

  async markEmailAccountSynced(accountId: string): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('email_accounts')
      .update({ last_synced_at: now, last_sync: now, updated_at: now })
      .eq('id', accountId)
      .eq('profile_id', user.id);
    if (error) throw error;
  }

  async deleteFlight(id: string): Promise<void> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No user logged in");

      const { error } = await this.supabase
        .from('user_flights')
        .delete()
        .eq('id', id)
        .eq('profile_id', user.id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to get or create airport
  private async getOrCreateAirport(airportData: any): Promise<any> {
    try {
      // Validate required fields - IATA can be empty if ICAO exists
      const airportCode = airportData.iata || airportData.icao || airportData.id;
      if (!airportCode || !airportData.name) {
        throw new Error(`Invalid airport data - need at least IATA/ICAO and name. Got: ${JSON.stringify({iata: airportData.iata, icao: airportData.icao, name: airportData.name})}`);
      }
      
      // Ensure we have coordinates for flight animation
      if (!airportData.latitude || !airportData.longitude) {
        airportData.latitude = airportData.latitude || 0;
        airportData.longitude = airportData.longitude || 0;
      }
      
      // First try to find existing airport by IATA or ICAO
      
      let existing = null;
      let searchError = null;
      
      // Search by IATA first
      if (airportData.iata) {
        const result = await this.supabase
          .from('airports')
          .select('id, iata, icao, name, city, country, latitude, longitude')
          .eq('iata', airportData.iata)
          .maybeSingle();
        existing = result.data;
        searchError = result.error;
      }
      
      // If not found and we have ICAO, try searching by ICAO
      if (!existing && airportData.icao) {
        const result = await this.supabase
          .from('airports')
          .select('id, iata, icao, name, city, country, latitude, longitude')
          .eq('icao', airportData.icao)
          .maybeSingle();
        existing = result.data;
        searchError = result.error;
      }

      if (existing) {
        return existing;
      }
      
      if (searchError) {
        throw searchError;
      }

      // Airport not found in database - create it from API data
      
      const { data, error } = await this.supabase
        .from('airports')
        .insert([{
          iata: airportData.iata || null,
          icao: airportData.icao || null,
          name: airportData.name,
          city: airportData.city || null,
          country: airportData.country || null,
          latitude: airportData.latitude || 0,
          longitude: airportData.longitude || 0,
          timezone: null
        }])
        .select('id, iata, icao, name, city, country, latitude, longitude')
        .single();

      if (error) {
        // If insert fails (maybe due to UNIQUE constraint), try searching one more time
        if (error.code === '23505') { // PostgreSQL unique violation
          if (airportData.iata) {
            const retry = await this.supabase
              .from('airports')
              .select('id, iata, icao, name, city, country, latitude, longitude')
              .eq('iata', airportData.iata)
              .maybeSingle();
            if (retry.data) {
              return retry.data;
            }
          }
        }
        // RLS permission denied
        if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
          throw new Error('Airports database is locked by security policy. Please have an admin enable insert/select policies for airports.');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // ANALYTICS
  // =============================================

  async getUserStats(userId: string): Promise<UserStats> {
    const { data, error } = await this.supabase.rpc('get_user_stats', { p_user_id: userId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      tripsTaken: row?.trips_taken ?? 0,
      countriesVisited: row?.countries_visited ?? 0,
      totalDistance: row?.total_distance_km ?? 0,
      photosTaken: 0,
      favoriteDestination: undefined,
      averageTripDuration: 0,
    };
  }

  // =============================================
  // AIRPORTS
  // =============================================

  async searchAirports(query: string, limit: number = 50): Promise<Airport[]> {
    // TODO: Implement Supabase airport search
    throw new Error('Method not implemented - ready for Supabase integration');
  }

  async getAirport(iata: string): Promise<Airport | null> {
    // TODO: Implement Supabase airport retrieval
    throw new Error('Method not implemented - ready for Supabase integration');
  }

  // =============================================
  // NOTES
  // =============================================

  async getNotes(flightId: string): Promise<Note[]> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('user_notes')
      .select('id, profile_id, flight_id, purpose, title, content, reminder_at, created_at, updated_at')
      .eq('flight_id', flightId)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((n): Note => ({
      id: n.id,
      profileId: n.profile_id,
      flightId: n.flight_id,
      purpose: n.purpose as Purpose,
      title: n.title,
      content: n.content || '',
      reminderAt: n.reminder_at || undefined,
      createdAt: new Date(n.created_at),
      updatedAt: new Date(n.updated_at),
    }));
  }

  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'profileId'>): Promise<Note> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { data, error } = await this.supabase
      .from('user_notes')
      .insert([{ 
        profile_id: user.id,
        flight_id: note.flightId,
        purpose: note.purpose,
        title: note.title,
        content: note.content,
        reminder_at: note.reminderAt || null,
      }])
      .select('id, profile_id, flight_id, purpose, title, content, reminder_at, created_at, updated_at')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      profileId: data.profile_id,
      flightId: data.flight_id,
      purpose: data.purpose as Purpose,
      title: data.title,
      content: data.content || '',
      reminderAt: data.reminder_at || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const payload: any = {};
    if (updates.purpose) payload.purpose = updates.purpose;
    if (typeof updates.title === 'string') payload.title = updates.title;
    if (typeof updates.content === 'string') payload.content = updates.content;
    if ('reminderAt' in updates) payload.reminder_at = updates.reminderAt ?? null;

    const { data, error } = await this.supabase
      .from('user_notes')
      .update(payload)
      .eq('id', id)
      .eq('profile_id', user.id)
      .select('id, profile_id, flight_id, purpose, title, content, reminder_at, created_at, updated_at')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      profileId: data.profile_id,
      flightId: data.flight_id,
      purpose: data.purpose as Purpose,
      title: data.title,
      content: data.content || '',
      reminderAt: data.reminder_at || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async deleteNote(id: string): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');
    const { error } = await this.supabase
      .from('user_notes')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);
    if (error) throw error;
  }

  // =============================================
  // CHECKLISTS
  // =============================================

  async getChecklists(flightId: string): Promise<Checklist[]> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data: headers, error: hErr } = await this.supabase
      .from('user_checklists')
      .select('id, profile_id, flight_id, purpose, title, reminder_at, created_at, updated_at')
      .eq('flight_id', flightId)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true });
    if (hErr) throw hErr;

    const ids = (headers || []).map(h => h.id);
    if (ids.length === 0) return [];

    const { data: items, error: iErr } = await this.supabase
      .from('user_checklist_items')
      .select('id, checklist_id, text, checked, order_idx, created_at, updated_at')
      .in('checklist_id', ids)
      .order('order_idx', { ascending: true });
    if (iErr) throw iErr;

    const byChecklist: Record<string, ChecklistItem[]> = {};
    for (const it of items || []) {
      const arr = byChecklist[it.checklist_id] || (byChecklist[it.checklist_id] = []);
      arr.push({
        id: it.id,
        text: it.text,
        checked: !!it.checked,
        orderIndex: it.order_idx,
      });
    }

    return (headers || []).map((h): Checklist => ({
      id: h.id,
      profileId: h.profile_id,
      flightId: h.flight_id,
      purpose: h.purpose as Purpose,
      title: h.title,
      items: byChecklist[h.id] || [],
      reminderAt: h.reminder_at || undefined,
      createdAt: new Date(h.created_at),
      updatedAt: new Date(h.updated_at),
    }));
  }

  async createChecklist(
    data: Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId'>,
    items: Array<Omit<ChecklistItem, 'id'>>
  ): Promise<Checklist> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { data: header, error } = await this.supabase
      .from('user_checklists')
      .insert([{ 
        profile_id: user.id,
        flight_id: data.flightId,
        purpose: data.purpose,
        title: data.title,
        reminder_at: data.reminderAt || null,
      }])
      .select('id, profile_id, flight_id, purpose, title, reminder_at, created_at, updated_at')
      .single();
    if (error) throw error;

    let createdItems: ChecklistItem[] = [];
    if (items && items.length > 0) {
      const payload = items.map((it, idx) => ({
        checklist_id: header.id,
        text: it.text,
        checked: !!it.checked,
        order_idx: typeof it.orderIndex === 'number' ? it.orderIndex : idx,
      }));
      const { data: insertedItems, error: iErr } = await this.supabase
        .from('user_checklist_items')
        .insert(payload)
        .select('id, text, checked, order_idx');
      if (iErr) throw iErr;
      createdItems = (insertedItems || [])
        .map((it): ChecklistItem => ({
          id: it.id,
          text: it.text,
          checked: !!it.checked,
          orderIndex: it.order_idx,
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return {
      id: header.id,
      profileId: header.profile_id,
      flightId: header.flight_id,
      purpose: header.purpose as Purpose,
      title: header.title,
      items: createdItems,
      reminderAt: header.reminder_at || undefined,
      createdAt: new Date(header.created_at),
      updatedAt: new Date(header.updated_at),
    };
  }

  async updateChecklist(
    id: string,
    updates: Partial<Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId'>>,
    items?: Array<Partial<ChecklistItem> & { id?: string }>
  ): Promise<Checklist> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const payload: any = {};
    if (updates.title) payload.title = updates.title;
    if (updates.purpose) payload.purpose = updates.purpose;
    if ('reminderAt' in updates) payload.reminder_at = updates.reminderAt ?? null;

    let headerRow: any | null = null;
    if (Object.keys(payload).length > 0) {
      const { data: updatedHeader, error } = await this.supabase
        .from('user_checklists')
        .update(payload)
        .eq('id', id)
        .eq('profile_id', user.id)
        .select('id, profile_id, flight_id, purpose, title, reminder_at, created_at, updated_at')
        .single();
      if (error) throw error;
      headerRow = updatedHeader;
    }

    let nextItems: ChecklistItem[] = [];
    if (Array.isArray(items)) {
      // Replace strategy for simplicity
      const { error: delErr } = await this.supabase
        .from('user_checklist_items')
        .delete()
        .eq('checklist_id', id);
      if (delErr) throw delErr;

      if (items.length > 0) {
        const payloadItems = items.map((it, idx) => ({
          checklist_id: id,
          text: it.text || '',
          checked: !!it.checked,
          order_idx: typeof it.orderIndex === 'number' ? it.orderIndex : idx,
        }));
        const { data: insertedItems, error: insErr } = await this.supabase
          .from('user_checklist_items')
          .insert(payloadItems)
          .select('id, text, checked, order_idx');
        if (insErr) throw insErr;
        nextItems = (insertedItems || [])
          .map((it): ChecklistItem => ({
            id: it.id,
            text: it.text,
            checked: !!it.checked,
            orderIndex: it.order_idx,
          }))
          .sort((a, b) => a.orderIndex - b.orderIndex);
      }
    } else {
      const { data: existingItems, error: itemErr } = await this.supabase
        .from('user_checklist_items')
        .select('id, text, checked, order_idx')
        .eq('checklist_id', id)
        .order('order_idx', { ascending: true });
      if (itemErr) throw itemErr;
      nextItems = (existingItems || []).map((it): ChecklistItem => ({
        id: it.id,
        text: it.text,
        checked: !!it.checked,
        orderIndex: it.order_idx,
      }));
    }

    if (!headerRow) {
      const { data: existingHeader, error: hErr } = await this.supabase
        .from('user_checklists')
        .select('id, profile_id, flight_id, purpose, title, reminder_at, created_at, updated_at')
        .eq('id', id)
        .eq('profile_id', user.id)
        .single();
      if (hErr) throw hErr;
      headerRow = existingHeader;
    }

    return {
      id: headerRow.id,
      profileId: headerRow.profile_id,
      flightId: headerRow.flight_id,
      purpose: headerRow.purpose as Purpose,
      title: headerRow.title,
      items: nextItems,
      reminderAt: headerRow.reminder_at || undefined,
      createdAt: new Date(headerRow.created_at),
      updatedAt: new Date(headerRow.updated_at),
    };
  }

  async toggleChecklistItem(checklistId: string, itemId: string, checked: boolean): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { error } = await this.supabase
      .from('user_checklist_items')
      .update({ checked })
      .eq('id', itemId);
    if (error) throw error;
  }

  async deleteChecklist(id: string): Promise<void> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');
    const { error } = await this.supabase
      .from('user_checklists')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);
    if (error) throw error;
  }

  // =============================================
  // TEMPLATES
  // =============================================

  async getNoteTemplates(purpose: Purpose): Promise<NoteTemplate[]> {
    const { data, error } = await this.supabase
      .from('note_templates')
      .select('id, profile_id, purpose, title, content, is_default')
      .eq('purpose', purpose)
      .order('is_default', { ascending: false })
      .order('title', { ascending: true });
    if (error) throw error;
    return (data || []).map((t) => ({
      id: t.id,
      profileId: t.profile_id,
      purpose: t.purpose as Purpose,
      title: t.title,
      content: t.content || '',
      isDefault: !!t.is_default,
    }));
  }

  async getChecklistTemplates(purpose: Purpose): Promise<ChecklistTemplate[]> {
    const { data: headers, error: hErr } = await this.supabase
      .from('checklist_templates')
      .select('id, profile_id, purpose, title')
      .eq('purpose', purpose)
      .order('title', { ascending: true });
    if (hErr) throw hErr;

    const ids = (headers || []).map(h => h.id);
    if (ids.length === 0) return [];

    const { data: items, error: iErr } = await this.supabase
      .from('checklist_template_items')
      .select('id, template_id, text, order_idx')
      .in('template_id', ids)
      .order('order_idx', { ascending: true });
    if (iErr) throw iErr;

    const grouped: Record<string, { text: string; orderIndex: number }[]> = {};
    for (const it of items || []) {
      (grouped[it.template_id] ||= []).push({ text: it.text, orderIndex: it.order_idx });
    }

    return (headers || []).map((h) => ({
      id: h.id,
      profileId: h.profile_id,
      purpose: h.purpose as Purpose,
      title: h.title,
      items: grouped[h.id] || [],
    }));
  }

  async saveNoteTemplate(template: Omit<NoteTemplate, 'id'>): Promise<NoteTemplate> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { data, error } = await this.supabase
      .from('note_templates')
      .insert([{ 
        profile_id: template.profileId ?? user.id,
        purpose: template.purpose,
        title: template.title,
        content: template.content,
        is_default: !!template.isDefault,
      }])
      .select('id, profile_id, purpose, title, content, is_default')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      profileId: data.profile_id,
      purpose: data.purpose as Purpose,
      title: data.title,
      content: data.content || '',
      isDefault: !!data.is_default,
    };
  }

  async saveChecklistTemplate(template: Omit<ChecklistTemplate, 'id'>): Promise<ChecklistTemplate> {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No user logged in');

    const { data: header, error } = await this.supabase
      .from('checklist_templates')
      .insert([{ 
        profile_id: template.profileId ?? user.id,
        purpose: template.purpose,
        title: template.title,
      }])
      .select('id, profile_id, purpose, title')
      .single();
    if (error) throw error;

    if (template.items && template.items.length > 0) {
      const payload = template.items.map((it, idx) => ({
        template_id: header.id,
        text: it.text,
        order_idx: typeof it.orderIndex === 'number' ? it.orderIndex : idx,
      }));
      const { error: iErr } = await this.supabase
        .from('checklist_template_items')
        .insert(payload);
      if (iErr) throw iErr;
    }

    return {
      id: header.id,
      profileId: header.profile_id,
      purpose: header.purpose as Purpose,
      title: header.title,
      items: template.items || [],
    };
  }
  // =============================================
  // AUTHENTICATION HELPERS
  // =============================================

  async signUp(email: string, password: string, userData: { name: string }) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
        },
      },
    });

    if (error) {
      throw new Error(`Signup failed: ${error.message}`);
    }

    if (!data || !data.user) {
      throw new Error('Signup failed: No user returned');
    }
    
    return data;
  }

  async updateProfile(profileData: { name: string; email: string; profileImage?: string }) {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Update the profile in the profiles table
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        full_name: profileData.name,
        avatar_url: profileData.profileImage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    // Update user metadata in auth
    const { error: authError } = await this.supabase.auth.updateUser({
      data: {
        name: profileData.name,
        avatar_url: profileData.profileImage || null,
      }
    });

    if (authError) {
      // Don't throw here as the profile was updated successfully
    }

    return { data, error: null };
  }

  async createProfile(userId: string, fullName: string) {
    // Try direct insert first
    const { data, error } = await this.supabase
      .from('profiles')
      .insert([{
        id: userId,
        full_name: fullName,
        avatar_url: null,
      }])
      .select()
      .single();

    if (error) {
      // Try using RPC function as fallback
      try {
        const { data: rpcData, error: rpcError } = await this.supabase.rpc('create_user_profile', {
          user_id: userId,
          full_name: fullName
        });
        
        if (rpcError) {
          throw new Error(`Failed to create profile: ${error.message}`);
        }
        
        return rpcData;
      } catch (rpcError) {
        throw new Error(`Failed to create profile: ${error.message}`);
      }
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    return data;
  }

  async requestPasswordReset(email: string) {
    const redirectTo = Linking.createURL('/auth/reset-password');
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }

    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  async getCurrentUser(): Promise<SupabaseUser | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  // =============================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================

  subscribeToFlights(userId: string, callback: (flights: Flight[]) => void) {
    // TODO: Implement real-time flight updates
    throw new Error('Method not implemented - ready for Supabase integration');
  }

  subscribeToUserStats(userId: string, callback: (stats: UserStats) => void) {
    // TODO: Implement real-time stats updates
    throw new Error('Method not implemented - ready for Supabase integration');
  }
}

// Export singleton instance
export const supabaseService = SupabaseService.getInstance();

// =============================================
// DATABASE SCHEMA REFERENCE
// =============================================

/*
TODO: In neuem Chat - Supabase Tables erstellen:

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  profile_image VARCHAR,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Airports table
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flights table
CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_airport_id UUID REFERENCES airports(id),
  to_airport_id UUID REFERENCES airports(id),
  date DATE NOT NULL,
  duration VARCHAR,
  distance VARCHAR,
  status VARCHAR CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  images TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX flights_user_id_idx ON flights(user_id);
CREATE INDEX flights_date_idx ON flights(date);
CREATE INDEX flights_status_idx ON flights(status);
CREATE INDEX airports_iata_idx ON airports(iata);
CREATE INDEX airports_search_idx ON airports USING gin(to_tsvector('english', name || ' ' || city || ' ' || country));

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own flights" ON flights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flights" ON flights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flights" ON flights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flights" ON flights FOR DELETE USING (auth.uid() = user_id);

-- Public access to airports
CREATE POLICY "Anyone can view airports" ON airports FOR SELECT TO public USING (true);
*/
