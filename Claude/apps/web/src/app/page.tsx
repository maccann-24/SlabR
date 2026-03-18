"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [calls, setCalls] = useState(40);
  const [jobValue, setJobValue] = useState(350);
  const missed = Math.round(calls * 0.62);
  const rescued = Math.round(missed * 0.85);
  const monthly = rescued * jobValue;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Topbar ── */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight">
              ServiceLine<span className="text-amber-500">AI</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-3">
              Virginia, USA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/admin">Admin</Link>
            </Button>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-medium">
              <Link href="/dashboard/mikes-plumbing-demo">Live Demo</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Grid: Everything in one viewport ── */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

        {/* ── LEFT COLUMN: Pitch + Stats ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Hero pitch */}
          <div className="flex-1 flex flex-col justify-center">
            <Badge variant="outline" className="w-fit border-amber-500/30 text-amber-500 bg-amber-500/5 gap-1.5 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Built in Virginia · US-based team
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15]">
              Your AI receptionist.<br />
              <span className="text-amber-500">Never misses a call.</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
              Like your best CSR — but works 24/7, books into your calendar,
              and sends your tech a briefing card before every job. US-based support. Your data stays here.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10 px-5 shadow-lg shadow-amber-500/20">
                <Link href="/dashboard/mikes-plumbing-demo">See It In Action →</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 px-5">
                <Link href="/admin">Admin Panel</Link>
              </Button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: "62%", l: "calls missed" },
              { v: "85%", l: "never call back" },
              { v: "<10s", l: "AI response" },
              { v: "27:1", l: "avg ROI" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-border/40 bg-card/40 p-2.5 text-center">
                <div className="text-sm sm:text-base font-bold font-mono text-amber-500">{s.v}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CENTER COLUMN: Calculator ── */}
        <div className="lg:col-span-4">
          <Card className="h-full border-amber-500/20 bg-card/60">
            <CardContent className="p-5 flex flex-col h-full">
              <p className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-4">Revenue Calculator</p>

              <div className="space-y-3 flex-1">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Monthly calls</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={calls}
                      onChange={(e) => setCalls(Number(e.target.value) || 0)}
                      className="w-20 text-center font-mono bg-background border-border h-8 text-sm"
                    />
                    <input type="range" min={10} max={200} value={calls}
                      onChange={(e) => setCalls(Number(e.target.value))}
                      className="flex-1 accent-amber-500 h-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Avg job value</label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">$</span>
                      <Input
                        type="number"
                        value={jobValue}
                        onChange={(e) => setJobValue(Number(e.target.value) || 0)}
                        className="w-20 pl-5 text-center font-mono bg-background border-border h-8 text-sm"
                      />
                    </div>
                    <input type="range" min={100} max={2000} step={50} value={jobValue}
                      onChange={(e) => setJobValue(Number(e.target.value))}
                      className="flex-1 accent-amber-500 h-1" />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Calls you're missing</span>
                  <span className="font-mono text-foreground">{missed}/mo</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>AI would rescue</span>
                  <span className="font-mono text-foreground">{rescued}/mo</span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5">
                  <span className="text-xs text-muted-foreground">You're losing</span>
                  <span className="text-2xl font-bold font-mono text-amber-500">
                    ${monthly.toLocaleString()}
                    <span className="text-xs text-muted-foreground font-normal">/mo</span>
                  </span>
                </div>
              </div>

              <Button asChild className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10">
                <Link href="/dashboard/mikes-plumbing-demo">
                  Stop Losing ${monthly.toLocaleString()}/mo →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: What you get + Pricing ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* What's included */}
          <Card className="border-border/40 bg-card/40 flex-1">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">What You Get</p>
              <ul className="space-y-2">
                {[
                  "AI answers calls in your business name",
                  "Books appointments into your calendar",
                  "Sends tech a briefing card before every job",
                  "Emergency triage — texts you instantly",
                  "On-call routing by schedule",
                  "Revenue Rescued dashboard",
                  "Review harvesting after every job",
                  "SMS follow-up drip for missed leads",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <svg className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pricing compact */}
          <Card className="border-border/40 bg-card/40">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pricing</p>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-medium">Starter</span>
                    <span className="text-xs text-muted-foreground ml-1.5">SMS + text-back</span>
                  </div>
                  <span className="font-mono font-bold text-sm">$199<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-medium text-amber-500">Pro</span>
                    <span className="text-xs text-muted-foreground ml-1.5">AI voice + everything</span>
                  </div>
                  <span className="font-mono font-bold text-sm">$499<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                14-day free pilot · No contracts · $1K guarantee
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ── Bottom bar ── */}
      <footer className="border-t border-border/40 shrink-0">
        <div className="mx-auto max-w-7xl px-4 h-10 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Built for American contractors · Virginia, USA</span>
          <span>© 2026 ServiceLine AI</span>
        </div>
      </footer>
    </div>
  );
}
