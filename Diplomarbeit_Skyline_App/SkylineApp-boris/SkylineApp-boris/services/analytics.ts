import { Platform } from 'react-native';

type AnalyticsEventProps = Record<string, any>;

// Simple analytics shim. Replace with Amplitude/Segment later.
class AnalyticsService {
  private static instance: AnalyticsService;
  private enabled = true;
  private provider: 'none' | 'amplitude' = 'none';

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  init(options?: { enabled?: boolean; provider?: 'none' | 'amplitude' }) {
    if (typeof options?.enabled === 'boolean') this.enabled = options.enabled;
    if (options?.provider) this.provider = options.provider;
  }

  track(eventName: string, props?: AnalyticsEventProps) {
    if (!this.enabled) return;
    // For now, just log. Later: send to real provider.
    // eslint-disable-next-line no-console
    // Analytics event logged
    {
      platform: Platform.OS,
      ...props,
    });
  }
}

const Analytics = AnalyticsService.getInstance();
export default Analytics;

