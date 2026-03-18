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

  // Lead capture form state
  const [formData, setFormData] = useState({ businessName: "", ownerName: "", phone: "", industry: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handlePilotSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.businessName || !formData.phone) return;
    setFormStatus("submitting");
    try {
      const res = await fetch("/api/pilot-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormStatus("success");
      } else {
        setFormStatus("error");
      }
    } catch {
      setFormStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Topbar ── */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight">
              ServiceLine<span className="text-amber-500">AI</span>
            </span>
            <span className="hidden sm:inline text-sm text-slate-500 border-l border-border pl-3">
              Virginia, USA
            </span>
          </div>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-medium">
            <Link href="/dashboard/mikes-plumbing-demo/overview">Live Demo</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero: Pitch + Calculator + Right Column ── */}
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
              <span className="text-amber-500">Never</span> misses a call.
            </h1>

            <p className="mt-4 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-md">
              Like your best CSR — but works 24/7, books into your calendar,
              and sends your tech a briefing card before every job.
            </p>

            {/* Pain point callout */}
            <div className="mt-5 rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="text-amber-500 font-semibold">62% of calls</span> to home service companies go unanswered after hours.{" "}
                <span className="text-amber-500 font-semibold">85% of those callers</span> never call back — they call your competitor.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10 px-5 shadow-lg shadow-amber-500/20">
                <Link href="/dashboard/mikes-plumbing-demo/overview">See a Live Dashboard →</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 px-5 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                <a href="#pilot-signup">Start Free Pilot</a>
              </Button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: "62%", l: "calls missed" },
              { v: "85%", l: "never call back" },
              { v: "<10s", l: "AI picks up" },
              { v: "27:1", l: "avg ROI" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-border/40 bg-card/40 p-2.5 text-center">
                <div className="text-sm sm:text-base font-bold font-mono text-amber-500">{s.v}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
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
                  <label className="text-sm text-slate-400 mb-1 block">Monthly calls</label>
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
                  <label className="text-sm text-slate-400 mb-1 block">Avg job value</label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
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
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Calls you&apos;re missing</span>
                  <span className="font-mono text-slate-300">{missed}/mo</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>AI would rescue</span>
                  <span className="font-mono text-slate-300">{rescued}/mo</span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5">
                  <span className="text-sm text-slate-500">You&apos;re losing</span>
                  <span className="text-2xl font-bold font-mono text-amber-500">
                    ${monthly.toLocaleString()}
                    <span className="text-sm text-slate-500 font-normal">/mo</span>
                  </span>
                </div>
              </div>

              <Button asChild className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10">
                <Link href="/dashboard/mikes-plumbing-demo/overview">
                  Stop Losing ${monthly.toLocaleString()}/mo →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: How It Works + Pricing ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* How it works — 3 steps */}
          <Card className="border-border/40 bg-card/40 flex-1">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">How It Works</p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center justify-center ring-1 ring-amber-500/20">1</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">We set up your AI line</p>
                    <p className="text-xs text-slate-500 mt-0.5">Branded with your business name. Takes 24 hours.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center justify-center ring-1 ring-amber-500/20">2</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">AI answers when you can&apos;t</p>
                    <p className="text-xs text-slate-500 mt-0.5">Books appointments, triages emergencies, follows up via SMS.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center justify-center ring-1 ring-amber-500/20">3</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Watch revenue come back</p>
                    <p className="text-xs text-slate-500 mt-0.5">Your dashboard shows every rescued call and dollar.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="border-border/40 bg-card/40">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Pricing</p>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-200">Starter</span>
                    <span className="text-xs text-slate-500 ml-1.5">SMS + text-back</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-white">$199<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-medium text-amber-500">Pro</span>
                    <span className="text-xs text-slate-500 ml-1.5">AI voice + everything</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-white">$499<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                14-day free pilot · No contracts · $1K guarantee
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ── BELOW FOLD: What You Get + Lead Capture ── */}
      <section className="border-t border-border/40 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* What you get — expanded with grouping */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-5">What You Get</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "AI voice answering", desc: "Picks up in your business name — after hours, overflow, or 24/7" },
                { title: "Calendar booking", desc: "Books directly into Google Calendar with job details and address" },
                { title: "Tech briefing cards", desc: "Your tech gets a text with what's wrong, where, and who before arriving" },
                { title: "Emergency triage", desc: "Burst pipe at 2 AM? AI texts you immediately — no waiting for voicemail" },
                { title: "On-call routing", desc: "Routes by schedule — weekday tech gets weekday calls, weekend guy gets weekends" },
                { title: "SMS follow-up drip", desc: "Missed leads get a text sequence. Most book within 48 hours." },
                { title: "Review harvesting", desc: "Asks for a Google review after every completed job — automatically" },
                { title: "Revenue Rescued dashboard", desc: "See every call, appointment, and dollar your AI brought in" },
              ].map((f) => (
                <div key={f.title} className="flex gap-3">
                  <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{f.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead capture form */}
          <div id="pilot-signup">
            <p className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-5">Start Your Free 14-Day Pilot</p>
            <Card className="border-amber-500/20 bg-card/60">
              <CardContent className="p-6">
                {formStatus === "success" ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-white">We&apos;ll be in touch within 24 hours.</p>
                    <p className="text-sm text-slate-400 mt-2">We&apos;ll set up your AI line branded with your business name and walk you through a live test call.</p>
                  </div>
                ) : (
                  <form onSubmit={handlePilotSignup} className="space-y-4">
                    <p className="text-sm text-slate-400 mb-4">
                      No credit card. No contracts. We set up a live AI phone line with <span className="text-slate-200">your business name</span> — you call it yourself and see how it works.
                    </p>
                    {/* Industry selector */}
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">What type of business?</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: "plumbing", icon: "🪠", label: "Plumbing" },
                          { key: "hvac", icon: "❄️", label: "HVAC" },
                          { key: "pest", icon: "🛡️", label: "Pest" },
                          { key: "painting", icon: "🎨", label: "Painting" },
                          { key: "lawn", icon: "🌿", label: "Lawn" },
                          { key: "electrical", icon: "⚡", label: "Electrical" },
                        ].map((ind) => (
                          <button
                            key={ind.key}
                            type="button"
                            onClick={() => setFormData({ ...formData, industry: ind.key })}
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                              formData.industry === ind.key
                                ? "border-amber-500/50 bg-amber-500/10 text-white"
                                : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                            }`}
                          >
                            <span>{ind.icon}</span>
                            {ind.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">Business name</label>
                      <Input
                        type="text"
                        placeholder="Mike's Plumbing & Drain"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="bg-background border-border h-10 text-sm placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">Your name</label>
                      <Input
                        type="text"
                        placeholder="Mike Johnson"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="bg-background border-border h-10 text-sm placeholder:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">Phone number</label>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-background border-border h-10 text-sm placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={formStatus === "submitting"}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-11 shadow-lg shadow-amber-500/20"
                    >
                      {formStatus === "submitting" ? "Submitting..." : "Start My Free Pilot →"}
                    </Button>
                    {formStatus === "error" && (
                      <p className="text-sm text-red-400 text-center">Something went wrong. Call us instead — we pick up.</p>
                    )}
                    <p className="text-xs text-slate-600 text-center">
                      14-day pilot · No credit card · $1K guarantee if it doesn&apos;t pay for itself
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Bottom bar ── */}
      <footer className="border-t border-border/40 shrink-0">
        <div className="mx-auto max-w-7xl px-4 h-10 flex items-center justify-between text-xs text-slate-500">
          <span>Built for HVAC &amp; plumbing contractors · Virginia, USA</span>
          <span>© 2026 ServiceLine AI</span>
        </div>
      </footer>
    </div>
  );
}
