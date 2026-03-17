import { describe, it, expect } from 'vitest';
import { escapeXml, isValidPhone } from '../src/lib/xml-utils.js';
import { executeTool } from '../src/ws/tools.js';

describe('escapeXml', () => {
  it('escapes all XML special characters', () => {
    expect(escapeXml('a & b < c > d " e \' f')).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &apos; f',
    );
  });

  it('handles null and undefined', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('prevents TwiML injection', () => {
    const malicious = '"></Number><Redirect>evil.com</Redirect><Number attr="';
    const escaped = escapeXml(malicious);
    expect(escaped).not.toContain('<Redirect>');
    expect(escaped).not.toContain('</Number>');
  });
});

describe('isValidPhone', () => {
  it('accepts valid E.164 numbers', () => {
    expect(isValidPhone('+15551234567')).toBe(true);
    expect(isValidPhone('+442071234567')).toBe(true);
    expect(isValidPhone('+86123456789')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(isValidPhone('5551234567')).toBe(false); // no +
    expect(isValidPhone('+0551234567')).toBe(false); // starts with 0
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('hello')).toBe(false);
    expect(isValidPhone('+1')).toBe(false); // too short
  });
});

describe('executeTool — book_appointment validation', () => {
  const mockClient = {
    id: 'test-uuid',
    name: 'Test Co',
    ownerPhone: '+15551111111',
    twilioPhone: '+15552222222',
  } as any;

  it('rejects missing required fields', async () => {
    const result = await executeTool('book_appointment', { name: 'John' }, mockClient);
    expect(result.error).toContain('Missing required fields');
  });

  it('rejects invalid datetime', async () => {
    const result = await executeTool(
      'book_appointment',
      {
        name: 'John',
        phone: '+15551234567',
        address: '123 Main St',
        issue: 'Leaky pipe',
        datetime: 'next Tuesday at noon',
      },
      mockClient,
    );
    expect(result.error).toContain('Invalid datetime');
  });

  it('rejects past dates', async () => {
    const result = await executeTool(
      'book_appointment',
      {
        name: 'John',
        phone: '+15551234567',
        address: '123 Main St',
        issue: 'Leaky pipe',
        datetime: '2020-01-01T10:00:00Z',
      },
      mockClient,
    );
    expect(result.error).toContain('past');
  });

  it('returns error for unknown tool', async () => {
    const result = await executeTool('nonexistent_tool', {}, mockClient);
    expect(result.error).toContain('Unknown tool');
  });
});

describe('executeTool — escalate_emergency validation', () => {
  const mockClient = {
    id: 'test-uuid',
    name: 'Test Co',
    ownerPhone: '+15551111111',
    twilioPhone: '+15552222222',
  } as any;

  it('rejects missing required fields', async () => {
    const result = await executeTool('escalate_emergency', { name: 'John' }, mockClient);
    expect(result.error).toContain('Missing required fields');
  });
});

describe('executeTool — check_availability validation', () => {
  const mockClient = {
    id: 'test-uuid',
    name: 'Test Co',
    ownerPhone: '+15551111111',
    twilioPhone: '+15552222222',
  } as any;

  it('rejects missing date', async () => {
    const result = await executeTool('check_availability', {}, mockClient);
    expect(result.error).toContain('Missing required field: date');
  });

  it('returns slots for valid date', async () => {
    const result = await executeTool('check_availability', { date: '2026-03-20' }, mockClient);
    expect(result.available_slots).toBeDefined();
    expect(Array.isArray(result.available_slots)).toBe(true);
  });
});
