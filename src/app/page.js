import Link from 'next/link';
import ThemeToggle from './components/ThemeToggle';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F3F5EE] text-[#1F2E22] dark:bg-[#10201A] dark:text-[#ECF1E9]">
      {/* ── Top bar ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2F5741] text-xs font-bold text-white dark:bg-[#3D7A5C]">
            ▣
          </span>
          <span className="text-lg font-semibold">NetGrid Ops</span>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-[#55665A] dark:text-[#9FB0A4] sm:flex">
          <span>Product</span>
          <span>Features</span>
          <span>Pricing</span>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/simulator"
            className="rounded-full bg-[#2F5741] px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.03] dark:bg-[#3D7A5C]"
          >
            Launch Simulator
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-8 text-center sm:pt-14">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DCE3D6] px-3 py-1 text-xs font-medium text-[#55665A] dark:border-[#24352B] dark:text-[#9FB0A4]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3D7A5C]" />
          Real-time PUE, WUE, and CapEx modeling
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Balance <em className="font-serif italic text-[#2F5741] dark:text-[#5FAE86]">Your Infrastructure</em>
          <br />
          With NetGrid Ops.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#55665A] dark:text-[#9FB0A4]">
          Optimize facility efficiency, balance resource load, and price every upgrade decision
          before it hits the budget with NetGrid Ops.
        </p>

        <Link
          href="/simulator"
          className="mt-8 inline-block rounded-full bg-[#2F5741] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:bg-[#3D7A5C]"
        >
          Launch Simulator
        </Link>
      </section>

      {/* ── Dashboard preview card — the signature graphic. Deliberately
          fixed dark styling regardless of page theme, same way a lot of
          real analytics previews stay dark for contrast, so this doesn't
          need its own light/dark variant on every inner element. ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-black/10 bg-[#0F1A14] p-5 shadow-xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="PUE" value="1.42" />
            <MiniStat label="WUE" value="1.21" />
            <MiniStat label="CapEx" value="$18.4M" />
            <MiniStat label="Savings/yr" value="$3.1M" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wide text-[#9FB0A4]">CapEx allocation</div>
              <div className="mt-3 flex items-center gap-4">
                <DonutMock />
                <ul className="space-y-1 text-xs text-[#CBD5C9]">
                  <li className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#5FAE86]" /> Cooling
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#3D7A5C]" /> Power
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#24352B]" /> Structural
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wide text-[#9FB0A4]">10-yr cumulative return</div>
              <BarsMock />
            </div>
          </div>
        </div>

        {/* Placeholder-logo strip — "Logoipsum" is a standard mockup
            convention, not a real-company claim. */}
        <p className="mt-8 text-center text-xs uppercase tracking-wide text-[#55665A] dark:text-[#9FB0A4]">
          Modeled against real facility data patterns
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          <PlaceholderLogo label="Logoipsum" />
          <PlaceholderLogo label="Loco" />
          <PlaceholderLogo label="Logoipsum" />
          <PlaceholderLogo label="Ipsum" />
        </div>
      </section>

      {/* ── Dark feature band ── */}
      <section className="bg-[#152A20] py-20 dark:bg-[#0B1512]">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Achieve <em className="font-serif italic text-[#7FC9A3]">System Efficiency</em>
            <br />
            With Proactive Modeling
          </h2>

          <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
            <PillarCard
              icon="🔋"
              label="Power"
              metric="PUE"
              body="Every point above 1.0 is overhead you're paying for twice, once in energy, once in carbon."
            />
            <PillarCard
              icon="💧"
              label="Water"
              metric="WUE"
              body="Liquid cooling against cooling towers, priced against the water table your region actually has."
            />
            <PillarCard
              icon="💰"
              label="Capital"
              metric="ROI"
              body="The efficient hardware is rarely the cheap hardware. Model both curves before the board meeting."
            />
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">Model your next facility decision.</h2>
        <Link
          href="/simulator"
          className="mt-8 inline-block rounded-full bg-[#2F5741] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:bg-[#3D7A5C]"
        >
          Launch Simulator →
        </Link>
      </section>
    </main>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9FB0A4]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function DonutMock() {
  // Static conic-gradient donut — a mockup accent, not a live chart.
  return (
    <div
      className="h-16 w-16 flex-shrink-0 rounded-full"
      style={{
        background:
          'conic-gradient(#5FAE86 0deg 140deg, #3D7A5C 140deg 250deg, #24352B 250deg 360deg)',
      }}
    >
      <div className="m-auto mt-[10px] h-11 w-11 rounded-full bg-[#0F1A14]" />
    </div>
  );
}

function BarsMock() {
  const heights = [30, 45, 40, 60, 55, 70, 65, 85, 80, 95];
  return (
    <div className="mt-3 flex h-20 items-end gap-1.5">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-[#3D7A5C]" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function PlaceholderLogo({ label }) {
  return (
    <span className="flex items-center gap-1.5 text-lg font-semibold text-[#55665A] dark:text-[#9FB0A4]">
      <span className="h-4 w-4 rounded-full border-2 border-current" />
      {label}
    </span>
  );
}

function PillarCard({ icon, label, metric, body }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-200 hover:bg-white/[0.07]">
      <div className="flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs uppercase tracking-wider text-[#9FB0A4]">
          {metric}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#CBD5C9]">{body}</p>
    </div>
  );
}