"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────────────────
// ROI Calculator Component
// ─────────────────────────────────────────────────────────
function ROICalculator() {
  const [calls, setCalls] = useState(40);
  const [jobValue, setJobValue] = useState(350);
  const missRate = 0.62;
  const rescueRate = 0.85;
  const missedCalls = Math.round(calls * missRate);
  const rescuedCalls = Math.round(missedCalls * rescueRate);
  const monthlyRevenue = rescuedCalls * jobValue;
  const yearlyRevenue = monthlyRevenue * 12;

  return (
    <Card className="border-amber-500/20 bg-card/50 backdrop-blur">
      <CardContent className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white mb-6">
          See what you're leaving on the table
        </h3>

        <div className="space-y-5">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              How many calls do you get per month?
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={calls}
                onChange={(e) => setCalls(Number(e.target.value) || 0)}
                className="w-24 text-center font-mono text-lg bg-background border-border"
              />
              <input
                type="range"
                min={10}
                max={200}
                value={calls}
                onChange={(e) => setCalls(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              What's your average job value?
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                <Input
                  type="number"
                  value={jobValue}
                  onChange={(e) => setJobValue(Number(e.target.value) || 0)}
                  className="w-28 pl-7 text-center font-mono text-lg bg-background border-border"
                />
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={jobValue}
                onChange={(e) => setJobValue(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Calls you're missing (62%)</span>
            <span className="font-mono text-white font-medium">{missedCalls}/month</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Calls AI would rescue</span>
            <span className="font-mono text-white font-medium">{rescuedCalls}/month</span>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Revenue you're losing</span>
            <span className="text-3xl font-bold font-mono text-amber-500">
              ${monthlyRevenue.toLocaleString()}<span className="text-sm text-muted-foreground font-normal">/mo</span>
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Annual impact</span>
            <span className="text-xl font-bold font-mono text-amber-500">
              ${yearlyRevenue.toLocaleString()}<span className="text-sm text-muted-foreground font-normal">/yr</span>
            </span>
          </div>
        </div>

        <Button asChild className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12 text-base">
          <Link href="/dashboard/mikes-plumbing-demo">
            Stop Losing ${monthlyRevenue.toLocaleString()}/month →
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            ServiceLine<span className="text-amber-500">AI</span>
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Admin
            </Link>
            <Button asChild variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
              <Link href="/dashboard/mikes-plumbing-demo">Live Demo</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — Copy */}
          <div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 mb-6 gap-1.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Now answering calls for 50+ contractors
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Your AI receptionist.{" "}
              <span className="text-amber-500">24/7.</span>
            </h1>

            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Like your best CSR — but never calls in sick, never misses a call,
              and works nights, weekends, and holidays. Books jobs directly
              into your calendar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12 px-6 shadow-lg shadow-amber-500/20">
                <Link href="/dashboard/mikes-plumbing-demo">
                  See It In Action →
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6">
                <Link href="/admin">
                  Admin Panel
                </Link>
              </Button>
            </div>

            {/* Trust anchors */}
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                14-day free pilot
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                No contracts
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                15-min setup
              </div>
            </div>
          </div>

          {/* Right — ROI Calculator */}
          <ROICalculator />
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { value: "62%", label: "of contractor calls go unanswered" },
            { value: "85%", label: "of voicemail callers never call back" },
            { value: "< 10s", label: "average AI response time" },
            { value: "27:1", label: "average client ROI" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-500">{stat.value}</div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Your phone rings. Nobody answers. Our AI picks up. Here's what happens next.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "AI Answers",
              desc: "Your phone rings, nobody picks up — our AI answers in your business name within seconds. Sounds like a real dispatcher, not a robot.",
              icon: "📞",
            },
            {
              step: "02",
              title: "Books the Job",
              desc: "The AI qualifies the caller, captures their info, and books them directly into your calendar. Emergency? It texts you immediately.",
              icon: "📅",
            },
            {
              step: "03",
              title: "Sends You a Brief",
              desc: "Your tech gets a structured job card — customer name, address, issue, urgency — before they knock on the door.",
              icon: "📋",
            },
          ].map((item) => (
            <Card key={item.step} className="border-border/50 bg-card/50 hover:border-amber-500/20 transition-colors">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-mono text-amber-500 tracking-wider">STEP {item.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything your front office needs</h2>
            <p className="mt-3 text-muted-foreground">One platform. No more juggling voicemail, answering services, and spreadsheets.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "🤖", title: "AI Voice Agent", desc: "Answers calls with your business name. Books appointments. Handles emergencies. Talks like a dispatcher." },
              { icon: "📋", title: "Call Briefing Cards", desc: "Structured job card for every booking — name, address, issue, urgency. Your tech knows what they're walking into." },
              { icon: "💰", title: "Revenue Rescued Dashboard", desc: "See exactly how many calls, leads, and dollars your AI handles — updated daily. The number that makes you never cancel." },
              { icon: "🚨", title: "Emergency Triage", desc: "Burst pipe at 2 AM? AI escalates immediately — texts your on-call person within seconds. No voicemail delay." },
              { icon: "📱", title: "On-Call Routing", desc: "Set a schedule for who gets notified. Your tech on Tuesday, your partner on weekends. Falls back to you if nobody responds." },
              { icon: "⭐", title: "Review Harvesting", desc: "After every job, AI texts the customer asking for a Google review. Watch your star rating climb." },
            ].map((f) => (
              <Card key={f.title} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold">What contractors say</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              quote: "I had no idea I was losing that many calls. The Revenue Rescued dashboard showed me $4,200 in the first month alone. Paid for itself in week one.",
              name: "Mike J.",
              company: "Mike's Plumbing & Drain",
              role: "Owner",
            },
            {
              quote: "My wife used to answer the phone between jobs. Now the AI handles it and she actually gets to eat dinner. Best $499 I spend every month.",
              name: "Carlos R.",
              company: "CoolAir HVAC Solutions",
              role: "Owner",
            },
            {
              quote: "The call briefing cards are a game changer. My guys show up knowing the customer's name, the issue, and the urgency. No more surprises.",
              name: "Sarah C.",
              company: "Precision Plumbing Co.",
              role: "Operations Manager",
            },
          ].map((t) => (
            <Card key={t.name} className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Simple pricing. No surprises.</h2>
            <p className="mt-3 text-muted-foreground">14-day free pilot. Month-to-month. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Starter */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Starter</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono">$199</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <Separator className="my-6 bg-border/50" />
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {["Missed-call text-back", "AI SMS auto-reply", "Follow-up drip sequence", "Revenue Rescued dashboard"].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="w-full mt-8 h-11">
                  <Link href="/dashboard/mikes-plumbing-demo">Start Free Pilot</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-amber-500/30 bg-card/50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-black font-semibold hover:bg-amber-500">Most Popular</Badge>
              </div>
              <CardContent className="p-8">
                <p className="text-sm font-medium text-amber-500 uppercase tracking-wider">Pro</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono">$499</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <Separator className="my-6 bg-border/50" />
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {[
                    { text: "Everything in Starter", bold: false },
                    { text: "AI voice agent — books appointments live", bold: true },
                    { text: "Emergency triage + escalation", bold: false },
                    { text: "Call briefing cards for techs", bold: false },
                    { text: "On-call routing + scheduling", bold: false },
                    { text: "GEO/SEO automation", bold: false },
                  ].map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      {f.bold ? <strong className="text-foreground">{f.text}</strong> : f.text}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-8 h-11 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                  <Link href="/dashboard/mikes-plumbing-demo">Start Free Pilot</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 gap-1.5 py-1.5 px-4 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              $1,000 Revenue Rescued Guarantee — first month free if we don't rescue $1K+
            </Badge>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-24">
        <h2 className="text-3xl font-bold text-center mb-10">Questions contractors ask</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {[
            { q: "How long does setup take?", a: "About 15 minutes. We configure your AI with your business name, services, and service area. You get a phone number, and it starts answering calls immediately." },
            { q: "Does it sound like a robot?", a: "No. The AI uses natural speech synthesis and talks like a dispatcher — short, direct, no corporate fluff. Callers often don't realize it's AI until they ask." },
            { q: "What happens during an emergency?", a: "The AI detects emergency keywords (burst pipe, gas smell, flooding, sewage, no heat) and immediately texts your on-call person with the caller's info. No qualifying questions, no delay." },
            { q: "What if the AI can't help the caller?", a: "It says 'Let me have the owner call you right back' and texts you immediately. Every call has a path to a human — callers are never trapped." },
            { q: "Do I need special equipment?", a: "No. You forward your existing business number to the AI number (takes 30 seconds), or use the AI number directly. Works with any phone." },
            { q: "Can I try it before I pay?", a: "Yes. 14-day pilot with full Pro features, no credit card required. Plus a $1,000 Revenue Rescued Guarantee — if we don't rescue at least $1K in your first paid month, that month is free." },
            { q: "What about my existing answering service?", a: "Replace it. Your AI receptionist costs less, answers faster, books directly into your calendar, and never puts callers on hold. Your current answering service takes messages — we take action." },
          ].map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border border-border/50 rounded-lg px-4 data-[state=open]:border-amber-500/20">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Every missed call costs you <span className="text-amber-500 font-mono">$350</span>.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            How many did you miss today?
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12 px-8 shadow-lg shadow-amber-500/20">
              <Link href="/dashboard/mikes-plumbing-demo">See the Demo →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Built for plumbers. By people who answer phones.</span>
          <span className="text-sm text-muted-foreground">© 2026 ServiceLine AI</span>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden border-t border-border bg-background/95 backdrop-blur-lg p-3 z-50">
        <Button asChild className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12">
          <Link href="/dashboard/mikes-plumbing-demo">See It In Action →</Link>
        </Button>
      </div>
    </div>
  );
}
