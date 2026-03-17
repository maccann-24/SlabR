"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function PinEntryPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/dashboard/${slug}/overview`);
      } else {
        setError(data.error || "Invalid PIN");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            ServiceLine <span className="text-emerald-600">AI</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your dashboard PIN to continue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
        >
          <label
            htmlFor="pin"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Dashboard PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter PIN"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Verifying..." : "View Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
