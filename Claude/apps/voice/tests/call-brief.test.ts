/**
 * Call Brief Tests
 *
 * Ensures technicians get structured, glanceable briefing cards
 * for every AI-booked appointment. The tech should know what they're
 * walking into within 10 seconds of reading.
 */
import { describe, it, expect } from 'vitest';
import { buildCallBrief, formatBriefForSms, CallBrief } from '../src/lib/call-brief.js';

const SAMPLE_BRIEF_INPUT = {
  customerName: 'John Smith',
  customerPhone: '+15551234567',
  customerAddress: '4521 Oak Lane, Austin TX 78745',
  issue: 'Water heater not producing hot water. Started this morning.',
  scheduledAt: new Date('2026-03-18T14:00:00Z'),
};

// ==========================================================================
// BRIEF STRUCTURE — contains everything a tech needs
// ==========================================================================
describe('buildCallBrief — structure', () => {
  it('includes customer name, phone, and address', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.customer.name).toBe('John Smith');
    expect(brief.customer.phone).toBe('+15551234567');
    expect(brief.customer.address).toBe('4521 Oak Lane, Austin TX 78745');
  });

  it('includes the issue description', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.job.issue).toContain('Water heater');
  });

  it('formats date as human-readable (not ISO)', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    // Should be "Wednesday, March 18" or similar — NOT "2026-03-18"
    expect(brief.appointment.date).not.toContain('2026');
    expect(brief.appointment.date).toContain('March');
  });

  it('formats time as 12-hour with AM/PM', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.appointment.time).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
  });

  it('defaults urgency to normal', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.job.urgency).toBe('normal');
  });

  it('accepts same_day and emergency urgency', () => {
    const sameDayBrief = buildCallBrief({ ...SAMPLE_BRIEF_INPUT, urgency: 'same_day' });
    expect(sameDayBrief.job.urgency).toBe('same_day');

    const emergencyBrief = buildCallBrief({ ...SAMPLE_BRIEF_INPUT, urgency: 'emergency' });
    expect(emergencyBrief.job.urgency).toBe('emergency');
  });

  it('includes conversation notes when provided', () => {
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      conversationNotes: ['Unit is about 8 years old', 'Pilot light may be out'],
    });
    expect(brief.notes).toEqual(['Unit is about 8 years old', 'Pilot light may be out']);
  });

  it('includes special instructions when provided', () => {
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      specialInstructions: ['Quote before any work', 'Tenant property — owner authorized'],
    });
    expect(brief.specialInstructions).toEqual([
      'Quote before any work',
      'Tenant property — owner authorized',
    ]);
  });

  it('defaults notes and specialInstructions to empty arrays', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.notes).toEqual([]);
    expect(brief.specialInstructions).toEqual([]);
  });

  it('sets source to ai_voice', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.source).toBe('ai_voice');
  });

  it('includes a createdAt timestamp', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.createdAt).toBeDefined();
    expect(new Date(brief.createdAt).getTime()).not.toBeNaN();
  });
});

// ==========================================================================
// SMS FORMAT — concise, structured, glanceable on a phone screen
// ==========================================================================
describe('formatBriefForSms — message quality', () => {
  it('includes customer name, phone, and address', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('John Smith');
    expect(sms).toContain('+15551234567');
    expect(sms).toContain('4521 Oak Lane');
  });

  it('includes the issue description', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('Water heater');
  });

  it('includes the appointment date and time', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('March');
    // Time could be AM or PM depending on timezone — just verify it's formatted
    expect(sms).toMatch(/(AM|PM)/);
  });

  it('starts with SERVICE CALL header', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('SERVICE CALL');
  });

  it('shows urgency icon for emergency', () => {
    const brief = buildCallBrief({ ...SAMPLE_BRIEF_INPUT, urgency: 'emergency' });
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('🚨');
  });

  it('shows urgency icon for same_day', () => {
    const brief = buildCallBrief({ ...SAMPLE_BRIEF_INPUT, urgency: 'same_day' });
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('⚡');
  });

  it('no urgency icon for normal', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    const sms = formatBriefForSms(brief);
    expect(sms).not.toContain('🚨');
    expect(sms).not.toContain('⚡');
  });

  it('includes special instructions with warning icon', () => {
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      specialInstructions: ['Quote before any work'],
    });
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('⚠️ Quote before any work');
  });

  it('includes notes when they fit within SMS length', () => {
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      conversationNotes: ['Unit is 8 years old'],
    });
    const sms = formatBriefForSms(brief);
    expect(sms).toContain('Unit is 8 years old');
  });

  it('keeps total SMS under 400 characters (≈3 segments max)', () => {
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      conversationNotes: ['Short note'],
      specialInstructions: ['Call before arriving'],
    });
    const sms = formatBriefForSms(brief);
    expect(sms.length).toBeLessThan(400);
  });

  it('drops notes if they would make SMS too long', () => {
    const longNote = 'A'.repeat(300); // Very long note
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      conversationNotes: [longNote],
    });
    const sms = formatBriefForSms(brief);
    // Should NOT contain the long note — dropped to keep SMS short
    expect(sms).not.toContain(longNote);
    // But still has the essential info
    expect(sms).toContain('John Smith');
    expect(sms).toContain('Water heater');
  });
});

// ==========================================================================
// TOOL SCHEMA — book_appointment accepts brief fields
// ==========================================================================
describe('book_appointment tool schema — brief fields', () => {
  it('accepts optional notes field', async () => {
    const { voiceTools } = await import('../src/ws/tools.js');
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    const props = tool.input_schema.properties as Record<string, { type: string }>;
    expect(props.notes).toBeDefined();
    expect(props.notes.type).toBe('string');
  });

  it('accepts optional special_instructions field', async () => {
    const { voiceTools } = await import('../src/ws/tools.js');
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    const props = tool.input_schema.properties as Record<string, { type: string }>;
    expect(props.special_instructions).toBeDefined();
  });

  it('accepts optional urgency field with enum values', async () => {
    const { voiceTools } = await import('../src/ws/tools.js');
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    const props = tool.input_schema.properties as Record<string, { enum?: string[] }>;
    expect(props.urgency).toBeDefined();
    expect(props.urgency.enum).toEqual(['normal', 'same_day', 'emergency']);
  });

  it('notes, special_instructions, urgency are NOT required (optional extras)', async () => {
    const { voiceTools } = await import('../src/ws/tools.js');
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    const required = tool.input_schema.required as string[];
    expect(required).not.toContain('notes');
    expect(required).not.toContain('special_instructions');
    expect(required).not.toContain('urgency');
  });
});

// ==========================================================================
// CROSS-CHECK: Brief must NOT contain pricing or diagnosis
// ==========================================================================
describe('Brief safety — no pricing or diagnosis in brief', () => {
  it('brief does not contain any dollar amounts', () => {
    const brief = buildCallBrief({
      ...SAMPLE_BRIEF_INPUT,
      conversationNotes: ['Customer mentioned budget is tight'],
    });
    const sms = formatBriefForSms(brief);
    expect(sms).not.toMatch(/\$\d+/);
  });

  it('brief source is always ai_voice (audit trail)', () => {
    const brief = buildCallBrief(SAMPLE_BRIEF_INPUT);
    expect(brief.source).toBe('ai_voice');
  });
});
