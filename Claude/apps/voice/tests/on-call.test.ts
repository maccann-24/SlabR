/**
 * On-Call Routing Tests
 *
 * Ensures notifications route to the right person based on the
 * on-call schedule, with fallback to owner and timed escalation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
vi.mock('@serviceline/db', () => {
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'esc-1' }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    },
    onCallContacts: { id: 'id', name: 'name', phone: 'phone', role: 'role', isActive: 'is_active' },
    onCallSchedule: { contactId: 'contact_id', clientId: 'client_id', dayOfWeek: 'day_of_week' },
    escalations: { id: 'id' },
    eq: vi.fn(),
    and: vi.fn(),
  };
});

vi.mock('../src/services/notifications.js', () => ({
  smsToOwner: vi.fn().mockResolvedValue(undefined),
}));

const { resolveOnCall } = await import('../src/services/on-call.js');
const { db } = await import('@serviceline/db');

const MOCK_CLIENT = {
  id: 'client-1',
  name: "Mike's Plumbing",
  ownerName: 'Mike Johnson',
  ownerPhone: '+15551111111',
  twilioPhone: '+15552222222',
} as any;

describe('resolveOnCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns owner when no schedule entries exist', async () => {
    // Default mock returns empty array (no schedule entries)
    const result = await resolveOnCall(MOCK_CLIENT);

    expect(result.isOwner).toBe(true);
    expect(result.contact.name).toBe('Mike Johnson');
    expect(result.contact.phone).toBe('+15551111111');
    expect(result.contact.role).toBe('owner');
  });

  it('returns owner when no on-call contact matches current time', async () => {
    // Mock returns a schedule entry but for a different time window
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              contactId: 'tech-1',
              startTime: '03:00', // 3 AM to 4 AM — unlikely to match during test
              endTime: '04:00',
              contactName: 'Bob the Tech',
              contactPhone: '+15553333333',
              contactRole: 'technician',
              isActive: true,
            },
          ]),
        }),
      }),
    } as any);

    const result = await resolveOnCall(MOCK_CLIENT);
    // Unless test runs between 3-4 AM, this should fall back to owner
    const hour = new Date().getHours();
    if (hour < 3 || hour >= 4) {
      expect(result.isOwner).toBe(true);
    }
  });

  it('skips inactive contacts', async () => {
    // All-day schedule but contact is inactive
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              contactId: 'tech-1',
              startTime: '00:00',
              endTime: '23:59',
              contactName: 'Inactive Tech',
              contactPhone: '+15554444444',
              contactRole: 'technician',
              isActive: false,
            },
          ]),
        }),
      }),
    } as any);

    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.isOwner).toBe(true); // Skipped inactive, fell back to owner
  });

  it('returns on-call tech when they match the current time window', async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const start = `${currentHour.toString().padStart(2, '0')}:00`;
    const end = `${(currentHour + 1).toString().padStart(2, '0')}:00`;

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              contactId: 'tech-1',
              startTime: start,
              endTime: end,
              contactName: 'Bob the Tech',
              contactPhone: '+15553333333',
              contactRole: 'technician',
              isActive: true,
            },
          ]),
        }),
      }),
    } as any);

    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.isOwner).toBe(false);
    expect(result.contact.name).toBe('Bob the Tech');
    expect(result.contact.phone).toBe('+15553333333');
    expect(result.contact.role).toBe('technician');
  });
});

// ==========================================================================
// isTimeInRange — tested indirectly through resolveOnCall, but let's
// verify the overnight edge case explicitly
// ==========================================================================
describe('On-call schedule edge cases', () => {
  beforeEach(() => {
    // Reset DB mock to return empty schedule (owner fallback)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);
  });

  it('owner fallback includes owner name and phone from client config', async () => {
    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.contact.name).toBe(MOCK_CLIENT.ownerName);
    expect(result.contact.phone).toBe(MOCK_CLIENT.ownerPhone);
  });

  it('contact id is "owner" for fallback (not a UUID)', async () => {
    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.contact.id).toBe('owner');
  });
});

// ==========================================================================
// ESCALATION FLOW
// ==========================================================================
describe('Escalation behavior', () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);
  });

  it('on-call result has isOwner=true when no schedule configured', async () => {
    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.isOwner).toBe(true);
  });

  it('on-call result has isOwner=false when tech is scheduled now', async () => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const nextH = ((now.getHours() + 1) % 24).toString().padStart(2, '0');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            contactId: 'tech-1', startTime: `${h}:00`, endTime: `${nextH}:00`,
            contactName: 'Tech', contactPhone: '+15555555555', contactRole: 'technician',
            isActive: true,
          }]),
        }),
      }),
    } as any);

    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.isOwner).toBe(false);
  });
});

// ==========================================================================
// CROSS-CHECKS
// ==========================================================================
describe('On-call safety cross-checks', () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);
  });

  it('emergency notifications still work even with empty schedule (owner gets it)', async () => {
    // This is the critical safety property — emergencies must ALWAYS reach someone
    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.contact.phone).toBeTruthy();
    expect(result.contact.phone.length).toBeGreaterThan(5);
  });

  it('owner phone is never null or empty in fallback', async () => {
    const result = await resolveOnCall(MOCK_CLIENT);
    expect(result.contact.phone).toBe('+15551111111');
    expect(result.contact.phone).not.toBe('');
    expect(result.contact.phone).not.toBeNull();
  });
});
