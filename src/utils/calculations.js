/**
 * Layer 2 — Derived Calculations
 * Pure functions. No DOM, no React, no global state.
 * Every formula here is copied 1:1 from the original rMetrics / rFinancials /
 * rFinSummary / rRoadmap / rBenchmarks / rBizCase functions in index.html —
 * just de-duplicated into single sources of truth.
 */

// ── Constants (verbatim from the original <script>) ──
export const BASE_PUE = 1.58;
export const BASE_WUE = 1.80;
export const MIN_PUE = 1.04;
export const MIN_WUE = 0.50;
export const MAX_CO2_PER_SLOT = 450;
export const SLOT_COST_BASE = 250000; // $250k per slot at 5MW baseline, scales with size.fm
export const TREE_SEEDLINGS_PER_TON = 16.5; // EPA: seedlings grown 10yrs per metric ton CO2
export const CARS_PER_TON = 4.29; // EPA: passenger vehicles/yr per metric ton CO2
export const TONS_PER_FLIGHT = 1.1; // ICAO: NYC-London economy roundtrip

const PHASE_DEPLOYMENT_MONTHS = { 1: 2, 2: 12, 3: 30 };
const PHASE_DEPLOYMENT_LABEL = {
  1: 'months (0–90 days)',
  2: 'months (6–18 mo)',
  3: 'months (24–36 mo)',
};

/**
 * @typedef {Object} Upgrade
 * @property {string} id
 * @property {string} name
 * @property {number} co2      - metric tons/yr at 5MW baseline
 * @property {number} capex    - dollars at 5MW baseline
 * @property {number} sav      - annual dollar savings at 5MW baseline
 * @property {number} pue      - PUE delta (negative = improvement)
 * @property {number} wue      - WUE delta (negative = improvement)
 * @property {number} phase    - 1, 2, or 3
 */

/**
 * @typedef {Object} SizeMultipliers
 * @property {number} cm - CO2 multiplier (scales co2 figures)
 * @property {number} fm - Financial/CapEx multiplier (scales capex)
 * @property {number} sm - Savings multiplier (scales sav)
 */

// ── Small shared helpers (kept private — not part of the public calc API) ──

function sum(arr, pick) {
  return arr.reduce((s, item) => s + pick(item), 0);
}

function clamp(min, max, v) {
  return Math.max(min, Math.min(max, v));
}

// ════════════════════════════════════════════════════════════════
// computeMetrics
// Mirrors: rMetrics()
// ════════════════════════════════════════════════════════════════

/**
 * @param {Upgrade[]} placedUpgrades - non-null cells from the grid
 * @param {SizeMultipliers} size
 * @param {number} gridSlots - total slot count (for progress % denominator)
 * @returns {{
 *   rawCo2: number, co2: number, trees: number,
 *   progressPct: number,
 *   pue: { value: number, barPct: number, tier: 'good'|'ok'|'bad' },
 *   wue: { value: number, barPct: number, tier: 'good'|'ok'|'bad' },
 *   deployment: { months: number|null, label: string, note: string } | null
 * }}
 */
export function computeMetrics(placedUpgrades, size, gridSlots) {
  const rawCo2 = sum(placedUpgrades, (u) => u.co2);
  const co2 = Math.round(rawCo2 * size.cm);
  const trees = Math.round(co2 * TREE_SEEDLINGS_PER_TON);

  const progressPct = clamp(
    0,
    100,
    Math.round((rawCo2 / (MAX_CO2_PER_SLOT * gridSlots)) * 100)
  );

  // PUE: lower is better. Each upgrade contributes a (usually negative) delta.
  const pueRaw = sum(placedUpgrades, (u) => u.pue);
  const pueValue = Math.max(MIN_PUE, round2(BASE_PUE + pueRaw));
  const pueBarPct = clamp(
    5,
    100,
    (1 - (pueValue - MIN_PUE) / (BASE_PUE - MIN_PUE)) * 100
  );
  const pueTier = pueValue < 1.2 ? 'good' : pueValue < 1.4 ? 'ok' : 'bad';

  // WUE: same shape as PUE, different baseline/min and tier thresholds.
  const wueRaw = sum(placedUpgrades, (u) => u.wue);
  const wueValue = Math.max(MIN_WUE, round2(BASE_WUE + wueRaw));
  const wueBarPct = clamp(
    5,
    100,
    (1 - (wueValue - MIN_WUE) / (BASE_WUE - MIN_WUE)) * 100
  );
  const wueTier = wueValue < 1.0 ? 'good' : wueValue < 1.4 ? 'ok' : 'bad';

  let deployment = null;
  if (placedUpgrades.length) {
    const maxPhase = Math.max(...placedUpgrades.map((u) => u.phase));
    deployment = {
      months: PHASE_DEPLOYMENT_MONTHS[maxPhase],
      label: PHASE_DEPLOYMENT_LABEL[maxPhase],
      note:
        maxPhase > 1
          ? 'Includes procurement & permitting'
          : 'Quick wins — fast-track approval',
    };
  }

  return {
    rawCo2,
    co2,
    trees,
    progressPct,
    pue: { value: pueValue, barPct: pueBarPct, tier: pueTier },
    wue: { value: wueValue, barPct: wueBarPct, tier: wueTier },
    deployment,
  };
}

function round2(n) {
  return +n.toFixed(2);
}

// ════════════════════════════════════════════════════════════════
// computeFinancials
// Mirrors: rFinancials() / rFinSummary() / the financial block of rBizCase()
// These three were independently re-deriving the same numbers in the
// original file — this is the single source of truth they should all call.
// ════════════════════════════════════════════════════════════════

/**
 * @param {Upgrade[]} placedUpgrades
 * @param {SizeMultipliers} size
 * @param {number} carbonPricePerTon - dollar value, e.g. 0, 50, 100, 200
 * @param {number} slotExpansionCost - cumulative $ spent on extra slot packs
 * @returns {{
 *   rawCo2: number,
 *   capex: number, upgradeCapex: number, slotCapex: number,
 *   carbonValue: number, annualSavings: number,
 *   breakEvenYears: number|null,
 *   netAtYear5: number, netAtYear10: number,
 *   yearByYear: { year: number, cumulativeNet: number, isPositive: boolean }[]
 * }}
 *
 * NOTE: `energyRate` is intentionally NOT a parameter here. In the original
 * app it's displayed next to the numbers ("energy cost $0.08/kWh") but never
 * actually multiplied into `annualSavings` — the `sav` figure on each upgrade
 * is already a precomputed annual dollar value. Reproduced faithfully rather
 * than silently "fixed," since that may have been a deliberate simplification.
 */
export function computeFinancials(
  placedUpgrades,
  size,
  carbonPricePerTon,
  slotExpansionCost
) {
  const rawCo2 = sum(placedUpgrades, (u) => u.co2);
  const upgradeCapex = sum(placedUpgrades, (u) => u.capex) * size.fm;
  const capex = upgradeCapex + slotExpansionCost;

  const carbonValue = rawCo2 * size.cm * carbonPricePerTon;
  const annualSavings = sum(placedUpgrades, (u) => u.sav) * size.sm + carbonValue;

  const breakEvenYears = annualSavings > 0 ? capex / annualSavings : null;
  const netAtYear5 = annualSavings * 5 - capex;
  const netAtYear10 = annualSavings * 10 - capex;

  const yearByYear = Array.from({ length: 10 }, (_, i) => {
    const cumulativeNet = annualSavings * (i + 1) - capex;
    return { year: i + 1, cumulativeNet, isPositive: cumulativeNet >= 0 };
  });

  return {
    rawCo2,
    capex,
    upgradeCapex,
    slotCapex: slotExpansionCost,
    carbonValue,
    annualSavings,
    breakEvenYears,
    netAtYear5,
    netAtYear10,
    yearByYear,
  };
}

// ════════════════════════════════════════════════════════════════
// computeRoadmapPhases
// Mirrors: rRoadmap()
// ════════════════════════════════════════════════════════════════

/**
 * @param {Upgrade[]} placedUpgrades
 * @param {SizeMultipliers} size
 * @param {{n: number}[]} phaseMeta - e.g. PHASE_META, just needs .n per phase
 * @returns {{
 *   phase: number,
 *   upgrades: Upgrade[],
 *   co2: number, capex: number, annualSavings: number
 * }[]}
 */
export function computeRoadmapPhases(placedUpgrades, size, phaseMeta) {
  return phaseMeta.map((ph) => {
    const items = placedUpgrades.filter((u) => u.phase === ph.n);
    return {
      phase: ph.n,
      upgrades: items,
      co2: Math.round(sum(items, (u) => u.co2) * size.cm),
      capex: sum(items, (u) => u.capex) * size.fm,
      annualSavings: sum(items, (u) => u.sav) * size.sm,
    };
  });
}

// ════════════════════════════════════════════════════════════════
// computeBenchmarkPercentile
// Mirrors: the `betterThan` / `pctile` calc inside rBenchmarks()'s benchChart()
// ════════════════════════════════════════════════════════════════

/**
 * For "lower is better" metrics (PUE, WUE): what percentage of peers does
 * "your" value beat?
 *
 * @param {{ name: string, val: number }[]} peers - excludes the "Your DC" row
 * @param {number} yourValue
 * @returns {{ betterThanCount: number, totalPeers: number, percentile: number }}
 */
export function computeBenchmarkPercentile(peers, yourValue) {
  const betterThanCount = peers.filter((p) => yourValue < p.val).length;
  const totalPeers = peers.length;
  const percentile = totalPeers
    ? Math.round((betterThanCount / totalPeers) * 100)
    : 0;
  return { betterThanCount, totalPeers, percentile };
}