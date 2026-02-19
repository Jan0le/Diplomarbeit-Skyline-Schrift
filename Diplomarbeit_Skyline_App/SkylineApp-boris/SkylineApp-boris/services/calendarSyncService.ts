interface CalendarAccount {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple' | 'exchange';
  isConnected: boolean;
  lastSync?: Date;
  syncEnabled: boolean;
  calendars: CalendarInfo[];
}

interface CalendarInfo {
  id: string;
  name: string;
  color: string;
  isSelected: boolean;
  isPrimary: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  attendees?: string[];
  isAllDay: boolean;
  source: 'calendar' | 'skyline';
  flightData?: FlightCalendarData;
}

interface FlightCalendarData {
  flightNumber: string;
  from: string;
  to: string;
  airline: string;
  confirmationCode: string;
  gate?: string;
  seat?: string;
  terminal?: string;
  bookingReference: string;
}

class CalendarSyncService {
  private static instance: CalendarSyncService;
  private connectedAccounts: CalendarAccount[] = [];
  private syncSettings = {
    autoSync: true,
    syncInterval: 30, // minutes
    syncOnAppOpen: true,
    syncOnBackground: false,
    includeFlightEvents: true,
    createFlightEvents: true
  };

  private constructor() {}

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  // Google Calendar Integration
  async connectGoogleCalendar(): Promise<boolean> {
    try {
      // Google Calendar API OAuth
      const authResult = await this.authenticateWithGoogleCalendar();
      
      if (authResult.success) {
        const calendars = await this.fetchGoogleCalendars(authResult.accessToken);
        
        const account: CalendarAccount = {
          id: authResult.userId,
          name: authResult.userName,
          type: 'google',
          isConnected: true,
          lastSync: new Date(),
          syncEnabled: true,
          calendars: calendars.map(cal => ({
            id: cal.id,
            name: cal.summary,
            color: cal.backgroundColor || '#4285f4',
            isSelected: cal.primary || false,
            isPrimary: cal.primary || false
          }))
        };
        
        this.connectedAccounts.push(account);
        await this.saveCalendarSettings(account);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Microsoft Outlook Calendar Integration
  async connectOutlookCalendar(): Promise<boolean> {
    try {
      // Microsoft Graph API OAuth
      const authResult = await this.authenticateWithMicrosoftGraph();
      
      if (authResult.success) {
        const calendars = await this.fetchOutlookCalendars(authResult.accessToken);
        
        const account: CalendarAccount = {
          id: authResult.userId,
          name: authResult.userName,
          type: 'outlook',
          isConnected: true,
          lastSync: new Date(),
          syncEnabled: true,
          calendars: calendars.map(cal => ({
            id: cal.id,
            name: cal.name,
            color: cal.color || '#0078d4',
            isSelected: cal.isDefaultCalendar || false,
            isPrimary: cal.isDefaultCalendar || false
          }))
        };
        
        this.connectedAccounts.push(account);
        await this.saveCalendarSettings(account);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Apple Calendar Integration (iOS only)
  async connectAppleCalendar(): Promise<boolean> {
    try {
      // EventKit integration
      const authResult = await this.requestCalendarPermission();
      
      if (authResult.granted) {
        const calendars = await this.fetchAppleCalendars();
        
        const account: CalendarAccount = {
          id: 'apple-calendar',
          name: 'Apple Calendar',
          type: 'apple',
          isConnected: true,
          lastSync: new Date(),
          syncEnabled: true,
          calendars: calendars.map(cal => ({
            id: cal.identifier,
            name: cal.title,
            color: cal.color || '#007aff',
            isSelected: cal.allowsContentModifications,
            isPrimary: false
          }))
        };
        
        this.connectedAccounts.push(account);
        await this.saveCalendarSettings(account);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Exchange/Office 365 Calendar Integration
  async connectExchangeCalendar(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<boolean> {
    try {
      // Exchange Web Services (EWS) or Microsoft Graph
      const connection = await this.establishExchangeConnection(serverUrl, username, password);
      
      if (connection.success) {
        const calendars = await this.fetchExchangeCalendars(connection);
        
        const account: CalendarAccount = {
          id: `${username}-${Date.now()}`,
          name: username,
          type: 'exchange',
          isConnected: true,
          lastSync: new Date(),
          syncEnabled: true,
          calendars: calendars.map(cal => ({
            id: cal.id,
            name: cal.name,
            color: '#0078d4',
            isSelected: true,
            isPrimary: false
          }))
        };
        
        this.connectedAccounts.push(account);
        await this.saveCalendarSettings(account);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Calendar Events synchronisieren
  async syncCalendarEvents(accountId: string): Promise<CalendarEvent[]> {
    try {
      const account = this.connectedAccounts.find(acc => acc.id === accountId);
      if (!account || !account.isConnected) {
        throw new Error('Account not connected');
      }

      const selectedCalendars = account.calendars.filter(cal => cal.isSelected);
      let events: CalendarEvent[] = [];

      for (const calendar of selectedCalendars) {
        const calendarEvents = await this.fetchEventsFromCalendar(account, calendar);
        events.push(...calendarEvents);
      }

      // Flug-Events aus Skyline-Daten erstellen
      if (this.syncSettings.createFlightEvents) {
        const flightEvents = await this.createFlightEventsFromSkylineData();
        events.push(...flightEvents);
      }

      // Duplikate entfernen
      const uniqueEvents = this.removeDuplicateEvents(events);
      
      // Account lastSync aktualisieren
      account.lastSync = new Date();
      await this.saveCalendarSettings(account);
      
      return uniqueEvents;
    } catch (error) {
      throw error;
    }
  }

  // Flug-Events in Kalender erstellen
  async createFlightEventsFromSkylineData(): Promise<CalendarEvent[]> {
    try {
      // Skyline Flugdaten abrufen (Supabase-backed store)
      const { supabase } = await import('./db');
      const { supabaseService } = await import('./supabase');
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return [];
      const flights = await supabaseService.getFlights(user.id);
      
      if (!flights) return [];

      const events: CalendarEvent[] = [];
      
      for (const flight of flights) {
        // Check-in Event (24h vorher)
        const checkinTime = new Date(flight.date);
        checkinTime.setHours(checkinTime.getHours() - 24);
        
        const checkinEvent: CalendarEvent = {
          id: `checkin-${flight.id}`,
          title: `Check-in opens: ${flight.flightNumber}`,
          startDate: checkinTime,
          endDate: new Date(checkinTime.getTime() + 60 * 60 * 1000), // 1 hour
          location: `${flight.from.name} (${flight.from.iata})`,
          description: `Online check-in opens for flight ${flight.flightNumber} from ${flight.from.city} to ${flight.to.city}`,
          isAllDay: false,
          source: 'skyline',
          flightData: {
            flightNumber: flight.flightNumber || '',
            from: flight.from.iata || '',
            to: flight.to.iata || '',
            airline: flight.airline || '',
            confirmationCode: flight.confirmationCode || '',
            bookingReference: flight.bookingReference || ''
          }
        };

        // Flight Event
        const flightStartTime = new Date(flight.date);
        const flightEndTime = new Date(flight.date);
        flightEndTime.setHours(flightEndTime.getHours() + 2); // Assume 2h flight
        
        const flightEvent: CalendarEvent = {
          id: `flight-${flight.id}`,
          title: `Flight: ${flight.flightNumber}`,
          startDate: flightStartTime,
          endDate: flightEndTime,
          location: `${flight.from.iata} → ${flight.to.iata}`,
          description: `Flight ${flight.flightNumber} from ${flight.from.city} to ${flight.to.city}${flight.gate ? ` - Gate: ${flight.gate}` : ''}${flight.seat ? ` - Seat: ${flight.seat}` : ''}`,
          isAllDay: false,
          source: 'skyline',
          flightData: {
            flightNumber: flight.flightNumber || '',
            from: flight.from.iata || '',
            to: flight.to.iata || '',
            airline: flight.airline || '',
            confirmationCode: flight.confirmationCode || '',
            gate: flight.gate,
            seat: flight.seat,
            terminal: flight.terminal,
            bookingReference: flight.bookingReference || ''
          }
        };

        events.push(checkinEvent, flightEvent);
      }

      return events;
    } catch (error) {
      return [];
    }
  }

  // Events in externen Kalender erstellen
  async createEventInCalendar(
    accountId: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<boolean> {
    try {
      const account = this.connectedAccounts.find(acc => acc.id === accountId);
      if (!account || !account.isConnected) {
        throw new Error('Account not connected');
      }

      switch (account.type) {
        case 'google':
          return await this.createGoogleCalendarEvent(account, calendarId, event);
        case 'outlook':
          return await this.createOutlookCalendarEvent(account, calendarId, event);
        case 'apple':
          return await this.createAppleCalendarEvent(account, calendarId, event);
        case 'exchange':
          return await this.createExchangeCalendarEvent(account, calendarId, event);
        default:
          throw new Error('Unsupported calendar type');
      }
    } catch (error) {
      return false;
    }
  }

  // Flug-Events aus Kalender-Events extrahieren
  async extractFlightEventsFromCalendar(accountId: string): Promise<CalendarEvent[]> {
    try {
      const allEvents = await this.syncCalendarEvents(accountId);
      
      return allEvents.filter(event => {
        const title = event.title.toLowerCase();
        const description = event.description?.toLowerCase() || '';
        
        const flightKeywords = [
          'flight', 'boarding', 'check-in', 'departure', 'arrival',
          'airline', 'airport', 'terminal', 'gate', 'seat',
          'confirmation', 'booking', 'reservation', 'ticket'
        ];
        
        return flightKeywords.some(keyword => 
          title.includes(keyword) || description.includes(keyword)
        );
      });
    } catch (error) {
      return [];
    }
  }

  // Auto-Sync Konfiguration
  async configureAutoSync(settings: Partial<typeof CalendarSyncService.prototype.syncSettings>): Promise<void> {
    this.syncSettings = { ...this.syncSettings, ...settings };
    await this.saveSyncSettings();
    
    if (settings.autoSync && this.syncSettings.syncInterval > 0) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  // Auto-Sync starten
  private startAutoSync(): void {
    this.stopAutoSync(); // Stop existing sync
    
    const intervalMs = this.syncSettings.syncInterval * 60 * 1000;
    
    setInterval(async () => {
      if (this.syncSettings.autoSync) {
        await this.performAutoSync();
      }
    }, intervalMs);
  }

  // Auto-Sync stoppen
  private stopAutoSync(): void {
    // Clear existing intervals
    // Implementation depends on how intervals are stored
  }

  // Automatische Synchronisation durchführen
  private async performAutoSync(): Promise<void> {
    try {
      for (const account of this.connectedAccounts) {
        if (account.syncEnabled && account.isConnected) {
          await this.syncCalendarEvents(account.id);
        }
      }
    } catch (error) {
      // Error handled silently
    }
  }

  // Account Management
  async getConnectedAccounts(): Promise<CalendarAccount[]> {
    const storageService = (await import('./storageService')).default.getInstance();
    const storedAccounts = await storageService.getCalendarAccounts();
    this.connectedAccounts = storedAccounts;
    return storedAccounts;
  }

  async disconnectAccount(accountId: string): Promise<boolean> {
    try {
      this.connectedAccounts = this.connectedAccounts.filter(acc => acc.id !== accountId);
      await this.removeCalendarSettings(accountId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async toggleCalendarSync(accountId: string, calendarId: string, enabled: boolean): Promise<boolean> {
    try {
      const account = this.connectedAccounts.find(acc => acc.id === accountId);
      if (account) {
        const calendar = account.calendars.find(cal => cal.id === calendarId);
        if (calendar) {
          calendar.isSelected = enabled;
          await this.saveCalendarSettings(account);
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Private Helper Methods (Implementation would use actual calendar APIs)
  private async authenticateWithGoogleCalendar(): Promise<any> {
    const authService = (await import('./authService')).default.getInstance();
    return await authService.authenticateWithGoogle();
  }

  private async authenticateWithMicrosoftGraph(): Promise<any> {
    const authService = (await import('./authService')).default.getInstance();
    return await authService.authenticateWithMicrosoft();
  }

  private async requestCalendarPermission(): Promise<{ granted: boolean }> {
    // iOS EventKit permission request
    throw new Error('Not implemented - requires EventKit setup');
  }

  private async fetchGoogleCalendars(accessToken: string): Promise<any[]> {
    // Google Calendar API call
    throw new Error('Not implemented - requires Google Calendar API');
  }

  private async fetchOutlookCalendars(accessToken: string): Promise<any[]> {
    // Microsoft Graph API call
    throw new Error('Not implemented - requires Graph API');
  }

  private async fetchAppleCalendars(): Promise<any[]> {
    // iOS EventKit call
    throw new Error('Not implemented - requires EventKit');
  }

  private async establishExchangeConnection(serverUrl: string, username: string, password: string): Promise<any> {
    // Exchange Web Services connection
    throw new Error('Not implemented - requires EWS or Graph API');
  }

  private async fetchExchangeCalendars(connection: any): Promise<any[]> {
    // Exchange calendar fetch
    throw new Error('Not implemented - requires EWS or Graph API');
  }

  private async fetchEventsFromCalendar(account: CalendarAccount, calendar: CalendarInfo): Promise<CalendarEvent[]> {
    // Fetch events from specific calendar
    throw new Error('Not implemented - requires calendar API');
  }

  private removeDuplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
    const seen = new Set<string>();
    return events.filter(event => {
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    });
  }

  private async createGoogleCalendarEvent(account: CalendarAccount, calendarId: string, event: CalendarEvent): Promise<boolean> {
    // Google Calendar API event creation
    throw new Error('Not implemented - requires Google Calendar API');
  }

  private async createOutlookCalendarEvent(account: CalendarAccount, calendarId: string, event: CalendarEvent): Promise<boolean> {
    // Microsoft Graph API event creation
    throw new Error('Not implemented - requires Graph API');
  }

  private async createAppleCalendarEvent(account: CalendarAccount, calendarId: string, event: CalendarEvent): Promise<boolean> {
    // iOS EventKit event creation
    throw new Error('Not implemented - requires EventKit');
  }

  private async createExchangeCalendarEvent(account: CalendarAccount, calendarId: string, event: CalendarEvent): Promise<boolean> {
    // Exchange event creation
    throw new Error('Not implemented - requires EWS or Graph API');
  }

  private async saveCalendarSettings(account: CalendarAccount): Promise<void> {
    const storageService = (await import('./storageService')).default.getInstance();
    const accounts = await storageService.getCalendarAccounts();
    const existingIndex = accounts.findIndex(acc => acc.id === account.id);
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    
    await storageService.saveCalendarAccounts(accounts);
  }

  private async removeCalendarSettings(accountId: string): Promise<void> {
    const storageService = (await import('./storageService')).default.getInstance();
    await storageService.removeCalendarAccount(accountId);
  }

  private async saveSyncSettings(): Promise<void> {
    const storageService = (await import('./storageService')).default.getInstance();
    await storageService.saveSyncSettings(this.syncSettings);
  }
}

export default CalendarSyncService;
