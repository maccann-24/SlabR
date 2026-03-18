export type IndustryKey = "plumbing" | "hvac" | "pest" | "painting" | "lawn" | "electrical";

export interface IndustryTemplate {
  key: IndustryKey;
  name: string;
  tagline: string;
  icon: string;
  color: string; // tailwind color prefix e.g. "blue"

  /** Selectable services for this vertical */
  services: readonly string[];

  /** Categories the AI classifies calls into */
  issueCategories: readonly string[];

  /** What counts as an emergency — injected into AI prompt */
  emergencyDefinitions: readonly string[];

  /** How AI handles pricing questions */
  pricingDisclaimer: string;

  /** Industry-specific AI behavior rules */
  promptRules: readonly string[];

  /** Seasonal context hints keyed by month range */
  seasonalHints: readonly { months: number[]; hint: string }[];

  /** Common questions + safe answers the AI can reference */
  faq: readonly { q: string; a: string }[];

  /** Default avg ticket value for this industry */
  defaultTicketValue: number;
}

// ─── Templates ───

const plumbing: IndustryTemplate = {
  key: "plumbing",
  name: "Plumbing",
  tagline: "Never miss a service call again",
  icon: "🪠",
  color: "blue",
  services: [
    "Leak Repair",
    "Drain Cleaning",
    "Water Heater",
    "Sewer Line",
    "Gas Line",
    "Fixture Install",
    "Repiping",
    "Water Filtration",
  ],
  issueCategories: [
    "leak_repair",
    "drain_clog",
    "water_heater",
    "sewer_line",
    "gas_line",
    "fixture_install",
    "repipe",
    "water_filtration",
    "emergency",
    "other",
  ],
  emergencyDefinitions: [
    "Burst or spraying pipe",
    "Active flooding or standing water",
    "Gas smell or suspected gas leak",
    "Sewage backup into the home",
    "No running water to entire house",
    "No hot water when outside temp is below 40°F",
  ],
  pricingDisclaimer:
    "Our technician will assess the situation on-site and give you an upfront quote before starting any work.",
  promptRules: [
    "Collect: caller name, address, what's happening (leak location, fixture affected, etc.)",
    "A 'drip' or 'slow leak' is NOT an emergency unless it's flooding or spraying",
    "Never diagnose the cause — say 'could be a few things, our tech will take a look'",
    "For water heater issues, ask: gas or electric? How old? Any error codes or blinking lights?",
    "For drain issues, ask: which drain? Multiple drains or just one? Any gurgling sounds?",
  ],
  seasonalHints: [
    { months: [11, 12, 1, 2], hint: "Winter — ask if they've had pipes freeze before, mention winterization" },
    { months: [3, 4], hint: "Spring — mention sewer line inspections, sump pump checks" },
    { months: [6, 7, 8], hint: "Summer — water heater demand peaks, mention tankless upgrades" },
  ],
  faq: [
    { q: "How much does it cost?", a: "Our tech gives an upfront quote on-site before any work starts — no surprises." },
    { q: "How do I shut off my water?", a: "Look for the main shutoff valve — usually near the water meter or where the main line enters your home. Turn it clockwise." },
    { q: "Can you come today?", a: "Let me check our availability for you right now." },
    { q: "Do you do free estimates?", a: "We do provide free estimates for most jobs — the tech will let you know on-site." },
    { q: "Is this covered by warranty?", a: "Our team can check warranty coverage when they arrive — bring any paperwork you have." },
  ],
  defaultTicketValue: 350,
};

const hvac: IndustryTemplate = {
  key: "hvac",
  name: "HVAC",
  tagline: "Keep every home comfortable",
  icon: "❄️",
  color: "cyan",
  services: [
    "AC Repair",
    "Heating Repair",
    "Maintenance & Tune-Up",
    "Duct Work",
    "Thermostat",
    "Indoor Air Quality",
    "New System Install",
    "Mini-Split",
  ],
  issueCategories: [
    "ac_repair",
    "heating_repair",
    "maintenance",
    "thermostat",
    "duct_work",
    "air_quality",
    "new_install",
    "mini_split",
    "emergency",
    "other",
  ],
  emergencyDefinitions: [
    "No heat when outside temperature is below 40°F",
    "No AC when outside temperature is above 95°F",
    "Gas smell near furnace",
    "Carbon monoxide alarm going off",
    "Furnace making loud banging or popping sounds",
    "Smoke or burning smell from HVAC unit",
  ],
  pricingDisclaimer:
    "Our technician will diagnose the issue on-site and provide a quote before any repairs.",
  promptRules: [
    "Collect: caller name, address, what's happening (AC/heat, which unit, symptoms)",
    "Ask: is the system blowing air at all? Is it blowing but not cold/hot? Any unusual sounds?",
    "For thermostats: ask if it's blank, if they've tried replacing batteries, what brand",
    "Never recommend DIY fixes — 'our tech will get it sorted safely'",
    "For new installs or replacements: ask square footage of home if they know it, and what system they currently have",
  ],
  seasonalHints: [
    { months: [3, 4, 5], hint: "Spring — mention AC tune-ups before summer, early bird pricing" },
    { months: [6, 7, 8], hint: "Summer — AC repair demand peaks, ask about comfort level in specific rooms" },
    { months: [9, 10], hint: "Fall — heating tune-ups, furnace inspections before winter" },
    { months: [11, 12, 1, 2], hint: "Winter — heating emergencies common, mention heat pump efficiency" },
  ],
  faq: [
    { q: "How much does a new AC cost?", a: "It depends on your home's size and setup — our tech can give you options and pricing on-site." },
    { q: "How often should I change my filter?", a: "Most filters should be changed every 1-3 months, but our tech can recommend the right schedule for your system." },
    { q: "My AC is running but not cooling", a: "That could be a few things — low refrigerant, a compressor issue, or airflow problem. Our tech will diagnose it." },
    { q: "Do you offer financing?", a: "Yes, we have financing options available — the tech can walk you through them." },
  ],
  defaultTicketValue: 400,
};

const pest: IndustryTemplate = {
  key: "pest",
  name: "Pest Control",
  tagline: "Protect every home you serve",
  icon: "🛡️",
  color: "green",
  services: [
    "General Pest Control",
    "Termite Inspection",
    "Termite Treatment",
    "Rodent Control",
    "Mosquito Treatment",
    "Bed Bug Treatment",
    "Wildlife Removal",
    "Ant Control",
  ],
  issueCategories: [
    "general_pest",
    "termite",
    "rodent",
    "mosquito",
    "bed_bug",
    "wildlife",
    "ant",
    "roach",
    "wasp_bee",
    "other",
  ],
  emergencyDefinitions: [
    "Wasp or bee nest blocking a door or entry point",
    "Snake found inside the home",
    "Large wildlife animal trapped inside (raccoon, opossum)",
    "Severe allergic reaction risk — caller reports someone with known bee allergy",
    "Active termite swarm inside the home",
  ],
  pricingDisclaimer:
    "We'll do a free inspection first, then give you a treatment plan with clear pricing before we start.",
  promptRules: [
    "Collect: caller name, address, what they're seeing (type of pest, where, how many, how long)",
    "Never identify pest species over the phone — 'our inspector will ID them on-site'",
    "Ask: indoor or outdoor? Which rooms? Have you seen droppings? Any pets or small children?",
    "For termites: ask if they've had a previous inspection, when the home was built, if they see mud tubes or wing piles",
    "For rodents: ask if they're hearing sounds (scratching in walls), where, and time of day",
    "Always mention: treatment is safe for pets and children once dry",
  ],
  seasonalHints: [
    { months: [3, 4, 5], hint: "Spring — ant and termite season, mention preventive treatments" },
    { months: [6, 7, 8], hint: "Summer — mosquito and wasp peak, mention yard treatments" },
    { months: [9, 10], hint: "Fall — rodents start moving indoors, mention exclusion services" },
    { months: [11, 12, 1, 2], hint: "Winter — rodent and roach calls peak, mention quarterly plans" },
  ],
  faq: [
    { q: "Is the treatment safe for my pets?", a: "Yes — once the treatment dries, it's safe for pets and kids. Our tech will give you specific re-entry times." },
    { q: "How long does treatment take?", a: "Most treatments take 30-60 minutes depending on your home's size. Our tech will give you a timeframe." },
    { q: "Do you offer a warranty?", a: "Yes, most of our treatments include a warranty — our tech will go over the specifics." },
    { q: "Do I need to leave the house?", a: "For most treatments you can stay, but our tech will let you know if any areas need to be vacated briefly." },
  ],
  defaultTicketValue: 200,
};

const painting: IndustryTemplate = {
  key: "painting",
  name: "Painting",
  tagline: "Book more jobs, miss fewer calls",
  icon: "🎨",
  color: "purple",
  services: [
    "Interior Painting",
    "Exterior Painting",
    "Cabinet Refinishing",
    "Drywall Repair",
    "Pressure Washing",
    "Deck & Fence Staining",
    "Wallpaper Removal",
    "Color Consultation",
  ],
  issueCategories: [
    "interior",
    "exterior",
    "cabinets",
    "drywall_repair",
    "pressure_wash",
    "staining",
    "wallpaper",
    "consultation",
    "other",
  ],
  emergencyDefinitions: [
    // Painting has no true emergencies — all jobs are scheduled
  ],
  pricingDisclaimer:
    "We'll come out for a free estimate — pricing depends on the scope, surfaces, and prep work needed.",
  promptRules: [
    "Collect: caller name, address, what they want painted (rooms, exterior, cabinets, etc.)",
    "Ask: approximately how many rooms or what square footage? Interior or exterior? Any prep work needed (peeling, patching)?",
    "For exterior: ask about the siding material (wood, stucco, brick, vinyl)",
    "For cabinets: ask how many, and if they want paint or stain",
    "Never quote prices — always say 'we do free on-site estimates because every job is different'",
    "Ask if they have a color in mind or need help choosing",
    "Ask about their timeline — when do they want it done?",
  ],
  seasonalHints: [
    { months: [3, 4, 5], hint: "Spring — exterior painting season starting, mention booking early" },
    { months: [6, 7, 8], hint: "Summer — peak exterior season, mention deck staining" },
    { months: [9, 10, 11], hint: "Fall — last chance for exterior before winter, interior projects ramp up" },
    { months: [12, 1, 2], hint: "Winter — interior painting season, cabinet refinishing" },
  ],
  faq: [
    { q: "How long does it take to paint a room?", a: "Most single rooms take a day, but it depends on prep work. Our estimator will give you a timeline." },
    { q: "Do you provide the paint?", a: "Yes, paint is included in our quotes — or you can supply your own if you prefer." },
    { q: "Do I need to move my furniture?", a: "We handle moving and covering furniture as part of the job." },
    { q: "How many coats?", a: "We typically do two coats for full coverage, plus primer if needed. Our estimator will assess your surfaces." },
  ],
  defaultTicketValue: 500,
};

const lawn: IndustryTemplate = {
  key: "lawn",
  name: "Lawn & Landscape",
  tagline: "Grow your business while you grow their yards",
  icon: "🌿",
  color: "emerald",
  services: [
    "Mowing & Maintenance",
    "Fertilization",
    "Weed Control",
    "Aeration & Overseeding",
    "Landscaping",
    "Irrigation",
    "Tree Trimming",
    "Leaf Removal",
  ],
  issueCategories: [
    "mowing",
    "fertilization",
    "weed_control",
    "aeration",
    "landscaping",
    "irrigation",
    "tree_service",
    "leaf_removal",
    "other",
  ],
  emergencyDefinitions: [
    "Fallen tree on a structure or blocking a driveway",
    "Broken irrigation main flooding the yard",
    "Large hanging branch about to fall on house or power line",
  ],
  pricingDisclaimer:
    "Pricing depends on lot size and services — we'll give you a quote after a quick look at the property.",
  promptRules: [
    "Collect: caller name, address, what service they need",
    "Ask: approximate lot size or yard size if they know it",
    "For mowing: ask how often (weekly, biweekly), front and back or just front?",
    "For landscaping: ask what they're envisioning (flower beds, hardscape, sod, plants)",
    "For irrigation: ask if they have an existing system, what's happening (dry spots, leaks, won't turn on)",
    "For tree work: ask about tree size, how many, and whether it's trimming or removal",
    "Always ask: is this a one-time job or are you looking for ongoing service?",
  ],
  seasonalHints: [
    { months: [3, 4], hint: "Spring — lawn waking up, mention pre-emergent weed control and first mowing" },
    { months: [5, 6], hint: "Late spring — aeration and overseeding window, irrigation startups" },
    { months: [7, 8], hint: "Summer — mowing peak, mention drought stress and watering schedules" },
    { months: [9, 10], hint: "Fall — aeration, overseeding, leaf removal season" },
    { months: [11, 12, 1, 2], hint: "Winter — dormant season, mention spring prep packages and tree trimming" },
  ],
  faq: [
    { q: "How much for mowing?", a: "It depends on your lot size — we can give you a quick quote after seeing the property." },
    { q: "How often should I mow?", a: "Weekly is ideal during the growing season. Our team can set up a recurring schedule." },
    { q: "Do you do one-time cleanups?", a: "Absolutely — we do both one-time jobs and recurring service plans." },
    { q: "Can you fix my sprinkler system?", a: "Yes, we service and repair irrigation systems. We'll take a look and let you know what it needs." },
  ],
  defaultTicketValue: 150,
};

const electrical: IndustryTemplate = {
  key: "electrical",
  name: "Electrical",
  tagline: "Every call answered, every job booked",
  icon: "⚡",
  color: "yellow",
  services: [
    "Panel Upgrade",
    "Outlet & Switch",
    "Lighting Install",
    "Wiring & Rewiring",
    "Generator Install",
    "EV Charger Install",
    "Troubleshooting",
    "Ceiling Fan Install",
  ],
  issueCategories: [
    "panel_breaker",
    "outlets_switches",
    "lighting",
    "wiring",
    "generator",
    "ev_charger",
    "troubleshooting",
    "ceiling_fan",
    "emergency",
    "other",
  ],
  emergencyDefinitions: [
    "Sparking outlet or switch",
    "Burning smell from panel or outlet",
    "Partial power outage in the home",
    "Exposed or damaged wiring",
    "Panel buzzing, humming, or warm to the touch",
    "Lights flickering throughout the house (not just one fixture)",
    "Power out after a storm with visible wire damage",
  ],
  pricingDisclaimer:
    "Our electrician will assess the job on-site and give you upfront pricing before starting any work.",
  promptRules: [
    "Collect: caller name, address, what's going on (which fixture, which room, symptoms)",
    "For electrical issues ALWAYS ask: do you smell burning? Do you see sparks? Is the panel warm?",
    "If any safety concern: escalate immediately — do not wait",
    "For outlets: ask if it's one outlet or multiple, GFCI or regular, when it stopped working",
    "For panel upgrades: ask about home age, current panel size if known, what's prompting the upgrade",
    "For EV chargers: ask which vehicle, where they want it mounted, how far from the panel",
    "Never suggest DIY electrical work — safety risk",
  ],
  seasonalHints: [
    { months: [4, 5, 6], hint: "Spring/Summer — generator installs before storm season, outdoor lighting" },
    { months: [7, 8], hint: "Summer — AC circuit overloads, panel upgrade demand" },
    { months: [10, 11], hint: "Fall — holiday lighting installs, generator service before winter" },
    { months: [12, 1, 2], hint: "Winter — heater circuit issues, storm-related outages" },
  ],
  faq: [
    { q: "Is it safe to keep using this outlet?", a: "If you see sparking or smell burning, stop using it and flip the breaker. Our electrician will take a look." },
    { q: "How much does a panel upgrade cost?", a: "It depends on your current setup and needs — our electrician will give you a quote on-site." },
    { q: "Can you install an EV charger?", a: "Absolutely — we'll assess your panel capacity and install the right charger for your vehicle." },
    { q: "My power keeps tripping", a: "That's usually an overloaded circuit or a faulty breaker. Our tech will diagnose it safely." },
  ],
  defaultTicketValue: 375,
};

// ─── Registry ───

export const INDUSTRY_TEMPLATES: Record<IndustryKey, IndustryTemplate> = {
  plumbing,
  hvac,
  pest,
  painting,
  lawn,
  electrical,
} as const;

export const INDUSTRY_KEYS = Object.keys(INDUSTRY_TEMPLATES) as IndustryKey[];

export function getTemplate(key: string): IndustryTemplate | null {
  return INDUSTRY_TEMPLATES[key as IndustryKey] ?? null;
}

export function getTemplateOrThrow(key: string): IndustryTemplate {
  const t = getTemplate(key);
  if (!t) throw new Error(`Unknown industry: ${key}`);
  return t;
}
