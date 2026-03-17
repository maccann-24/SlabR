import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockMessagesCreate = vi.fn().mockResolvedValue({ sid: 'SM123' });
const mockTwilioConstructor = vi.fn(() => ({
  messages: { create: mockMessagesCreate },
}));

vi.mock('twilio', () => ({ default: mockTwilioConstructor }));

const { smsToOwner, smsToCustomer, callSummaryNotification } = await import(
  '../src/services/notifications.js'
);

describe('notifications service', () => {
  let savedEnv: Record<string, string | undefined>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    savedEnv = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    };
    mockTwilioConstructor.mockClear();
    mockMessagesCreate.mockClear();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('smsToOwner — no Twilio keys', () => {
    beforeEach(() => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
    });

    it('logs to console instead of calling Twilio', async () => {
      await smsToOwner('+15551111111', '+15552222222', 'Hello owner');
      expect(consoleSpy).toHaveBeenCalledOnce();
      expect(consoleSpy.mock.calls[0][0]).toContain('Hello owner');
      expect(mockTwilioConstructor).not.toHaveBeenCalled();
    });
  });

  describe('smsToOwner — with Twilio keys', () => {
    beforeEach(() => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest';
      process.env.TWILIO_AUTH_TOKEN = 'token';
    });

    it('calls twilio.messages.create with correct params', async () => {
      await smsToOwner('+15551111111', '+15552222222', 'Test msg');
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        to: '+15551111111',
        from: '+15552222222',
        body: 'Test msg',
      });
    });

    it('propagates Twilio API errors', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Twilio down'));
      await expect(smsToOwner('+15551111111', '+15552222222', 'msg')).rejects.toThrow('Twilio down');
    });
  });

  describe('smsToCustomer — no keys', () => {
    beforeEach(() => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
    });

    it('logs to console with customer phone', async () => {
      await smsToCustomer('+15553333333', '+15554444444', 'Hi');
      expect(consoleSpy.mock.calls[0][0]).toContain('+15553333333');
    });
  });

  describe('callSummaryNotification', () => {
    beforeEach(() => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
    });

    it('includes "Missed call handled by AI" in the message', async () => {
      await callSummaryNotification('+15551111111', '+15552222222', 'Summary.', '+15559999999');
      expect(consoleSpy.mock.calls[0][0]).toContain('Missed call handled by AI');
    });

    it('includes caller phone and summary in the message', async () => {
      await callSummaryNotification('+15551111111', '+15552222222', 'Booked for Tuesday.', '+15559999999');
      const msg = consoleSpy.mock.calls[0][0];
      expect(msg).toContain('+15559999999');
      expect(msg).toContain('Booked for Tuesday.');
    });
  });
});
