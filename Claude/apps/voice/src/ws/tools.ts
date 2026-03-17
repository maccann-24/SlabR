import Anthropic from '@anthropic-ai/sdk';
import { ClientConfig } from '../lib/client-config.js';
import { smsToOwner } from '../services/notifications.js';
import { db, appointments, leads } from '@serviceline/db';

export const voiceTools: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: 'Check available appointment slots on the business calendar for a given date',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
        time_preference: {
          type: 'string',
          enum: ['morning', 'afternoon', 'any'],
          description: 'Preferred time of day',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book a service appointment for the caller',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Caller name' },
        phone: { type: 'string', description: 'Caller phone number' },
        address: { type: 'string', description: 'Service address' },
        issue: { type: 'string', description: 'Description of the issue' },
        datetime: { type: 'string', description: 'Appointment datetime in ISO 8601 format' },
      },
      required: ['name', 'phone', 'address', 'issue', 'datetime'],
    },
  },
  {
    name: 'escalate_emergency',
    description:
      'Immediately alert the business owner about an emergency situation (burst pipe, gas leak, flooding, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Caller name if known' },
        phone: { type: 'string', description: 'Caller phone number' },
        address: { type: 'string', description: 'Address of emergency if known' },
        issue: { type: 'string', description: 'Description of the emergency' },
      },
      required: ['phone', 'issue'],
    },
  },
];

interface ToolInput {
  date?: string;
  time_preference?: string;
  name?: string;
  phone?: string;
  address?: string;
  issue?: string;
  datetime?: string;
}

export async function executeTool(
  name: string,
  input: ToolInput,
  client: ClientConfig,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'check_availability': {
      // TODO: integrate with Google Calendar API when OAuth tokens available
      // For now, return mock availability slots
      const slots = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
      return {
        available_slots: slots,
        date: input.date,
        message: `Available slots for ${input.date}: ${slots.join(', ')}`,
      };
    }

    case 'book_appointment': {
      // Create appointment in DB
      const [appointment] = await db
        .insert(appointments)
        .values({
          clientId: client.id,
          contactName: input.name!,
          contactPhone: input.phone!,
          contactAddress: input.address,
          issueDescription: input.issue,
          scheduledAt: new Date(input.datetime!),
          status: 'scheduled',
        })
        .returning();

      // Notify owner
      await smsToOwner(
        client.ownerPhone,
        client.twilioPhone,
        `📅 New appointment booked!\nCustomer: ${input.name}\nPhone: ${input.phone}\nAddress: ${input.address}\nIssue: ${input.issue}\nTime: ${new Date(input.datetime!).toLocaleString()}`,
      );

      return {
        success: true,
        appointmentId: appointment.id,
        datetime: input.datetime,
        message: 'Appointment booked successfully',
      };
    }

    case 'escalate_emergency': {
      await smsToOwner(
        client.ownerPhone,
        client.twilioPhone,
        `🚨 EMERGENCY: ${input.issue}\nCaller: ${input.phone}${input.address ? `\nAddress: ${input.address}` : ''}${input.name ? `\nName: ${input.name}` : ''}\n\nCall them back ASAP!`,
      );

      return {
        success: true,
        message: 'Owner has been notified immediately via text and will call back shortly',
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
