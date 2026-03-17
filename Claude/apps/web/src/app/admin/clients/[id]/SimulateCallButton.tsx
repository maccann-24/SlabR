"use client";

import { useState } from "react";

export default function SimulateCallButton({
  clientId,
}: {
  clientId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSimulate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(
          `Created call, lead, and appointment. Revenue rescued: $${data.revenueRescued}`
        );
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSimulate}
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {loading ? "Simulating..." : "Simulate Call"}
      </button>
      {result && (
        <p className="text-xs text-gray-600 max-w-xs text-right">{result}</p>
      )}
    </div>
  );
}
