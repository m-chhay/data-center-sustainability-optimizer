'use client';

import { useState, useMemo, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { UPG, SIZES, CPS, REGIONS, PEERS_PUE, PEERS_WUE } from '../utils/constants';

const MONO = 'font-mono';

function formatUSD(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function tierClasses(tier) {
  if (tier === 'good') return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
  if (tier === 'ok') return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-rose-600', bar: 'bg-rose-500' };
}

function aggregateUpgrades(upgrades) {
  const counts = upgrades.reduce((acc, upgrade) => {
    if (!acc[upgrade.id]) {
      acc[upgrade.id] = { ...upgrade, count: 1 };
    } else {
      acc[upgrade.id].count += 1;
    }
    return acc;
  }, {});
  return Object.values(counts);
}

// ════════════════════════════════════════════════════════════════
// Welcome modal
// ════════════════════════════════════════════════════════════════

function WelcomeModal({ onStart }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className={`${MONO} text-xs uppercase tracking-widest text-indigo-500`}>Facility Configuration Objective</div>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Welcome.</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This tool models a sustainability upgrade path for a mid-size facility. The objective is 100% decarbonization
          and a reduced PUE, within a $30.00M CapEx budget.
        </p>
        <button
          onClick={onStart}
          className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Begin Configuration
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab bar (no window chrome)
// ════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'results', label: 'Results' },
  { id: 'business-case', label: 'Business Case' },
];

function TabBar({ activeTab, onChange }) {
  return (
    <div className="rounded-xl bg-white shadow-sm print:hidden">
      <div className="flex gap-1.5 px-3 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-slate-50 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="border-b border-slate-100" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Facility size + carbon price + constraints
// ════════════════════════════════════════════════════════════════

function ControlBar({ state, actions, financials, targetAchievedPct }) {
  const overBudget = financials.capex > state.budgetLimit;
  const targetMet = targetAchievedPct >= 100;

  return (
    <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <div className={`${MONO} mb-2 text-[11px] uppercase tracking-wider text-slate-400`}>Facility size</div>
          <div className="flex gap-1.5">
            {SIZES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => actions.setSize(i)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${state.sizeIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {s.label}
                <span className={`${MONO} ml-1.5 text-xs opacity-60`}>{s.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={`${MONO} mb-2 text-[11px] uppercase tracking-wider text-slate-400`}>Carbon price</div>
          <div className="flex gap-1.5">
            {CPS.map((cp, i) => (
              <button
                key={cp.l}
                onClick={() => actions.setCarbonPrice(i)}
                className={`${MONO} rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${state.carbonPriceIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {cp.l}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={actions.reset}
          className="ml-auto rounded-lg px-3.5 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          Reset simulation
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-6 border-t border-slate-100 pt-4">
        <div>
          <div className={`${MONO} mb-2 text-[11px] uppercase tracking-wider text-slate-400`}>
            Simulation constraints
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Budget ($M)
              <input
                type="number"
                step="0.5"
                value={state.budgetLimit / 1_000_000}
                onChange={(e) => actions.setBudgetLimit((parseFloat(e.target.value) || 0) * 1_000_000)}
                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Decarbonization target (%)
              <input
                type="number"
                step="5"
                value={state.targetDecarbonization}
                onChange={(e) => actions.setTargetDecarbonization(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Region
              <select
                value={state.region}
                onChange={(e) => actions.setRegion(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-900"
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
            className={`${MONO} rounded-full px-3 py-1 text-xs font-medium ${overBudget ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}
          >
            {overBudget ? 'Over budget' : 'Within budget'}
          </span>
          <span
            className={`${MONO} rounded-full px-3 py-1 text-xs font-medium ${targetMet ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
          >
            {targetAchievedPct}% of target achieved
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Upgrade pool — draggable cards
// ════════════════════════════════════════════════════════════════

function UpgradeCard({ upgrade, isSelected, isDragging, onSelect, onDragStart, onDragEnd }) {
  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, upgrade)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(upgrade.id)}
      className={`cursor-grab rounded-xl border p-3.5 text-left transition-all active:cursor-grabbing ${isDragging
          ? 'border-slate-200 opacity-40'
          : isSelected
            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
            : 'border-slate-100 bg-white shadow-sm hover:shadow-md'
        }`}
    >
      <div className="pointer-events-none flex items-center justify-between">
        <span className="text-sm font-medium">{upgrade.name}</span>
        <span
          className={`${MONO} flex h-6 w-10 items-center justify-center rounded-md text-[10px] font-semibold`}
          style={{ background: upgrade.bg, color: upgrade.tc }}
        >
          {upgrade.abbr}
        </span>
      </div>
      <div
        className={`${MONO} pointer-events-none mt-2 flex gap-3 text-[11px] ${isSelected ? 'text-white/70' : 'text-slate-400'
          }`}
      >
        <span>{formatUSD(upgrade.capex)} capex</span>
        <span>{formatUSD(upgrade.sav)}/yr</span>
        <span>{upgrade.co2}t CO₂</span>
      </div>
      <p className={`pointer-events-none mt-1.5 text-xs leading-snug ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
        {upgrade.why}
      </p>
    </div>
  );
}

function UpgradePool({ selectedId, draggingId, onSelect, onDragStart, onDragEnd }) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Upgrade catalog</h2>
        <p className="text-xs text-slate-400">
          👇 Drag an upgrade card and drop it onto an empty facility slot below.
        </p>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {UPG.map((u) => (
          <UpgradeCard
            key={u.id}
            upgrade={u}
            isSelected={selectedId === u.id}
            isDragging={draggingId === u.id}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Rack grid — drop target + click-to-delete
// ════════════════════════════════════════════════════════════════

function GridSlot({ index, upgrade, isDropTarget, isInvalidTarget, invalidReason, onClick, onDragOver, onDragLeave, onDrop }) {
  if (!upgrade) {
    let stateClasses = 'border-dashed border-slate-200 bg-slate-50 text-slate-300 hover:border-slate-300';
    if (isDropTarget) {
      stateClasses = 'border-solid border-2 border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-400/50';
    } else if (isInvalidTarget) {
      stateClasses = 'border-solid border-2 border-rose-500 bg-rose-50/10 cursor-not-allowed';
    }
    return (
      <div className="relative">
        <div
          onClick={onClick}
          onDragOver={(e) => onDragOver(e, index)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, index)}
          className={`${MONO} flex h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 transition-colors ${stateClasses}`}
        >
          <span className="pointer-events-none text-[10px] tracking-wider">
            SLOT {String(index + 1).padStart(2, '0')}
          </span>
          <span className="pointer-events-none text-xl leading-none opacity-50">+</span>
        </div>
        {isInvalidTarget && invalidReason && (
          <div className="pointer-events-none absolute -top-2 left-1/2 z-10 w-48 -translate-x-1/2 -translate-y-full rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-medium leading-snug text-white shadow-lg">
            {invalidReason}
            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rose-600" />
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className="group relative flex h-24 flex-col justify-between rounded-xl p-3 text-left shadow-sm transition-transform hover:scale-[0.98]"
      style={{ background: upgrade.bg, color: upgrade.tc }}
    >
      {/* Overlay handles the red delete-hover cue so it doesn't fight the
          upgrade's own inline background color. */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-transparent opacity-0 transition-opacity group-hover:border-red-400 group-hover:bg-red-50/30 group-hover:opacity-100" />
      <div className="pointer-events-none flex items-center justify-between">
        <span className={`${MONO} text-[10px] tracking-wider opacity-70`}>
          SLOT {String(index + 1).padStart(2, '0')}
        </span>
        <span className={`${MONO} text-[10px] font-bold`}>{upgrade.abbr}</span>
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
    actions.placeUpgrade(index, selectedId);
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
      const upgradeType = e.dataTransfer.getData('text/plain');
      if (!upgradeType || state.grid[index] !== null) return;
      actions.placeUpgrade(index, upgradeType);
      onPlaced();
    } catch (err) {
      console.error('Drop failed:', err);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Facility layout</h2>
          <p className="text-xs text-slate-400">💡 Click an active slot to remove its upgrade.</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={actions.shrinkGrid}
            disabled={!canShrink}
            title={canShrink ? 'Remove last slot' : 'Cannot remove — last slot is occupied or minimum reached'}
            className={`${MONO} rounded-lg px-2.5 py-1.5 text-xs font-medium ${canShrink ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'cursor-not-allowed bg-slate-50 text-slate-300'
              }`}
          >
            − Slot
          </button>
          <button
            onClick={actions.expandGrid}
            className={`${MONO} rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200`}
          >
            + Slot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
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
        <p className={`${MONO} mt-4 text-xs text-slate-400`}>
          Slot expansion capex to date: {formatUSD(state.slotExpansionCost)}
        </p>
      )}
    </div>
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
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className={`${MONO} text-sm font-semibold ${text}`}>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`${MONO} mt-0.5 text-lg font-semibold text-slate-900`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function MetricsRail({ metrics, financials, targetAchievedPct }) {
  return (
    <div className="w-80 flex-shrink-0 space-y-5 overflow-y-auto rounded-xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Efficiency</h2>
        <div className="space-y-3">
          <MetricBar label="PUE" value={metrics.pue.value} barPct={metrics.pue.barPct} tier={metrics.pue.tier} />
          <MetricBar label="WUE" value={metrics.wue.value} barPct={metrics.wue.barPct} tier={metrics.wue.tier} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Impact</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard label="CO₂ / yr" value={`${metrics.co2}t`} />
          <MetricCard label="Trees eq." value={metrics.trees.toLocaleString()} />
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${targetAchievedPct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{targetAchievedPct}% of decarbonization target achieved</div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Financials</h2>
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
        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Deployment timeline</div>
          <div className={`${MONO} mt-0.5 text-sm font-semibold text-slate-900`}>{metrics.deployment.label}</div>
          <div className="text-[11px] text-slate-400">{metrics.deployment.note}</div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Sandbox tab
// ════════════════════════════════════════════════════════════════

function SandboxView({ state, actions, metrics, financials, targetAchievedPct, selectedUpgradeId, setSelectedUpgradeId }) {
  const [draggingId, setDraggingId] = useState(null);

  function handleDragStart(e, upgrade) {
    e.dataTransfer.setData('text/plain', upgrade.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(upgrade.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  return (
    <div className="flex flex-1 gap-6 overflow-hidden">
      <UpgradePool
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
      <span className={`w-28 truncate text-xs ${isYou ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
        {peer.name}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${isYou ? 'bg-emerald-500' : ''}`}
          style={{ width: `${Math.min(100, (val / maxVal) * 100)}%`, background: isYou ? undefined : peer.color }}
        />
      </div>
      <span className={`${MONO} w-14 text-right text-xs text-slate-700`}>{val.toFixed(2)}</span>
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
    <div className="rounded-xl bg-white p-5 shadow-sm print:hidden">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">10-Year Cumulative Financial Outlook ($M)</h2>
      <p className="mb-5 text-xs text-slate-400">Year 0 shows the upfront capital hit; the dotted line marks break-even.</p>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300" />
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
            <div key={year} className={`${MONO} flex-1 text-center text-[10px] text-slate-400`}>
              Y{year}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsView({ roadmap, financials, metrics, pueBenchmark, wueBenchmark, activeRisks }) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto">
      <div className="rounded-xl bg-white p-5 shadow-sm print:hidden">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Enterprise Operational Risk &amp; Regulatory Audit</h2>
        <RiskAuditSection risks={activeRisks} />
      </div>

      <CashflowChart financials={financials} />

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Roadmap by phase</h2>
        <div className="grid grid-cols-3 gap-4">
          {roadmap.map((phase) => {
            const aggregated = aggregateUpgrades(phase.upgrades);
            return (
              <div key={phase.phase} className="rounded-xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Phase {phase.phase}</h3>
                  <span className={`${MONO} text-xs text-slate-400`}>
                    {phase.upgrades.length} item{phase.upgrades.length === 1 ? '' : 's'}
                  </span>
                </div>
                {aggregated.length === 0 ? (
                  <p className="text-xs text-slate-300">Nothing deployed in this phase yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {aggregated.map((u) => (
                      <li key={u.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                        {u.name}
                        {u.count > 1 && (
                          <span className={`${MONO} rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600`}>
                            x{u.count}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={`${MONO} mt-3 space-y-0.5 border-t border-slate-200 pt-2.5 text-[11px] text-slate-400`}>
                  <div>CapEx {formatUSD(phase.capex)}</div>
                  <div>Savings {formatUSD(phase.annualSavings)}/yr</div>
                  <div>{phase.co2}t CO₂ reduced</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Financial detail</h2>
        <div className="mb-4 grid grid-cols-4 gap-3">
          <MetricCard label="Upgrade CapEx" value={formatUSD(financials.upgradeCapex)} />
          <MetricCard label="Slot CapEx" value={formatUSD(financials.slotCapex)} />
          <MetricCard label="Carbon value" value={formatUSD(financials.carbonValue)} />
          <MetricCard label="Annual savings" value={formatUSD(financials.annualSavings)} />
        </div>
        <div className="overflow-hidden rounded-xl bg-slate-50">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Year</th>
                <th className="px-4 py-2.5">Cumulative net</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className={`${MONO} divide-y divide-slate-200`}>
              {financials.yearByYear.map((y) => (
                <tr key={y.year}>
                  <td className="px-4 py-2">{y.year}</td>
                  <td className="px-4 py-2">{formatUSD(y.cumulativeNet)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${y.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">PUE vs. industry</h3>
            <span className={`${MONO} text-xs text-emerald-600`}>beats {pueBenchmark.percentile}% of peers</span>
          </div>
          <div className="space-y-2.5">
            {PEERS_PUE.map((p) => (
              <BenchmarkRow key={p.name} peer={p} yourValue={metrics.pue.value} />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">WUE vs. industry</h3>
            <span className={`${MONO} text-xs text-emerald-600`}>beats {wueBenchmark.percentile}% of peers</span>
          </div>
          <div className="space-y-2.5">
            {PEERS_WUE.map((p) => (
              <BenchmarkRow key={p.name} peer={p} yourValue={metrics.wue.value} />
            ))}
          </div>
        </div>
      </div>

      <ModelingAssumptions className="print:hidden" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Business case tab
// ════════════════════════════════════════════════════════════════

function buildExportPayload({ state, metrics, financials, placedUpgrades, sizeLabel }) {
  const aggregated = aggregateUpgrades(placedUpgrades);
  return {
    generatedAt: new Date().toISOString(),
    facility: {
      size: sizeLabel,
      slotsDeployed: placedUpgrades.length,
      totalSlots: state.gridSlots,
    },
    upgrades: aggregated.map((u) => ({ name: u.name, id: u.id, count: u.count })),
    initialAllocation: {
      activeCapExDeployed: financials.capex,
      budgetLimit: state.budgetLimit,
      budgetCushionRemaining: state.budgetLimit - financials.capex,
    },
    operationalVelocity: {
      annualOpexSavings: financials.annualSavings,
      pue: metrics.pue.value,
      wue: metrics.wue.value,
    },
    amortization: {
      breakEvenYears: financials.breakEvenYears,
    },
    assetLifecycleYield: {
      tenYearNetReturn: financials.netAtYear10,
      yearByYear: financials.yearByYear,
    },
  };
}

function downloadExportPayload(payload, sizeLabel) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-case-${sizeLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BusinessCaseView({ state, metrics, financials, placedUpgrades, sizeLabel, activeRisks }) {
  const hasUpgrades = placedUpgrades.length > 0;
  const regionLabel = REGIONS.find((r) => r.id === state.region)?.label || state.region;
  const breakEven = financials.breakEvenYears ? `${financials.breakEvenYears.toFixed(1)} years` : 'beyond the 10-year window';
  const upgradeNames = placedUpgrades.map((u) => u.name).join(', ');

  function handleDownload() {
    const payload = buildExportPayload({ state, metrics, financials, placedUpgrades, sizeLabel });
    downloadExportPayload(payload, sizeLabel);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={handleDownload}
            disabled={!hasUpgrades}
            className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm ${hasUpgrades
                ? 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                : 'cursor-not-allowed bg-slate-50 text-slate-300 ring-1 ring-slate-100'
              }`}
          >
            Download Report Data (.json)
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Print / Export Report
          </button>
        </div>
        <div className="rounded-xl bg-white p-10 shadow-sm print:hidden">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <div className={`${MONO} text-xs uppercase tracking-widest text-slate-400`}>
              Internal Memo — Sustainability &amp; Infrastructure
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              {sizeLabel} Facility Sustainability Investment
            </h1>
          </div>

          {!hasUpgrades ? (
            <p className="text-sm text-slate-400">
              Deploy at least one upgrade in the Sandbox tab to generate a business case.
            </p>
          ) : (
            <div className="space-y-6 text-sm leading-relaxed text-slate-700">
              <p>
                This memo outlines the proposed sustainability upgrade path for the {sizeLabel.toLowerCase()} facility,
                covering {upgradeNames}.
              </p>

              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Efficiency &amp; emissions
                </h2>
                <p>
                  The facility moves to a PUE of {metrics.pue.value} and WUE of {metrics.wue.value}, cutting annual
                  emissions by {metrics.co2} metric tons of CO₂, equivalent to {metrics.trees.toLocaleString()}{' '}
                  tree-seedlings grown over ten years.
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recommendation
                </h2>
                <p>
                  Proceed with the phased rollout, prioritizing Phase 1 items for fastest payback before committing
                  capital to longer-lead infrastructure work.
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Enterprise Operational Risk &amp; Regulatory Audit
                </h2>
                <RiskAuditSection risks={activeRisks} />
              </div>

              <ModelingAssumptions />
            </div>
          )}
        </div>
      </div>

      {/* Print-only layout. Hidden on screen, fills the page on print.
          The on-screen card above is print:hidden so these two never
          both show up on paper at once. */}
      <div className="hidden print:block">
        <div className="mx-auto max-w-4xl p-8 text-black">
          <div className="mb-6 border-b-2 border-black pb-4">
            <h1 className="text-lg font-bold tracking-tight">
              EXECUTIVE LIFECYCLE BRIEF: ENTERPRISE DATA CENTER SUSTAINABILITY INITIATIVE
            </h1>
            <p className="mt-1 text-sm">
              Region: {regionLabel} &nbsp;|&nbsp; Facility Size: {sizeLabel}
            </p>
          </div>

          {!hasUpgrades ? (
            <p className="text-sm">No upgrades deployed. Return to the Sandbox tab to build a configuration first.</p>
          ) : (
            <>
              <section className="mb-6">
                <h2 className="mb-2 border-b border-black text-sm font-bold uppercase tracking-wide">
                  Capital Investment Profile
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1">Total CapEx Deployed</td>
                      <td className="py-1 text-right font-semibold">{formatUSD(financials.capex)}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Remaining Baseline Budget Allocation</td>
                      <td className="py-1 text-right font-semibold">{formatUSD(state.budgetLimit - financials.capex)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-6">
                <h2 className="mb-2 border-b border-black text-sm font-bold uppercase tracking-wide">
                  Operational Velocity Profile
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1">Total Annualized OpEx Savings</td>
                      <td className="py-1 text-right font-semibold">{formatUSD(financials.annualSavings)}</td>
                    </tr>
                    <tr>
                      <td className="py-1">Final Facility PUE</td>
                      <td className="py-1 text-right font-semibold">{metrics.pue.value}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-6">
                <h2 className="mb-2 border-b border-black text-sm font-bold uppercase tracking-wide">
                  Amortization Milestone
                </h2>
                <p className="text-sm">
                  Break-Even Threshold: <span className="font-semibold">{breakEven}</span>
                  {financials.breakEvenYears && (
                    <span className="text-xs"> (Total CapEx ÷ Annualized OpEx Savings)</span>
                  )}
                </p>
              </section>

              <section className="mb-6">
                <h2 className="mb-2 border-b border-black text-sm font-bold uppercase tracking-wide">
                  10-Year Financial Forecast
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1 text-left font-semibold">Year</th>
                      <th className="py-1 text-right font-semibold">Cumulative Net Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financials.yearByYear.map((y) => (
                      <tr key={y.year} className="border-b border-slate-300">
                        <td className="py-1">{y.year}</td>
                        <td className="py-1 text-right">{formatUSD(y.cumulativeNet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section>
                <h2 className="mb-2 border-b border-black text-sm font-bold uppercase tracking-wide">
                  Infrastructure Bill of Materials
                </h2>
                <ul className="text-sm">
                  {aggregateUpgrades(placedUpgrades).map((u) => (
                    <li key={u.id} className="border-b border-slate-200 py-1">
                      {u.name}{u.count > 1 ? ` x${u.count}` : ''}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-6 border-t border-black pt-4">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide">
                  Analytical Modeling Assumptions &amp; Methodology
                </h2>
                <ul className="space-y-1 text-xs leading-relaxed">
                  <li>• Facility utilization rate modeled at a static 70% baseline capacity.</li>
                  <li>• Base cooling infrastructure overhead calculated at 40% of baseline operational expenses (OpEx).</li>
                  <li>
                    • Regional utility rates, grid carbon intensity multipliers, and structural regulatory fees anchored
                    to projected 2026 domestic energy data.
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>
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
    <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200 print:hidden">
      <span className="font-medium">{message}</span>
      <button onClick={onDismiss} className="ml-4 text-rose-400 hover:text-rose-600" aria-label="Dismiss">
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
    <div className="flex items-center rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200 print:hidden">
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
      <div className="rounded-xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200 print:hidden">
        <p className="text-sm font-semibold text-emerald-800">
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
            className={`rounded-xl p-4 ring-1 ${isCritical
                ? 'bg-rose-50 text-rose-900 ring-rose-200'
                : 'bg-amber-50 text-amber-900 ring-amber-200'
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">{isCritical ? '🛑' : '⚠️'}</span>
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
    <div className={`rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 ${className}`}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white">
          ✓ Architecture Fully Compliant
        </span>
      </div>
    );
  }

  return (
    <div className="print:hidden">
      <button
        onClick={onViewResults}
        className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:animate-none hover:bg-amber-600"
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

  const sizeLabel = SIZES[state.sizeIdx].label;

  // placementError is a raw signal from the hook — no timers baked in there.
  // Auto-dismiss timing is a display concern, so it lives here, not in Layer 3.
  useEffect(() => {
    if (!placementError) return;
    const timer = setTimeout(() => actions.clearPlacementError(), 5000);
    return () => clearTimeout(timer);
  }, [placementError, actions]);

  return (
    <div className="flex h-screen flex-col gap-4 bg-slate-50 p-4 font-sans text-slate-900">
      {showWelcome && <WelcomeModal onStart={() => setShowWelcome(false)} />}

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      <RejectionBanner message={placementError} onDismiss={actions.clearPlacementError} />
      <CurtailmentBanner message={curtailmentWarning} />

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
  );
}