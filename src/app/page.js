'use client';

import { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { useGameState, getQty } from '../hooks/useGameState';
import { UPG, SIZES, CPS, REGIONS, PEERS_PUE, PEERS_WUE } from '../utils/constants';

const MONO = 'font-mono';

// ── Shared theme tokens ──
// text-slate-400 on a white/slate-50 background is 2.56:1 — fails WCAG AA's
// 4.5:1 for body text. Every "secondary/label" text spot in this file used
// that shade. TEXT_MUTED fixes it: slate-600 on light clears 7.58:1, and
// slate-400 in dark mode already clears 6.96:1 against slate-900, so the
// same token works in both directions without a second fix later.
const TEXT_MUTED = 'text-slate-600 dark:text-slate-400';
const TEXT_FAINT = 'text-slate-500 dark:text-slate-500';
const TEXT_PRIMARY = 'text-slate-900 dark:text-slate-100';
const TEXT_BODY = 'text-slate-700 dark:text-slate-300';

// Real UI component borders (cards, inputs, buttons) need 3:1 against their
// background per WCAG 1.4.11. On Tailwind's slate scale, slate-400 only
// gets to 2.56:1 — still short. slate-500 clears 4.76:1 on white and 3.75:1
// on slate-900, so one shade name covers both themes here.
const BORDER_STRONG = 'border-slate-500 dark:border-slate-500';
// Decorative dividers that don't convey state on their own — no 3:1
// requirement applies, so these can stay lighter than BORDER_STRONG.
const BORDER_SUBTLE = 'border-slate-300 dark:border-slate-700';

const CARD_BG = 'bg-white dark:bg-slate-900';
const CHIP_BG = 'bg-slate-50 dark:bg-slate-800';
const PAGE_BG = 'bg-slate-50 dark:bg-slate-950';

// Brand accent. White text on a solid fill needs 4.5:1 — emerald-600 only
// gets to 3.77:1 (fails), emerald-700 clears 5.48:1. So every solid CTA
// button uses emerald-700 in both themes; the brighter emerald-400/500
// range is for borders and badge accents, not for white-text fills, where
// they measure 1.9–2.5:1 and fail outright.
const BRAND_SOLID = 'bg-emerald-700 hover:bg-emerald-800';
const BRAND_TEXT = 'text-emerald-700 dark:text-emerald-400';

// ── Category color system ──
// The spec named 3 categories (cooling, software, structural). The actual
// catalog has 7 once you count power (solar, battery), water (Greywater
// Reclamation), compute density (the AI rack), and telemetry (the IoT
// sensor grid) — those four colors aren't in the spec, I picked them.
// Every border shade below is verified at 3:1+ against its background in
// both themes; sky-500/amber-500/teal-500/lime-500 all failed that check on
// white (2.0–2.8:1), so those four categories use darker 600/700 shades in
// light mode specifically, not just "the -500 for everything" pattern the
// other categories use. Sensors deliberately isn't emerald, to keep it
// visually distinct from the brand accent.
const CATEGORY_STYLES = {
  cooling: { border: 'border-sky-600 dark:border-sky-400', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
  software: { border: 'border-indigo-500 dark:border-indigo-400', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  structural: { border: 'border-zinc-500 dark:border-zinc-400', badge: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  power: { border: 'border-amber-700 dark:border-amber-400', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  water: { border: 'border-teal-600 dark:border-teal-400', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
  compute: { border: 'border-slate-600 dark:border-slate-400', badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
  sensors: { border: 'border-lime-700 dark:border-lime-400', badge: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300' },
};

function categoryStyle(category) {
  return CATEGORY_STYLES[category] || { border: BORDER_STRONG, badge: `${CHIP_BG} ${TEXT_MUTED}` };
}

function formatUSD(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function tierClasses(tier) {
  if (tier === 'good') return { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' };
  if (tier === 'ok') return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  return { text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' };
}

function aggregateUpgrades(upgrades) {
  const counts = upgrades.reduce((acc, upgrade) => {
    const units = upgrade.qty || 1;
    if (!acc[upgrade.id]) {
      acc[upgrade.id] = { ...upgrade, count: units };
    } else {
      acc[upgrade.id].count += units;
    }
    return acc;
  }, {});
  return Object.values(counts);
}

// ════════════════════════════════════════════════════════════════
// Icons — hand-rolled inline SVG, no icon package dependency assumed
// ════════════════════════════════════════════════════════════════

function SunIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${BORDER_SUBTLE} ${CHIP_BG} text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900 print:hidden`}
    >
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// Welcome modal
// ════════════════════════════════════════════════════════════════

function WelcomeModal({ onStart }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  function handleStart() {
    if (dontShowAgain) localStorage.setItem('hideWelcome', 'true');
    onStart();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className={`w-full max-w-md rounded-xl ${CARD_BG} border ${BORDER_STRONG} p-8 shadow-xl`}>
        <div className={`${MONO} text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400`}>
          Facility Configuration Objective
        </div>
        <h1 id="welcome-heading" className={`mt-2 text-xl font-semibold ${TEXT_PRIMARY}`}>
          Welcome.
        </h1>
        <p className={`mt-3 text-sm leading-relaxed ${TEXT_BODY}`}>
          This tool models a sustainability upgrade path for a mid-size facility. The objective is 100% decarbonization
          and a reduced PUE, within a $30.00M CapEx budget.
        </p>
        <label className={`mt-4 flex items-center gap-2 text-sm ${TEXT_BODY}`}>
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-slate-400"
          />
          Don't show this again
        </label>
        <button
          onClick={handleStart}
          className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          Begin Configuration
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab bar — proper ARIA tablist pattern, not just styled buttons
// ════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'results', label: 'Results' },
  { id: 'business-case', label: 'Business Case' },
];

function TabBar({ activeTab, onChange, themeToggle }) {
  return (
    <nav aria-label="Simulator views" className={`rounded-xl ${CARD_BG} border ${BORDER_SUBTLE} shadow-sm print:hidden`}>
      <div className="flex items-center justify-between px-3 pt-3">
        <div role="tablist" aria-label="Simulator views" className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={activeTab === t.id}
              aria-controls={`tabpanel-${t.id}`}
              onClick={() => onChange(t.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === t.id
                  ? `${CHIP_BG} ${TEXT_PRIMARY}`
                  : `${TEXT_MUTED} hover:text-slate-900 dark:hover:text-slate-100`
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pb-2">{themeToggle}</div>
      </div>
      <div className={`border-b ${BORDER_SUBTLE}`} />
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════
// Facility size + carbon price + constraints
// ════════════════════════════════════════════════════════════════

function ResetButton({ onReset }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  function handleClick() {
    if (confirming) {
      onReset();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`ml-auto rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${confirming
          ? 'bg-rose-700 text-white hover:bg-rose-800'
          : `${TEXT_MUTED} hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950 dark:hover:text-rose-300`
        }`}
    >
      {confirming ? 'Click again to confirm' : 'Reset simulation'}
    </button>
  );
}

function ControlBar({ state, actions, financials, targetAchievedPct }) {
  const overBudget = financials.capex > state.budgetLimit;
  const targetMet = targetAchievedPct >= 100;

  return (
    <section aria-label="Facility configuration controls" className={`space-y-2.5 rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-4 shadow-md`}>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className={`${MONO} mb-1 text-xs uppercase tracking-wider ${TEXT_MUTED}`}>Facility size</div>
          <div className="flex gap-1.5" role="group" aria-label="Facility size">
            {SIZES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => actions.setSize(i)}
                aria-pressed={state.sizeIdx === i}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${state.sizeIdx === i
                    ? 'bg-emerald-700 text-white'
                    : `${CHIP_BG} text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700`
                  }`}
              >
                {s.label}
                <span className={`${MONO} ml-1.5 text-xs opacity-70`}>{s.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={`${MONO} mb-1 text-xs uppercase tracking-wider ${TEXT_MUTED}`}>Carbon price</div>
          <div className="flex gap-1.5" role="group" aria-label="Carbon price">
            {CPS.map((cp, i) => (
              <button
                key={cp.l}
                onClick={() => actions.setCarbonPrice(i)}
                aria-pressed={state.carbonPriceIdx === i}
                className={`${MONO} rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${state.carbonPriceIdx === i
                    ? 'bg-emerald-700 text-white'
                    : `${CHIP_BG} text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700`
                  }`}
              >
                {cp.l}
              </button>
            ))}
          </div>
        </div>

        <ResetButton onReset={actions.reset} />
      </div>

      <div className={`flex flex-wrap items-end gap-4 border-t ${BORDER_SUBTLE} pt-3`}>
        <div>
          <div className={`${MONO} mb-1 text-xs uppercase tracking-wider ${TEXT_MUTED}`}>
            Simulation constraints
          </div>
          <div className="flex items-center gap-3">
            <label className={`flex items-center gap-2 text-sm ${TEXT_BODY}`}>
              Budget ($M)
              <input
                type="number"
                step="0.5"
                value={state.budgetLimit / 1_000_000}
                onChange={(e) => actions.setBudgetLimit((parseFloat(e.target.value) || 0) * 1_000_000)}
                aria-label="Budget in millions of dollars"
                className={`w-20 rounded-lg border ${BORDER_STRONG} ${CHIP_BG} px-3 py-1 text-sm ${TEXT_PRIMARY}`}
              />
            </label>
            <label className={`flex items-center gap-2 text-sm ${TEXT_BODY}`}>
              Decarbonization target (%)
              <input
                type="number"
                step="5"
                value={state.targetDecarbonization}
                onChange={(e) => actions.setTargetDecarbonization(parseFloat(e.target.value) || 0)}
                aria-label="Decarbonization target percentage"
                className={`w-20 rounded-lg border ${BORDER_STRONG} ${CHIP_BG} px-3 py-1 text-sm ${TEXT_PRIMARY}`}
              />
            </label>
            <label className={`flex items-center gap-2 text-sm ${TEXT_BODY}`}>
              Region
              <select
                value={state.region}
                onChange={(e) => actions.setRegion(e.target.value)}
                aria-label="Facility region"
                className={`rounded-lg border ${BORDER_STRONG} ${CHIP_BG} px-3 py-1 text-sm ${TEXT_PRIMARY}`}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          <span
            role="status"
            className={`${MONO} rounded-full px-3 py-1 text-xs font-medium ${overBudget
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
          >
            {overBudget ? 'Over budget' : 'Within budget'}
          </span>
          <span
            role="status"
            className={`${MONO} rounded-full px-3 py-1 text-xs font-medium ${targetMet
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : `${CHIP_BG} ${TEXT_MUTED}`
              }`}
          >
            {targetAchievedPct}% of target achieved
          </span>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// Upgrade pool — draggable, keyboard-operable cards
// ════════════════════════════════════════════════════════════════

function UpgradeCard({ upgrade, isSelected, isDragging, qty, onQtyChange, disabled, disabledReason, onSelect, onDragStart, onDragEnd }) {
  const cat = categoryStyle(upgrade.category);

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, upgrade, qty)}
      onDragEnd={onDragEnd}
      className={`rounded-xl border p-3.5 transition-all ${isDragging
          ? `${BORDER_SUBTLE} opacity-40`
          : disabled
            ? `${BORDER_SUBTLE} ${CHIP_BG} opacity-60`
            : isSelected
              ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
              : `${cat.border} ${CARD_BG} shadow-sm hover:shadow-md`
        }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`${MONO} rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${isSelected ? 'bg-white/20 text-white' : cat.badge}`}>
          {upgrade.category}
        </span>
        <span
          className={`${MONO} flex h-6 w-10 items-center justify-center rounded-md text-xs font-semibold`}
          style={{ background: upgrade.bg, color: upgrade.tc }}
        >
          {upgrade.abbr}
        </span>
      </div>

      <button
        type="button"
        onClick={() => !disabled && onSelect(upgrade.id)}
        disabled={disabled}
        aria-pressed={isSelected}
        aria-label={`${upgrade.name}, quantity ${qty}. ${formatUSD(upgrade.capex * qty)} capital expenditure, ${formatUSD(upgrade.sav * qty)} annual savings, ${upgrade.co2 * qty} tons CO2 impact. ${disabled ? disabledReason : isSelected ? 'Currently selected.' : 'Select, then choose a facility slot to deploy.'
          }`}
        title={disabled ? disabledReason : undefined}
        className={`w-full cursor-grab text-left disabled:cursor-not-allowed ${isDragging || disabled ? '' : 'active:cursor-grabbing'}`}
      >
        <span className={`pointer-events-none text-sm font-medium ${isSelected ? '' : TEXT_PRIMARY}`}>{upgrade.name}</span>
        <div
          className={`${MONO} pointer-events-none mt-2 flex gap-3 text-xs ${isSelected ? 'text-white/80' : TEXT_MUTED
            }`}
        >
          <span>{formatUSD(upgrade.capex * qty)} capex</span>
          <span>{formatUSD(upgrade.sav * qty)}/yr</span>
          <span>{upgrade.co2 * qty}t CO₂</span>
        </div>
        <p className={`pointer-events-none mt-1.5 text-xs leading-snug ${isSelected ? 'text-white/90' : TEXT_BODY}`}>
          {upgrade.why}
        </p>
      </button>

      <div className="mt-2.5 flex items-center justify-end">
        {/* Sits inside a draggable parent. A mousedown here can get read as
            the start of a drag before React's onClick ever fires — stopping
            propagation on mousedown is what actually prevents that, not
            stopping propagation on click, which fires too late. */}
        <div
          role="group"
          aria-label={`${upgrade.name} quantity`}
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
          className={`flex items-center gap-1 rounded-lg border ${isSelected ? 'border-white/30' : BORDER_SUBTLE}`}
        >
          <button
            type="button"
            onClick={() => onQtyChange(-1)}
            disabled={qty <= 1}
            aria-label={`Decrease quantity of ${upgrade.name}`}
            className={`${MONO} px-2 py-0.5 text-xs disabled:opacity-40 ${isSelected ? 'text-white' : TEXT_BODY}`}
          >
            −
          </button>
          <span className={`${MONO} min-w-[1.5rem] text-center text-xs ${isSelected ? 'text-white' : TEXT_PRIMARY}`}>
            {qty}
          </span>
          <button
            type="button"
            onClick={() => onQtyChange(1)}
            aria-label={`Increase quantity of ${upgrade.name}`}
            className={`${MONO} px-2 py-0.5 text-xs ${isSelected ? 'text-white' : TEXT_BODY}`}
          >
            +
          </button>
        </div>
      </div>
      {disabled && (
        <p role="status" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
          {disabledReason}
        </p>
      )}
    </div>
  );
}

function UpgradePool({ state, actions, financials, sizeFm, gridFull, selectedId, draggingId, onSelect, onDragStart, onDragEnd }) {
  return (
    <section
      aria-label="Upgrade catalog"
      className={`flex w-full flex-col rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-4 shadow-md lg:w-72 lg:flex-shrink-0 print:hidden`}
    >
      <div className="mb-3">
        <h2 className={`text-sm font-semibold ${TEXT_PRIMARY}`}>Upgrade catalog</h2>
        <p className={`text-xs ${TEXT_MUTED}`}>
          Drag an upgrade card and drop it onto an empty facility slot below, or select a card and click a slot.
        </p>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {UPG.map((u) => {
          const qty = getQty(state, u.id);
          const prospectiveCapex = financials.upgradeCapex + u.capex * qty * sizeFm + state.slotExpansionCost;
          const overBudget = prospectiveCapex > state.budgetLimit;
          const disabled = overBudget || gridFull;
          const disabledReason = gridFull
            ? 'No empty slots remaining.'
            : overBudget
              ? `${qty}x would exceed the configured CapEx budget.`
              : null;
          return (
            <UpgradeCard
              key={u.id}
              upgrade={u}
              qty={qty}
              onQtyChange={(delta) => actions.setQty(u.id, delta)}
              disabled={disabled}
              disabledReason={disabledReason}
              isSelected={selectedId === u.id}
              isDragging={draggingId === u.id}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// Rack grid — drop target + click-to-delete, keyboard-operable
// ════════════════════════════════════════════════════════════════

function GridSlot({ index, upgrade, isDropTarget, isInvalidTarget, invalidReason, onClick, onDragOver, onDragLeave, onDrop }) {
  if (!upgrade) {
    let stateClasses = `border-dashed ${BORDER_STRONG} ${CHIP_BG} text-slate-500 dark:text-slate-500 hover:border-slate-600`;
    if (isDropTarget) {
      stateClasses = 'border-solid border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400/50';
    } else if (isInvalidTarget) {
      stateClasses = 'border-solid border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 cursor-not-allowed';
    }
    return (
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          onDragOver={(e) => onDragOver(e, index)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, index)}
          aria-label={`Slot ${index + 1}, empty.${isInvalidTarget && invalidReason ? ' ' + invalidReason : ''}`}
          className={`${MONO} flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 transition-colors ${stateClasses}`}
        >
          <span className="pointer-events-none text-xs tracking-wider">
            SLOT {String(index + 1).padStart(2, '0')}
          </span>
          <span className="pointer-events-none text-xl leading-none opacity-60">+</span>
        </button>
        {isInvalidTarget && invalidReason && (
          <div
            role="alert"
            className="pointer-events-none absolute -top-2 left-1/2 z-10 w-48 -translate-x-1/2 -translate-y-full rounded-lg bg-rose-700 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg"
          >
            {invalidReason}
            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rose-700" />
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Slot ${index + 1}, ${upgrade.name} deployed. Press to remove.`}
      className="group relative flex h-24 flex-col justify-between rounded-xl p-3 text-left shadow-sm ring-2 ring-black/10 transition-transform hover:scale-[0.98] dark:ring-white/10"
      style={{ background: upgrade.bg, color: upgrade.tc }}
    >
      {/* Overlay handles the red delete-hover cue so it doesn't fight the
          upgrade's own inline background color. */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-transparent opacity-0 transition-opacity group-hover:border-red-500 group-hover:bg-red-50/40 group-hover:opacity-100" />
      <div className="pointer-events-none flex items-center justify-between">
        <span className={`${MONO} text-xs tracking-wider opacity-80`}>
          SLOT {String(index + 1).padStart(2, '0')}
        </span>
        <span className={`${MONO} text-xs font-bold`}>{upgrade.abbr}</span>
      </div>
      <div className="pointer-events-none text-xs font-semibold leading-tight">{upgrade.name}</div>
    </button>
  );
}

function RackGrid({ state, actions, selectedId, draggingId, onPlaced }) {
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [invalidTarget, setInvalidTarget] = useState(null); // { index, reason }
  const canShrink = state.gridSlots > 1 && state.grid[state.grid.length - 1] === null;
  const placedUpgrades = state.grid.filter((cell) => cell !== null);

  function handleSlotClick(index) {
    const occupied = state.grid[index];
    if (occupied) {
      actions.removeUpgrade(index);
      return;
    }
    if (!selectedId) return;
    const qty = getQty(state, selectedId);
    actions.placeUpgrade(index, selectedId, qty);
    onPlaced();
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (state.grid[index] !== null) return;

    // dataTransfer.getData() only returns real payload on the drop event —
    // browsers withhold it during dragover. draggingId is the JS-state
    // fallback set on dragstart, and it's the only thing that actually
    // works here.
    const check = draggingId ? actions.validatePlacement(draggingId, placedUpgrades) : { allowed: true, reason: null };

    if (check.allowed) {
      e.dataTransfer.dropEffect = 'move';
      setDropTargetIndex(index);
      setInvalidTarget(null);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropTargetIndex(null);
      setInvalidTarget({ index, reason: check.reason });
    }
  }

  function handleDragLeave() {
    setDropTargetIndex(null);
    setInvalidTarget(null);
  }

  function handleDrop(e, index) {
    e.preventDefault();
    setDropTargetIndex(null);
    setInvalidTarget(null);
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw || state.grid[index] !== null) return;
      const { id: upgradeType, qty } = JSON.parse(raw);
      if (!upgradeType) return;
      actions.placeUpgrade(index, upgradeType, qty);
      onPlaced();
    } catch (err) {
      console.error('Drop failed:', err);
    }
  }

  return (
    <section aria-label="Facility layout" className={`flex-1 overflow-y-auto rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className={`text-sm font-semibold ${TEXT_PRIMARY}`}>Facility layout</h2>
          <p className={`text-xs ${TEXT_MUTED}`}>Click an active slot to remove its upgrade.</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={actions.shrinkGrid}
            disabled={!canShrink}
            aria-label="Remove last facility slot"
            title={canShrink ? 'Remove last slot' : 'Cannot remove — last slot is occupied or minimum reached'}
            className={`${MONO} rounded-lg border px-2.5 py-1.5 text-xs font-medium ${canShrink
                ? `${BORDER_STRONG} ${CHIP_BG} text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700`
                : `cursor-not-allowed ${BORDER_SUBTLE} ${TEXT_FAINT}`
              }`}
          >
            − Slot
          </button>
          <button
            onClick={actions.expandGrid}
            aria-label="Add facility slot"
            className={`${MONO} rounded-lg border ${BORDER_STRONG} ${CHIP_BG} px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700`}
          >
            + Slot
          </button>
        </div>
      </div>

      <div role="grid" aria-label="Facility rack slots" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {state.grid.map((upgrade, i) => (
          <GridSlot
            key={i}
            index={i}
            upgrade={upgrade}
            isDropTarget={dropTargetIndex === i}
            isInvalidTarget={invalidTarget && invalidTarget.index === i}
            invalidReason={invalidTarget && invalidTarget.index === i ? invalidTarget.reason : null}
            onClick={() => handleSlotClick(i)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {state.slotExpansionCost > 0 && (
        <p className={`${MONO} mt-4 text-xs ${TEXT_MUTED}`}>
          Slot expansion capex to date: {formatUSD(state.slotExpansionCost)}
        </p>
      )}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// Metrics rail
// ════════════════════════════════════════════════════════════════

function MetricBar({ label, value, barPct, tier }) {
  const { text, bar } = tierClasses(tier);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={`text-xs font-medium ${TEXT_MUTED}`}>{label}</span>
        <span className={`${MONO} text-sm font-semibold ${text}`}>{value}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(barPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className={`rounded-xl border ${BORDER_SUBTLE} ${CHIP_BG} p-3.5 shadow-sm`}>
      <div className={`text-xs uppercase tracking-wide ${TEXT_MUTED}`}>{label}</div>
      <div className={`${MONO} mt-0.5 text-lg font-semibold ${TEXT_PRIMARY}`}>{value}</div>
      {sub && <div className={`text-xs ${TEXT_MUTED}`}>{sub}</div>}
    </div>
  );
}

function MetricsRail({ metrics, financials, targetAchievedPct }) {
  return (
    <aside
      aria-label="Facility metrics"
      className={`w-full flex-shrink-0 space-y-5 overflow-y-auto rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md lg:w-80 print:hidden`}
    >
      <div>
        <h2 className={`mb-3 text-sm font-semibold ${TEXT_PRIMARY}`}>Efficiency</h2>
        <div className="space-y-3">
          <MetricBar label="PUE" value={metrics.pue.value} barPct={metrics.pue.barPct} tier={metrics.pue.tier} />
          <MetricBar label="WUE" value={metrics.wue.value} barPct={metrics.wue.barPct} tier={metrics.wue.tier} />
        </div>
      </div>

      <div>
        <h2 className={`mb-3 text-sm font-semibold ${TEXT_PRIMARY}`}>Impact</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard label="CO₂ / yr" value={`${metrics.co2}t`} />
          <MetricCard label="Trees eq." value={metrics.trees.toLocaleString()} />
        </div>
        <div
          role="progressbar"
          aria-label="Decarbonization target achieved"
          aria-valuenow={targetAchievedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${targetAchievedPct}%` }} />
        </div>
        <div className={`mt-1 text-xs ${TEXT_MUTED}`}>{targetAchievedPct}% of decarbonization target achieved</div>
      </div>

      <div>
        <h2 className={`mb-3 text-sm font-semibold ${TEXT_PRIMARY}`}>Financials</h2>
        <div className="space-y-2.5">
          <MetricCard label="Total CapEx" value={formatUSD(financials.capex)} />
          <MetricCard label="Annual savings" value={formatUSD(financials.annualSavings)} />
          <MetricCard label="Break-even" value={financials.breakEvenYears ? `${financials.breakEvenYears.toFixed(1)} yrs` : '—'} />
          <MetricCard
            label="10-yr net"
            value={formatUSD(financials.netAtYear10)}
            sub={financials.netAtYear10 >= 0 ? 'positive return' : 'negative return'}
          />
        </div>
      </div>

      {metrics.deployment && (
        <div className={`rounded-xl border ${BORDER_SUBTLE} ${CHIP_BG} p-3.5 shadow-sm`}>
          <div className={`text-xs uppercase tracking-wide ${TEXT_MUTED}`}>Deployment timeline</div>
          <div className={`${MONO} mt-0.5 text-sm font-semibold ${TEXT_PRIMARY}`}>{metrics.deployment.label}</div>
          <div className={`text-xs ${TEXT_MUTED}`}>{metrics.deployment.note}</div>
        </div>
      )}
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════
// Sandbox tab
// ════════════════════════════════════════════════════════════════

function SandboxView({ state, actions, metrics, financials, targetAchievedPct, selectedUpgradeId, setSelectedUpgradeId }) {
  const [draggingId, setDraggingId] = useState(null);
  const sizeFm = SIZES[state.sizeIdx].fm;
  const gridFull = state.grid.filter((c) => c !== null).length >= state.gridSlots;

  function handleDragStart(e, upgrade, qty) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: upgrade.id, qty }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(upgrade.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto lg:flex-row lg:overflow-hidden">
      <UpgradePool
        state={state}
        actions={actions}
        financials={financials}
        sizeFm={sizeFm}
        gridFull={gridFull}
        selectedId={selectedUpgradeId}
        draggingId={draggingId}
        onSelect={setSelectedUpgradeId}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      <RackGrid
        state={state}
        actions={actions}
        selectedId={selectedUpgradeId}
        draggingId={draggingId}
        onPlaced={() => setSelectedUpgradeId(null)}
      />
      <MetricsRail metrics={metrics} financials={financials} targetAchievedPct={targetAchievedPct} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Results tab
// ════════════════════════════════════════════════════════════════

function BenchmarkRow({ peer, yourValue }) {
  const isYou = peer.you;
  const val = isYou ? yourValue : peer.val;
  const maxVal = 2;
  return (
    <div className="flex items-center gap-3">
      <span className={`w-28 truncate text-xs ${isYou ? `font-semibold ${TEXT_PRIMARY}` : TEXT_MUTED}`}>
        {peer.name}
      </span>
      <div
        role="progressbar"
        aria-label={`${peer.name} value`}
        aria-valuenow={val}
        aria-valuemin={0}
        aria-valuemax={maxVal}
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className={`h-full rounded-full ${isYou ? 'bg-emerald-500' : ''}`}
          style={{ width: `${Math.min(100, (val / maxVal) * 100)}%`, background: isYou ? undefined : peer.color }}
        />
      </div>
      <span className={`${MONO} w-14 text-right text-xs ${TEXT_BODY}`}>{val.toFixed(2)}</span>
    </div>
  );
}

function CashflowChart({ financials }) {
  const years = useMemo(() => {
    const points = [];
    for (let year = 0; year <= 10; year++) {
      const value = year === 0 ? -financials.capex : financials.annualSavings * year - financials.capex;
      points.push({ year, value });
    }
    return points;
  }, [financials.capex, financials.annualSavings]);

  const maxAbs = Math.max(1, ...years.map((y) => Math.abs(y.value)));
  const halfPx = 128; // half of h-64

  return (
    <section
      aria-label="10-Year Cumulative Financial Outlook"
      className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md print:hidden`}
    >
      <h2 className={`mb-1 text-sm font-semibold ${TEXT_PRIMARY}`}>10-Year Cumulative Financial Outlook ($M)</h2>
      <p className={`mb-5 text-xs ${TEXT_MUTED}`}>Year 0 shows the upfront capital hit; the dotted line marks break-even.</p>

      <div className="relative">
        <div className={`pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed ${BORDER_SUBTLE}`} />
        <div className="flex h-64 items-stretch gap-2">
          {years.map(({ year, value }) => {
            const isNegative = value < 0;
            const barPx = Math.max(2, (Math.abs(value) / maxAbs) * halfPx);
            return (
              <div key={year} className="flex flex-1 flex-col items-center">
                <div className="flex h-32 w-full flex-col items-center justify-end">
                  {!isNegative && (
                    <div
                      className="w-full max-w-[28px] rounded-t-sm bg-emerald-500"
                      style={{ height: `${barPx}px` }}
                      title={`${formatUSD(value)}`}
                    />
                  )}
                </div>
                <div className="flex h-32 w-full flex-col items-center justify-start">
                  {isNegative && (
                    <div
                      className="w-full max-w-[28px] rounded-b-sm bg-rose-500"
                      style={{ height: `${barPx}px` }}
                      title={`${formatUSD(value)}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {years.map(({ year }) => (
            <div key={year} className={`${MONO} flex-1 text-center text-xs ${TEXT_MUTED}`}>
              Y{year}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsView({ roadmap, financials, metrics, pueBenchmark, wueBenchmark, activeRisks }) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto">
      <section
        aria-label="Enterprise Operational Risk and Regulatory Audit"
        className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md print:hidden`}
      >
        <h2 className={`mb-4 text-sm font-semibold ${TEXT_PRIMARY}`}>Enterprise Operational Risk &amp; Regulatory Audit</h2>
        <RiskAuditSection risks={activeRisks} />
      </section>

      <CashflowChart financials={financials} />

      <section aria-label="Roadmap by phase" className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md`}>
        <h2 className={`mb-4 text-sm font-semibold ${TEXT_PRIMARY}`}>Roadmap by phase</h2>
        <div className="grid grid-cols-3 gap-4">
          {roadmap.map((phase) => {
            const aggregated = aggregateUpgrades(phase.upgrades);
            return (
              <div key={phase.phase} className={`rounded-xl border ${BORDER_SUBTLE} ${CHIP_BG} p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${TEXT_PRIMARY}`}>Phase {phase.phase}</h3>
                  <span className={`${MONO} text-xs ${TEXT_MUTED}`}>
                    {phase.upgrades.length} item{phase.upgrades.length === 1 ? '' : 's'}
                  </span>
                </div>
                {aggregated.length === 0 ? (
                  <p className={`text-xs ${TEXT_FAINT}`}>Nothing deployed in this phase yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {aggregated.map((u) => (
                      <li key={u.id} className={`flex items-center gap-1.5 text-xs ${TEXT_BODY}`}>
                        {u.name}
                        {u.count > 1 && (
                          <span className={`${MONO} rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200`}>
                            x{u.count}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={`${MONO} mt-3 space-y-0.5 border-t ${BORDER_SUBTLE} pt-2.5 text-xs ${TEXT_MUTED}`}>
                  <div>CapEx {formatUSD(phase.capex)}</div>
                  <div>Savings {formatUSD(phase.annualSavings)}/yr</div>
                  <div>{phase.co2}t CO₂ reduced</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Financial detail" className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md`}>
        <h2 className={`mb-4 text-sm font-semibold ${TEXT_PRIMARY}`}>Financial detail</h2>
        <div className="mb-4 grid grid-cols-4 gap-3">
          <MetricCard label="Upgrade CapEx" value={formatUSD(financials.upgradeCapex)} />
          <MetricCard label="Slot CapEx" value={formatUSD(financials.slotCapex)} />
          <MetricCard label="Carbon value" value={formatUSD(financials.carbonValue)} />
          <MetricCard label="Annual savings" value={formatUSD(financials.annualSavings)} />
        </div>
        <div className={`overflow-hidden rounded-xl border ${BORDER_SUBTLE} ${CHIP_BG}`}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">10-year cumulative net financial return by year</caption>
            <thead className={`text-xs uppercase tracking-wide ${TEXT_MUTED}`}>
              <tr>
                <th scope="col" className="px-4 py-2.5">Year</th>
                <th scope="col" className="px-4 py-2.5">Cumulative net</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className={`${MONO} divide-y ${BORDER_SUBTLE}`}>
              {financials.yearByYear.map((y) => (
                <tr key={y.year}>
                  <td className={`px-4 py-2 ${TEXT_BODY}`}>{y.year}</td>
                  <td className={`px-4 py-2 ${TEXT_BODY}`}>{formatUSD(y.cumulativeNet)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${y.isPositive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                    >
                      {y.isPositive ? 'positive' : 'negative'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6">
        <section aria-label="PUE versus industry" className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${TEXT_PRIMARY}`}>PUE vs. industry</h3>
            <span className={`${MONO} text-xs text-emerald-700 dark:text-emerald-400`}>beats {pueBenchmark.percentile}% of peers</span>
          </div>
          <div className="space-y-2.5">
            {PEERS_PUE.map((p) => (
              <BenchmarkRow key={p.name} peer={p} yourValue={metrics.pue.value} />
            ))}
          </div>
        </section>
        <section aria-label="WUE versus industry" className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-5 shadow-md`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${TEXT_PRIMARY}`}>WUE vs. industry</h3>
            <span className={`${MONO} text-xs text-emerald-700 dark:text-emerald-400`}>beats {wueBenchmark.percentile}% of peers</span>
          </div>
          <div className="space-y-2.5">
            {PEERS_WUE.map((p) => (
              <BenchmarkRow key={p.name} peer={p} yourValue={metrics.wue.value} />
            ))}
          </div>
        </section>
      </div>

      <ModelingAssumptions className="print:hidden" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Business case tab
// ════════════════════════════════════════════════════════════════

function PrintMetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <div className="text-xs uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-semibold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  );
}

function PrintBrief({ state, metrics, financials, placedUpgrades, sizeLabel, regionLabel, hasUpgrades, breakEven }) {
  return (
    // print-color-adjust forces backgrounds and borders to actually survive
    // to paper — most browsers default to stripping or graying them out on
    // print otherwise, which would make this look nothing like the on-screen
    // cards it's meant to match.
    <div
      className="mx-auto max-w-4xl p-8 text-slate-900"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', colorAdjust: 'exact' }}
    >
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          EXECUTIVE LIFECYCLE BRIEF: ENTERPRISE DATA CENTER SUSTAINABILITY INITIATIVE
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Region: {regionLabel} &nbsp;|&nbsp; Facility Size: {sizeLabel}
        </p>
      </div>

      {!hasUpgrades ? (
        <p className="text-sm text-slate-600">No upgrades deployed. Return to the Sandbox tab to build a configuration first.</p>
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Capital Investment Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <PrintMetricCard label="Total CapEx Deployed" value={formatUSD(financials.capex)} />
              <PrintMetricCard label="Remaining Budget Allocation" value={formatUSD(state.budgetLimit - financials.capex)} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Operational Velocity Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <PrintMetricCard label="Annualized OpEx Savings" value={formatUSD(financials.annualSavings)} />
              <PrintMetricCard label="Final Facility PUE" value={metrics.pue.value} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Amortization Milestone</h2>
            <PrintMetricCard
              label="Break-Even Threshold"
              value={breakEven}
              sub={financials.breakEvenYears ? 'Total CapEx ÷ Annualized OpEx Savings' : undefined}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Infrastructure Bill of Materials</h2>
            <ul className="space-y-1.5">
              {aggregateUpgrades(placedUpgrades).map((u) => (
                <li key={u.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                  {u.name}
                  {u.count > 1 && (
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                      x{u.count}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-900">
              Analytical Modeling Assumptions &amp; Methodology
            </h2>
            <ul className="space-y-1">
              <li>• Facility utilization rate modeled at a static 70% baseline capacity.</li>
              <li>• Base cooling infrastructure overhead calculated at 40% of baseline operational expenses (OpEx).</li>
              <li>
                • Regional utility rates, grid carbon intensity multipliers, and structural regulatory fees anchored
                to projected 2026 domestic energy data.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function BusinessCaseView({ state, metrics, financials, placedUpgrades, sizeLabel, activeRisks }) {
  const hasUpgrades = placedUpgrades.length > 0;
  const regionLabel = REGIONS.find((r) => r.id === state.region)?.label || state.region;
  const breakEven = financials.breakEvenYears ? `${financials.breakEvenYears.toFixed(1)} years` : 'beyond the 10-year window';
  const upgradeNames = placedUpgrades.map((u) => u.name).join(', ');
  const [showPreview, setShowPreview] = useState(false);

  const briefProps = { state, metrics, financials, placedUpgrades, sizeLabel, regionLabel, hasUpgrades, breakEven };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium shadow-sm ${BORDER_STRONG} ${CARD_BG} text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800`}
          >
            {showPreview ? 'Back to Memo' : 'Preview Print Layout'}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
          >
            Print / Export Report
          </button>
        </div>

        {showPreview ? (
          // Same component that renders inside the real hidden print:block
          // wrapper below — this is a live look at the actual print output,
          // not a second copy that can quietly drift out of sync with it.
          <div className={`rounded-xl border ${BORDER_SUBTLE} bg-white shadow-md print:hidden`}>
            <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
              Print preview — this is what "Print / Export Report" produces
            </div>
            <PrintBrief {...briefProps} />
          </div>
        ) : (
          <section
            aria-label="Business case memo"
            className={`rounded-xl border ${BORDER_SUBTLE} ${CARD_BG} p-10 shadow-md print:hidden`}
          >
            <div className={`mb-8 border-b ${BORDER_SUBTLE} pb-6`}>
              <div className={`${MONO} text-xs uppercase tracking-widest ${TEXT_MUTED}`}>
                Internal Memo — Sustainability &amp; Infrastructure
              </div>
              <h1 className={`mt-2 text-2xl font-semibold ${TEXT_PRIMARY}`}>
                {sizeLabel} Facility Sustainability Investment
              </h1>
            </div>

            {!hasUpgrades ? (
              <p className={`text-sm ${TEXT_MUTED}`}>
                Deploy at least one upgrade in the Sandbox tab to generate a business case.
              </p>
            ) : (
              <div className={`space-y-6 text-sm leading-relaxed ${TEXT_BODY}`}>
                <p>
                  This memo outlines the proposed sustainability upgrade path for the {sizeLabel.toLowerCase()} facility,
                  covering {upgradeNames}.
                </p>

                <div>
                  <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${TEXT_MUTED}`}>
                    Financial summary
                  </h2>
                  <div className="grid grid-cols-4 gap-3">
                    <MetricCard label="Total CapEx" value={formatUSD(financials.capex)} />
                    <MetricCard label="Annual savings" value={formatUSD(financials.annualSavings)} />
                    <MetricCard label="Break-even" value={breakEven} />
                    <MetricCard label="10-yr net" value={formatUSD(financials.netAtYear10)} />
                  </div>
                </div>

                <p>
                  Capital outlay of {formatUSD(financials.capex)} returns {formatUSD(financials.annualSavings)} per
                  year in energy and operational savings, reaching break-even at {breakEven}. Over a ten-year horizon,
                  the plan nets {formatUSD(financials.netAtYear10)}.
                </p>

                <div>
                  <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${TEXT_MUTED}`}>
                    Efficiency &amp; emissions
                  </h2>
                  <p>
                    The facility moves to a PUE of {metrics.pue.value} and WUE of {metrics.wue.value}, cutting annual
                    emissions by {metrics.co2} metric tons of CO₂, equivalent to {metrics.trees.toLocaleString()}{' '}
                    tree-seedlings grown over ten years.
                  </p>
                </div>

                <div>
                  <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${TEXT_MUTED}`}>
                    Recommendation
                  </h2>
                  <p>
                    Proceed with the phased rollout, prioritizing Phase 1 items for fastest payback before committing
                    capital to longer-lead infrastructure work.
                  </p>
                </div>

                <div>
                  <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${TEXT_MUTED}`}>
                    Enterprise Operational Risk &amp; Regulatory Audit
                  </h2>
                  <RiskAuditSection risks={activeRisks} />
                </div>

                <ModelingAssumptions />
              </div>
            )}
          </section>
        )}
      </div>

      {/* Print-only layout. Hidden on screen, fills the page on print.
          Same PrintBrief component used above for the on-screen preview —
          one source of truth, so preview and real output can't drift apart.
          Deliberately NOT theme-aware — paper is always black text on white
          regardless of the on-screen theme, so no dark: classes apply here. */}
      <div className="hidden print:block">
        <PrintBrief {...briefProps} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Rejection banner
// ════════════════════════════════════════════════════════════════

function RejectionBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between rounded-xl border border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 print:hidden"
    >
      <span className="font-medium">{message}</span>
      <button onClick={onDismiss} className="ml-4 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

// Unlike RejectionBanner, this reflects a standing condition of the current
// grid, not a one-off blocked action. No dismiss button and no timer — it
// appears and disappears entirely based on curtailmentActive, which the
// hook already flips back to false the moment BESS or WORKLOAD_ORCH goes on
// the canvas or solar count drops to 2.
function CurtailmentBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="flex items-center rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 print:hidden"
    >
      <span className="font-medium">{message}</span>
    </div>
  );
}

// Used identically in the Results tab and the on-screen Business Case memo.
// Never rendered in the print-only brief — print:hidden on every branch —
// since the PDF stays clean per spec regardless of which screen linked here.
function RiskAuditSection({ risks }) {
  if (risks.length === 0) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-400 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950 print:hidden"
      >
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          ✓ Strategy Validated: Facility architecture completely satisfies all regional regulatory, redundancy, and
          environmental baseline thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 print:hidden">
      {risks.map((risk) => {
        const isCritical = risk.severity === 'CRITICAL';
        return (
          <div
            key={risk.id}
            role="alert"
            className={`rounded-xl border p-4 ${isCritical
                ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none" aria-hidden="true">{isCritical ? '🛑' : '⚠️'}</span>
              <div>
                <div className="text-sm font-bold uppercase tracking-wide">
                  {risk.severity} — {risk.title}
                </div>
                <p className="mt-1 text-sm leading-relaxed">{risk.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelingAssumptions({ className = '' }) {
  return (
    <div className={`rounded-xl border ${BORDER_SUBTLE} ${CHIP_BG} p-4 text-xs leading-relaxed ${TEXT_MUTED} ${className}`}>
      <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${TEXT_PRIMARY}`}>
        Analytical Modeling Assumptions &amp; Methodology
      </h3>
      <ul className="space-y-1">
        <li>• Facility utilization rate modeled at a static 70% baseline capacity.</li>
        <li>• Base cooling infrastructure overhead calculated at 40% of baseline operational expenses (OpEx).</li>
        <li>
          • Regional utility rates, grid carbon intensity multipliers, and structural regulatory fees anchored to
          projected 2026 domestic energy data.
        </li>
      </ul>
    </div>
  );
}

function RiskAuditBadge({ activeRisks, onViewResults }) {
  if (activeRisks.length === 0) {
    return (
      <div className="print:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-emerald-700">
          ✓ Architecture Fully Compliant
        </span>
      </div>
    );
  }

  return (
    <div className="print:hidden">
      <button
        onClick={onViewResults}
        aria-label={`System audit found ${activeRisks.length} optimization risk${activeRisks.length === 1 ? '' : 's'}. View details in Results tab.`}
        className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:animate-none hover:bg-amber-700"
      >
        ⚠️ System Audit: {activeRisks.length} Optimization Risk{activeRisks.length === 1 ? '' : 's'} Found
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════

export default function Page() {
  const {
    state,
    placedUpgrades,
    metrics,
    financials,
    roadmap,
    pueBenchmark,
    wueBenchmark,
    targetAchievedPct,
    placementError,
    curtailmentWarning,
    activeRisks,
    actions,
  } = useGameState();
  const [selectedUpgradeId, setSelectedUpgradeId] = useState(null);
  const [activeTab, setActiveTab] = useState('sandbox');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('hideWelcome') === 'true') setShowWelcome(false);
  }, []);
  const [theme, setTheme] = useState('light');

  // useLayoutEffect fires before the browser paints the next frame, so this
  // shrinks the flash window compared to useEffect (which fires after
  // paint). It does not eliminate it — the server-rendered HTML paints
  // first, before any client JS runs at all, dark or not. Actually
  // eliminating FOUC needs a synchronous script in the document head,
  // before hydration, which lives in layout.js, not this file. Snippet for
  // that is in the response, not here, since I can't see that file.
  useLayoutEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  }

  const sizeLabel = SIZES[state.sizeIdx].label;

  // placementError is a raw signal from the hook — no timers baked in there.
  // Auto-dismiss timing is a display concern, so it lives here, not in Layer 3.
  useEffect(() => {
    if (!placementError) return;
    const timer = setTimeout(() => actions.clearPlacementError(), 5000);
    return () => clearTimeout(timer);
  }, [placementError, actions]);

  return (
    <main className={`flex h-screen flex-col gap-3 ${PAGE_BG} p-3 font-sans ${TEXT_PRIMARY}`}>
      {showWelcome && <WelcomeModal onStart={() => setShowWelcome(false)} />}

      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        themeToggle={<ThemeToggle theme={theme} onToggle={toggleTheme} />}
      />

      <RejectionBanner message={placementError} onDismiss={actions.clearPlacementError} />
      <CurtailmentBanner message={curtailmentWarning} />

      <div id="tabpanel-sandbox" role="tabpanel" aria-labelledby="tab-sandbox" hidden={activeTab !== 'sandbox'} className="contents">
        {activeTab === 'sandbox' && (
          <>
            <ControlBar state={state} actions={actions} financials={financials} targetAchievedPct={targetAchievedPct} />
            <RiskAuditBadge activeRisks={activeRisks} onViewResults={() => setActiveTab('results')} />
            <SandboxView
              state={state}
              actions={actions}
              metrics={metrics}
              financials={financials}
              targetAchievedPct={targetAchievedPct}
              selectedUpgradeId={selectedUpgradeId}
              setSelectedUpgradeId={setSelectedUpgradeId}
            />
          </>
        )}
      </div>

      <div id="tabpanel-results" role="tabpanel" aria-labelledby="tab-results" hidden={activeTab !== 'results'} className="contents">
        {activeTab === 'results' && (
          <ResultsView
            roadmap={roadmap}
            financials={financials}
            metrics={metrics}
            pueBenchmark={pueBenchmark}
            wueBenchmark={wueBenchmark}
            activeRisks={activeRisks}
          />
        )}
      </div>

      <div id="tabpanel-business-case" role="tabpanel" aria-labelledby="tab-business-case" hidden={activeTab !== 'business-case'} className="contents">
        {activeTab === 'business-case' && (
          <BusinessCaseView
            state={state}
            metrics={metrics}
            financials={financials}
            placedUpgrades={placedUpgrades}
            sizeLabel={sizeLabel}
            activeRisks={activeRisks}
          />
        )}
      </div>
    </main>
  );
}