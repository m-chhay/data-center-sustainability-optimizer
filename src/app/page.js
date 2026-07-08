import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-28 text-center sm:pt-36">
        {/* Instrument-panel eyebrow — echoes the simulator's own monospace
            metric readouts (PUE 1.58, SLOT 01), not a generic label. */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 font-mono text-xs uppercase tracking-wider text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          PUE · WUE · CAPEX — live simulation model
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
          Balancing Compute, Capital,{' '}
          <span className="text-emerald-600 dark:text-emerald-500">and Carbon.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          You're the Infrastructure Director scaling a facility to meet accelerating global compute
          demand. Every rack you deploy moves three numbers at once, PUE, WUE, and real capital
          exposure, and only one of you gets to decide which one bends.
        </p>

        {/* ── CTA ── */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/simulator"
            className="group inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Launch Simulator
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 font-mono text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
            📊 Mode: Open Sandbox · ⏱️ 5-Min Scenario
          </span>
        </div>
      </section>

      {/* ── Three Pillars ── */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div className="grid gap-4 sm:grid-cols-3">
          <PillarCard
            icon="🔋"
            label="Power"
            metric="PUE"
            body="Manage energy overhead across the rack. The theoretical floor is 1.0, zero draw beyond compute itself. Every point above it is money and carbon you're spending on overhead, not workload."
          />
          <PillarCard
            icon="💧"
            label="Water"
            metric="WUE"
            body="Weigh direct-to-chip liquid cooling against traditional cooling towers. One saves water and costs more upfront. The other scales cheap until the region runs dry."
          />
          <PillarCard
            icon="💰"
            label="Capital"
            metric="ROI"
            body="Justify premium sustainable hardware against its own payback curve. The efficient option is rarely the cheap one, and the board wants both numbers on the same slide."
          />
        </div>
      </section>
    </main>
  );
}

function PillarCard({ icon, label, metric, body }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-background p-6 transition-colors duration-200 hover:border-emerald-600/50 hover:bg-emerald-50/40 dark:border-neutral-800 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/5">
      <div className="flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
          {metric}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{label}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}