"use client";

import { useEffect, useState } from "react";
import "./landing.css";

const metrics = [
  { label: "Final PUE", value: "1.38", unit: "PUE", detail: "Top 22% of peers", tone: "lime" },
  { label: "Final WUE", value: "0.82", unit: "L/kWh", detail: "Top 31% of peers", tone: "blue" },
  { label: "Annual CO₂ reduction", value: "4,860", unit: "t", detail: "Avoided per year", tone: "mint" },
  { label: "Total CapEx", value: "$28.4", unit: "M", detail: "Within budget", tone: "sand" },
  { label: "Annual savings", value: "$6.2", unit: "M", detail: "Energy + operations", tone: "lime" },
  { label: "Break-even", value: "4.6", unit: "yrs", detail: "Estimated payback", tone: "blue" },
];

const features = [
  {
    number: "01",
    title: "Model the facility",
    text: "Configure region, capacity, cooling, power, and compute density against a realistic operating baseline.",
  },
  {
    number: "02",
    title: "Test every trade-off",
    text: "See how each infrastructure decision moves PUE, WUE, carbon exposure, and capital at the same time.",
  },
  {
    number: "03",
    title: "Build the business case",
    text: "Turn the strongest configuration into a clear investment narrative with measurable operational outcomes.",
  },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i /><i /><i /><i />
      <b />
    </span>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initial === "dark");
    const frame = window.requestAnimationFrame(() => setTheme(initial));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
    </button>
  );
}

function DashboardPreview() {
  return (
    <div className="dashboard-shell" aria-label="Optimizer dashboard preview">
      <div className="dashboard-topline">
        <span><i /> CONFIGURATION RESULTS</span>
        <span>EXECUTIVE SUMMARY</span>
      </div>
      <div className="dashboard-title-row">
        <div><small>MODELED FACILITY</small><strong>Results overview</strong></div>
        <span>Architecture validated</span>
      </div>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span className={`metric-dot ${metric.tone}`} />{metric.label}</div>
            <div><strong>{metric.value}</strong><small>{metric.unit}</small></div>
            <span className="metric-change">{metric.detail}</span>
          </article>
        ))}
      </div>
      <div className="dashboard-main">
        <div className="performance-card">
          <div className="panel-heading"><span>Financial performance</span><b>10-year outlook</b></div>
          <div className="line-chart" aria-hidden="true">
            <div className="chart-grid" />
            <svg viewBox="0 0 520 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a5d56f" stopOpacity=".32" />
                  <stop offset="100%" stopColor="#a5d56f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="area" d="M0 162 C78 154 92 124 144 129 S224 87 274 96 S348 43 397 60 S468 22 520 20 L520 180 L0 180Z" />
              <path className="line" d="M0 162 C78 154 92 124 144 129 S224 87 274 96 S348 43 397 60 S468 22 520 20" />
              <circle cx="520" cy="20" r="5" />
            </svg>
            <div className="chart-axis"><span>Year 0</span><span>Year 3</span><span>Break-even</span><span>Year 10</span></div>
          </div>
        </div>
        <div className="impact-card">
          <div className="panel-heading"><span>Target status</span><b>On track</b></div>
          <div className="impact-number">82%</div>
          <p>decarbonization target</p>
          <div className="bar-chart" aria-hidden="true">
            {[38, 52, 47, 68, 56, 78, 64, 84, 73, 91].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="NetGrid Ops home"><BrandMark />NetGrid Ops</a>
        <div className="nav-links">
          <a href="#product">Product</a>
          <a href="#method">How it works</a>
          <a href="#outcomes">Outcomes</a>
        </div>
        <div className="nav-actions">
          <ThemeToggle />
        </div>
      </nav>

      <section className="hero" id="top">

        <div className="hero-content">
          <div className="eyebrow"><span className="pulse" /> Introducing NetGrid Ops v1.0</div>
          <h1>Design the World&apos;s<br /><em>Most Efficient Compute</em><br />Infrastructure.</h1>
          <p>Model data center growth, energy systems, and sustainability strategies before deployment. NetGrid Ops helps infrastructure teams optimize capacity, cost, and carbon performance in real time.</p>
          <div className="hero-actions">
            <a className="button button--primary" href="/simulator">Open Platform <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <div className="dashboard-wrap" id="model"><DashboardPreview /></div>
      </section>

      <section className="proof-strip" aria-label="Model outcomes">
        <p>ONE MODEL. FOUR DECISIONS.</p>
        <div><span>POWER</span><i /> <span>WATER</span><i /> <span>CARBON</span><i /> <span>CAPITAL</span></div>
      </section>

      <section className="product-section" id="product">
        <div className="section-tag">THE OPTIMIZER</div>
        <h2>Find the <em>most efficient path</em><br />before you build.</h2>
        <p className="section-intro">Infrastructure choices do not happen in isolation. NetGrid Ops makes their hidden relationships visible, measurable, and easier to defend.</p>
        <div className="feature-grid" id="method">
          {features.map((feature) => (
            <article key={feature.number}>
              <span>{feature.number}</span>
              <div className="feature-icon" aria-hidden="true"><i /><b /><em /></div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="outcomes" id="outcomes">
        <div>
          <span className="section-tag section-tag--dark">FACILITY OBJECTIVE</span>
          <h2>Balance performance<br />with <em>planetary limits.</em></h2>
        </div>
        <div className="outcome-copy">
          <p>Scale compute without treating sustainability as an afterthought. Compare configurations, surface constraints, and arrive at a plan built for the real world.</p>
          <a className="button button--light" href="/simulator">Start Modeling <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <footer>
        <a className="brand brand--footer" href="#top"><BrandMark />NetGrid Ops</a>
        <p>Compute Infrastructure Sustainability Optimizer</p>
        <p>Built to explore better infrastructure decisions.</p>
      </footer>
    </main>
  );
}
