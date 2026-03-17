/**
 * Call Brief — structured briefing card for technicians.
 *
 * Generated when the AI books an appointment. Stored as JSON in the
 * appointments table. Rendered as SMS to the owner and as a card on
 * the client dashboard.
 *
 * Design principle: a tech should be able to glance at this for 10
 * seconds and know everything they need before knocking on the door.
 */

export interface CallBrief {
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  job: {
    issue: string;
    urgency: 'normal' | 'same_day' | 'emergency';
    category?: string; // plumbing, hvac, water_heater, drain, etc.
  };
  appointment: {
    date: string; // "Tuesday, March 18"
    time: string; // "2:00 PM"
    duration: string; // "1 hour"
  };
  notes: string[]; // Extra context pulled from the conversation
  specialInstructions: string[]; // "Quote before any work", "Tenant property", etc.
  source: 'ai_voice' | 'ai_sms' | 'manual';
  createdAt: string;
}

interface BuildBriefInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  issue: string;
  scheduledAt: Date;
  conversationNotes?: string[];
  specialInstructions?: string[];
  urgency?: 'normal' | 'same_day' | 'emergency';
  category?: string;
}

/**
 * Build a structured call brief from appointment data.
 */
export function buildCallBrief(input: BuildBriefInput): CallBrief {
  const scheduledDate = input.scheduledAt;

  return {
    customer: {
      name: input.customerName,
      phone: input.customerPhone,
      address: input.customerAddress,
    },
    job: {
      issue: input.issue,
      urgency: input.urgency || 'normal',
      category: input.category,
    },
    appointment: {
      date: formatDate(scheduledDate),
      time: formatTime(scheduledDate),
      duration: '1 hour',
    },
    notes: input.conversationNotes || [],
    specialInstructions: input.specialInstructions || [],
    source: 'ai_voice',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Format a call brief as a concise SMS message.
 * Target: under 320 chars (2 SMS segments max) for the core info,
 * with notes appended if they fit.
 */
export function formatBriefForSms(brief: CallBrief): string {
  const urgencyIcon = brief.job.urgency === 'emergency' ? '🚨 '
    : brief.job.urgency === 'same_day' ? '⚡ '
    : '';

  let msg = `${urgencyIcon}SERVICE CALL\n`;
  msg += `${brief.customer.name}\n`;
  msg += `${brief.customer.phone}\n`;
  msg += `${brief.customer.address}\n`;
  msg += `---\n`;
  msg += `${brief.job.issue}\n`;
  msg += `${brief.appointment.date} at ${brief.appointment.time}\n`;

  if (brief.specialInstructions.length > 0) {
    msg += `---\n`;
    msg += brief.specialInstructions.map((s) => `⚠️ ${s}`).join('\n') + '\n';
  }

  if (brief.notes.length > 0) {
    const notesText = brief.notes.join('. ');
    // Only append notes if total stays under ~400 chars (≈3 SMS segments)
    if (msg.length + notesText.length < 400) {
      msg += `---\n`;
      msg += notesText + '\n';
    }
  }

  return msg.trim();
}

/**
 * Format date for voice/display: "Tuesday, March 18"
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time for voice/display: "2:00 PM"
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
