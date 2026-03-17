import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="text-xl font-bold tracking-tight text-white">
          ServiceLine<span className="text-amber-500">AI</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Admin
          </Link>
          <Link
            href="/dashboard/mikes-plumbing-demo"
            className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            Live Demo →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-medium text-amber-500 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-gold" />
            Now answering calls for 50+ contractors
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Stop losing{" "}
            <span className="text-amber-500 glow-gold font-mono">$45K</span>
            <br />
            to missed calls.
          </h1>

          <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
            Your AI receptionist answers every call, books appointments into your
            calendar, and shows you exactly how much revenue it rescues — 24/7,
            nights, weekends, holidays.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/dashboard/mikes-plumbing-demo"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              See It In Action
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { value: "62%", label: "of contractor calls go unanswered" },
            { value: "85%", label: "of voicemail callers never call back" },
            { value: "< 10s", label: "average AI response time" },
            { value: "27:1", label: "average client ROI" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold font-mono text-amber-500">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">Every missed call is money lost.</h2>
          <p className="mt-3 text-slate-500">We make sure you never miss another one.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            title="AI Voice Agent"
            description="Answers calls with your business name. Books appointments. Escalates emergencies. Talks like a dispatcher, not a robot."
            icon="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
            accent="amber"
          />
          <FeatureCard
            title="Call Briefing Cards"
            description="Every booked job comes with a structured brief — customer name, address, issue, urgency. Your tech knows what they're walking into."
            icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            accent="emerald"
          />
          <FeatureCard
            title="Revenue Rescued Dashboard"
            description="See exactly how many calls, leads, and dollars your AI handles — updated in real time. The number that makes you never cancel."
            icon="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            accent="amber"
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Simple pricing. No contracts.</h2>
            <p className="mt-3 text-slate-500">14-day free pilot. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Starter</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold font-mono text-white">$199</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Missed-call text-back
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  AI SMS auto-reply
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Follow-up drip sequence
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Revenue Rescued dashboard
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-slate-900/50 p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-500">
                Most Popular
              </div>
              <div className="text-sm font-medium text-amber-500 uppercase tracking-wider">Pro</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold font-mono text-white">$499</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Everything in Starter
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <strong className="text-white">AI voice agent</strong> — books appointments live
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Emergency triage + escalation
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Call briefing cards for techs
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  On-call routing + scheduling
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  GEO/SEO automation
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              $1,000 Revenue Rescued Guarantee — first month free if we don't rescue $1K+
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            Built for plumbers. By people who answer phones.
          </div>
          <div className="text-sm text-slate-600">
            © 2026 ServiceLine AI
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  accent,
}: {
  title: string;
  description: string;
  icon: string;
  accent: "amber" | "emerald";
}) {
  const accentColor = accent === "amber" ? "text-amber-500" : "text-emerald-500";
  const borderColor = accent === "amber" ? "border-amber-500/10" : "border-emerald-500/10";
  const bgHover = accent === "amber" ? "hover:border-amber-500/30" : "hover:border-emerald-500/30";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgHover} bg-slate-900/50 p-8 transition-colors card-hover`}>
      <div className={`mb-5 ${accentColor}`}>
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
