/**
 * Debug Logger - Writes logs to console in NDJSON format
 */
export const debugLog = (data: {
  location: string;
  message: string;
  data?: any;
  hypothesisId?: string;
}) => {
  try {
    const logEntry = {
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      ...data,
    };
    
    if (__DEV__) {
      console.log(JSON.stringify(logEntry));
    }
  } catch (error) {
    // Silently fail - don't break the app
  }
};
