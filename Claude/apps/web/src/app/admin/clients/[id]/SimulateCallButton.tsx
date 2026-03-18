"use client";

import { useState } from "react";

export default function SimulateCallButton({
  clientId,
}: {
  clientId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSimulate() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/simulate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const simulationResult = await res.json();
      if (res.ok) {
        setStatusMessage(
          `Created call, lead, and appointment. Revenue rescued: $${simulationResult.revenueRescued}`
        );
      } else {
        setStatusMessage(`Error: ${simulationResult.error}`);
      }
    } catch {
      setStatusMessage("Network error");
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
      {statusMessage && (
        <p className="text-xs text-gray-600 max-w-xs text-right">{statusMessage}</p>
      )}
    </div>
  );
}
