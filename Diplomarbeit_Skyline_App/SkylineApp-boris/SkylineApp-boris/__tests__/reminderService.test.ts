jest.mock('../services/db', () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
  } as any;
  return {
    supabase: {
      from: jest.fn().mockReturnValue(chain),
    },
  };
});

import { ensureDefaultRemindersForEvents } from '../services/reminderService';

describe('reminderService', () => {
  it('ensures default reminders without throwing', async () => {
    await expect(
      ensureDefaultRemindersForEvents([
        {
          id: 'e1',
          user_id: 'u1',
          trip_id: null,
          source_type: 'note',
          source_id: 'n1',
          title: 'Note title',
          starts_at: new Date(Date.now() + 3600_000).toISOString(),
          ends_at: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
    ).resolves.not.toThrow();
  });
});


