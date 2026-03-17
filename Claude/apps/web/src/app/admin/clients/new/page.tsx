import { db, schema } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const ALL_SERVICES = [
  "plumbing",
  "drain",
  "water_heater",
  "sewer",
  "gas_line",
  "hvac",
  "fixture_install",
] as const;

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTwilioPhone(): string {
  let digits = "";
  for (let i = 0; i < 7; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return `+1555${digits}`;
}

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; pin?: string; slug?: string; clientId?: string }>;
}) {
  const params = await searchParams;

  if (params.success === "1") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Created</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Client created successfully!</h2>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
            <p className="text-sm font-medium text-amber-800">
              Save this PIN (shown only once):
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-900 font-mono tracking-wider">
              {params.pin}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Dashboard URL</p>
              <p className="mt-1 text-sm text-gray-900 font-mono">/dashboard/{params.slug}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/admin/clients/${params.clientId}`}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              View Client
            </Link>
            <Link
              href="/admin/clients"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              All Clients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function createClient(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const ownerName = formData.get("ownerName") as string;
    const ownerPhone = formData.get("ownerPhone") as string;
    const serviceArea = formData.get("serviceArea") as string;
    const plan = formData.get("plan") as string;

    const services = ALL_SERVICES.filter(
      (s) => formData.get(`service_${s}`) === "on"
    );

    if (!name || !ownerName || !ownerPhone) {
      throw new Error("Missing required fields");
    }

    const slug = generateSlug(name);
    const pin = generatePin();
    const twilioPhone = generateTwilioPhone();

    const defaultBusinessHours = {
      monday: { open: "08:00", close: "17:00" },
      tuesday: { open: "08:00", close: "17:00" },
      wednesday: { open: "08:00", close: "17:00" },
      thursday: { open: "08:00", close: "17:00" },
      friday: { open: "08:00", close: "17:00" },
      saturday: { open: "09:00", close: "14:00" },
      sunday: null,
    };

    const [client] = await db
      .insert(schema.clients)
      .values({
        name,
        slug,
        ownerName,
        ownerPhone,
        forwardPhone: ownerPhone,
        twilioPhone,
        businessHours: defaultBusinessHours,
        services: services.length > 0 ? services : ["plumbing"],
        serviceArea: serviceArea || "Austin, TX and surrounding areas",
        plan: plan || "starter",
        dashboardPin: pin,
        status: "active",
      })
      .returning();

    redirect(
      `/admin/clients/new?success=1&pin=${pin}&slug=${slug}&clientId=${client.id}`
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new ServiceLine AI customer
          </p>
        </div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      <form action={createClient} className="mt-8 max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          {/* Business Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Mike's Plumbing & Heating"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Owner Name */}
          <div>
            <label
              htmlFor="ownerName"
              className="block text-sm font-medium text-gray-700"
            >
              Owner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ownerName"
              name="ownerName"
              required
              placeholder="Mike Johnson"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Owner Phone */}
          <div>
            <label
              htmlFor="ownerPhone"
              className="block text-sm font-medium text-gray-700"
            >
              Owner Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ownerPhone"
              name="ownerPhone"
              required
              placeholder="+15551234567"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Service Area */}
          <div>
            <label
              htmlFor="serviceArea"
              className="block text-sm font-medium text-gray-700"
            >
              Service Area
            </label>
            <input
              type="text"
              id="serviceArea"
              name="serviceArea"
              defaultValue="Austin, TX and surrounding areas"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Services */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">
              Services
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_SERVICES.map((service) => (
                <label
                  key={service}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name={`service_${service}`}
                    defaultChecked={service === "plumbing"}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {service.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Plan */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">
              Plan
            </legend>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 flex-1">
                <input
                  type="radio"
                  name="plan"
                  value="starter"
                  defaultChecked
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Starter</p>
                  <p className="text-xs text-gray-500">$199/mo</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 flex-1">
                <input
                  type="radio"
                  name="plan"
                  value="pro"
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pro</p>
                  <p className="text-xs text-gray-500">$499/mo</p>
                </div>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Submit */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Create Client
          </button>
          <Link
            href="/admin/clients"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
