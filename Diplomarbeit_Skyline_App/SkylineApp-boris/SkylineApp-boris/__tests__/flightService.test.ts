// DEPRECATED: Legacy flightService tests
// The app now uses Supabase via Zustand store. This test is intentionally
// reduced to a no-op to avoid relying on legacy AsyncStorage behavior.

describe('flight service deprecated', () => {
  it('is deprecated - covered by store actions/tests', () => {
    expect(true).toBe(true);
  });
});
