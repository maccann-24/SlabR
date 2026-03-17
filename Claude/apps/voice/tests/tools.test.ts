import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../src/ws/prompts.js';
import { voiceTools } from '../src/ws/tools.js';

describe('buildSystemPrompt', () => {
  it('includes business name and services', () => {
    const prompt = buildSystemPrompt({
      name: "Mike's Plumbing",
      services: ['plumbing', 'water_heater', 'drain'],
      serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain("Mike's Plumbing");
    expect(prompt).toContain('plumbing');
    expect(prompt).toContain('Austin, TX');
  });

  it('includes guardrails about pricing and diagnosis', () => {
    const prompt = buildSystemPrompt({
      name: 'Test Co',
      services: ['hvac'],
      serviceArea: 'Denver, CO',
    });
    expect(prompt).toContain('never quote exact prices');
    expect(prompt).toContain('never diagnose');
    expect(prompt).toContain('emergency');
    expect(prompt).toContain('escalate_emergency');
  });

  it('includes custom prompt when provided', () => {
    const prompt = buildSystemPrompt({
      name: 'Test Co',
      services: ['hvac'],
      serviceArea: 'Denver, CO',
      customPrompt: 'Always mention our 24/7 availability',
    });
    expect(prompt).toContain('Always mention our 24/7 availability');
  });

  it('omits custom section when no custom prompt', () => {
    const prompt = buildSystemPrompt({
      name: 'Test Co',
      services: ['hvac'],
      serviceArea: 'Denver, CO',
      customPrompt: null,
    });
    expect(prompt).not.toContain('ADDITIONAL INSTRUCTIONS');
  });
});

describe('voiceTools', () => {
  it('defines exactly 3 tools', () => {
    expect(voiceTools).toHaveLength(3);
  });

  it('has correct tool names', () => {
    expect(voiceTools.map((t) => t.name)).toEqual([
      'check_availability',
      'book_appointment',
      'escalate_emergency',
    ]);
  });

  it('check_availability requires date', () => {
    const tool = voiceTools.find((t) => t.name === 'check_availability')!;
    expect(tool.input_schema.required).toContain('date');
  });

  it('book_appointment requires all fields', () => {
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    expect(tool.input_schema.required).toEqual([
      'name',
      'phone',
      'address',
      'issue',
      'datetime',
    ]);
  });

  it('escalate_emergency requires phone and issue', () => {
    const tool = voiceTools.find((t) => t.name === 'escalate_emergency')!;
    expect(tool.input_schema.required).toEqual(['phone', 'issue']);
  });
});
