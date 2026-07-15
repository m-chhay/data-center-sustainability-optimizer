import { useReducer, useMemo, useCallback, useState } from 'react';
import {
  UPG,
  SIZES,
  CPS,
  PHASE_META,
  PEERS_PUE,
  PEERS_WUE,
  REGIONS,
} from '../utils/constants.js';
import {
  computeMetrics,
  computeFinancials,
  computeRoadmapPhases,
  computeBenchmarkPercentile,
} from '../utils/calculations.js';

const BASE_SLOT_COST = 250000;
const DEFAULT_BUDGET_LIMIT = 30_000_000;
const DEFAULT_TARGET_DECARBONIZATION = 100;
const DEFAULT_REGION = 'us-west'; // Northern California — the explicit baseline in the spec

// ── Regional modeling assumptions ──
// These two numbers aren't given anywhere in the spec. They're needed to
// turn "1.1 cents/kWh" and "25% of baseline cooling cost" into real
// dollars, since nothing in this simulation has ever tracked absolute
// power draw. Both are plausible industry figures, not measured values —
// change them here if you have better numbers.
const UTILIZATION_FACTOR = 0.7; // average IT load as a fraction of rated capacity
const COOLING_SHARE_OF_OPEX = 0.4; // cooling as a fraction of total facility OpEx
const HOURS_PER_YEAR = 8760;

// ── Infrastructure rules engine ──
// Pure, stateless, no React or DOM. By this project's own layering rules
// this belongs in calculations.js next to the other pure functions, not
// here. Kept in this file because the request scoped the rules engine to
// Layer 3, but flagging the inconsistency rather than pretending it isn't
// one.
const COOLING_FOR_COMPUTE = ['liquid', 'rdhx'];
const POWER_INFRA_IDS = ['solar', 'battery'];
const COMPUTE_TO_POWER_RATIO = 3;
const SOLAR_CURTAILMENT_THRESHOLD = 2;
const CURTAILMENT_OFFSET_IDS = ['battery', 'WORKLOAD_ORCH'];

export function validatePlacement(upgradeType, placedUpgrades) {
  if (upgradeType === 'AI_COMPUTE_RACK') {
    const hasCooling = placedUpgrades.some((u) => COOLING_FOR_COMPUTE.includes(u.id));
    if (!hasCooling) {
      return {
        allowed: false,
        reason: 'Thermal Throttling Risk: Insufficient cooling capacity to support high-density compute infrastructure.',
      };
    }

    const computeCountAfter = placedUpgrades.filter((u) => u.id === 'AI_COMPUTE_RACK').length + 1;
    const requiredPower = Math.floor(computeCountAfter / COMPUTE_TO_POWER_RATIO);
    const powerCount = placedUpgrades.filter((u) => POWER_INFRA_IDS.includes(u.id)).length;
    if (powerCount < requiredPower) {
      return {
        allowed: false,
        reason: 'Electrical Envelope Exceeded: Provision additional power routing or on-site energy storage assets.',
      };
    }

    const hasSlab = placedUpgrades.some((u) => u.id === 'SLAB_RETROFIT');
    if (!hasSlab) {
      return {
        allowed: false,
        reason: 'Structural Load Warning: High-density compute array exceeds slab weight limitations. Reinforce structural framework first.',
      };
    }
  }

  if (upgradeType === 'aithermal') {
    const hasTelemetry = placedUpgrades.some((u) => u.id === 'iot');
    if (!hasTelemetry) {
      return {
        allowed: false,
        reason: 'Telemetry Core Missing: AI optimization software layer requires an active IoT Environmental Sensor Grid.',
      };
    }
  }

  if (upgradeType === 'AIR_CHILLER') {
    const hasWaterOffset = placedUpgrades.some((u) => u.id === 'GREYWATER_REC');
    if (!hasWaterOffset) {
      return {
        allowed: false,
        reason: 'Environmental Resource Conflict: Evaporative cooling capacity requires dedicated water infrastructure offsets.',
      };
    }
  }

  return { allowed: true, reason: null };
}

// Rule F isn't a placement gate — it doesn't block anything going onto the
// canvas. It retroactively halves the sav/co2 yield of every solar array
// past the second one, whenever there's no BESS or workload orchestration
// active to absorb the excess generation. This runs on the already-placed
// list before it reaches computeMetrics/computeFinancials, so those two
// functions never need to know curtailment exists — they just sum whatever
// list they're handed, same as always.
export function applyGridCurtailment(placedUpgrades) {
  const solarCount = placedUpgrades
    .filter((u) => u.id === 'solar')
    .reduce((total, u) => total + (u.qty || 1), 0);
  const hasOffset = placedUpgrades.some((u) => CURTAILMENT_OFFSET_IDS.includes(u.id));

  if (solarCount <= SOLAR_CURTAILMENT_THRESHOLD || hasOffset) {
    return { effectiveUpgrades: placedUpgrades, curtailmentActive: false };
  }

  let solarSeen = 0;
  const effectiveUpgrades = placedUpgrades.map((u) => {
    if (u.id !== 'solar') return u;
    const qty = u.qty || 1;
    const fullYieldUnits = Math.max(
      0,
      Math.min(qty, SOLAR_CURTAILMENT_THRESHOLD - solarSeen)
    );
    const curtailedUnits = qty - fullYieldUnits;
    solarSeen += qty;
    if (curtailedUnits === 0) return u;

    // Calculations multiply these per-unit values by qty. Reduce the
    // per-unit yield so the first two arrays remain at full output and only
    // subsequent arrays are curtailed to 50%.
    const effectiveYieldFactor =
      (fullYieldUnits + curtailedUnits * 0.5) / qty;
    return {
      ...u,
      sav: u.sav * effectiveYieldFactor,
      co2: u.co2 * effectiveYieldFactor,
    };
  });

  return { effectiveUpgrades, curtailmentActive: true };
}

const CURTAILMENT_WARNING =
  'Grid Curtailment Warning: Excess clean generation is being throttled by the utility. Deploy BESS or Workload Orchestration to unlock full ROI.';

// ── Regional modeling ──
// Two kinds of effect here, and they're handled differently on purpose:
//
// Multiplicative effects on a REAL upgrade's own numbers (Virginia's carbon
// intensity multiplier, Phoenix's solar bonus) get applied by mapping over
// the actual placed-upgrade list, same pattern as grid curtailment.
//
// Effects that don't belong to any specific placed upgrade (a power tax, a
// cooling-cost penalty, a PUE spike from heat) get expressed as synthetic
// "pseudo-upgrade" line items with phase: 0. They flow through the exact
// same computeMetrics/computeFinancials math as everything else — no
// special-casing inside calculations.js — and phase: 0 means
// computeRoadmapPhases silently excludes them from every phase bucket, so
// they never show up as a fake deployed asset in the roadmap or the bill
// of materials. They only ever show up in the totals.
//
// This runs in two passes because the OpEx/PUE pseudo-effects need a PUE
// value to compute kWh from, and PUE is itself an output of computeMetrics.
// Pass 1 runs computeMetrics on the curtailment+multiplier-adjusted list to
// get a baseline PUE. Pass 2 uses that baseline to build the pseudo-upgrades,
// appends them, and computeMetrics/computeFinancials run again for real.

export function computeBaselineAnnualKwh(sizeMw, pueValue) {
  return sizeMw * 1000 * HOURS_PER_YEAR * UTILIZATION_FACTOR * pueValue;
}

export function applyRegionalUpgradeMultipliers(upgrades, regionId) {
  return upgrades.map((u) => {
    let sav = u.sav;
    let co2 = u.co2;

    if (regionId === 'us-east') {
      // Higher grid carbon intensity means every ton of on-site reduction
      // offsets more actual emissions — modeled as a straight 1.4x credit
      // multiplier on every real upgrade's co2 contribution.
      co2 = co2 * 1.4;
    }

    if (regionId === 'us-southwest' && u.id === 'solar') {
      sav = sav * 1.3;
      co2 = co2 * 1.3;
    }

    if (sav === u.sav && co2 === u.co2) return u;
    return { ...u, sav, co2 };
  });
}

export function buildRegionalPseudoUpgrades(upgrades, regionId, size, energyRate, preliminaryPueValue) {
  const pseudoUpgrades = [];
  const hasCoolingForRack = upgrades.some((u) => COOLING_FOR_COMPUTE.includes(u.id));
  const hasRack = upgrades.some((u) => u.id === 'AI_COMPUTE_RACK');
  const hasAirChiller = upgrades.some((u) => u.id === 'AIR_CHILLER');
  const hasGreywater = upgrades.some((u) => u.id === 'GREYWATER_REC');

  const baselineKwh = computeBaselineAnnualKwh(size.mw, preliminaryPueValue);
  const baselineOpexCost = baselineKwh * energyRate;
  const coolingCostShare = baselineOpexCost * COOLING_SHARE_OF_OPEX;

  if (regionId === 'us-east') {
    // Exact rate given in the spec — the only dollar figure here that
    // isn't an assumption. sav is negative because this is a cost, not a
    // saving.
    pseudoUpgrades.push({
      id: 'region-va-power-tax', name: 'VA 2026 Power Tax', capex: 0,
      sav: -(baselineKwh * 0.011), co2: 0, pue: 0, wue: 0, phase: 0,
    });
  }

  if (regionId === 'us-central') {
    // 10% off total upgrade CapEx, expressed as a negative-capex line item
    // in the same pre-size-multiplier units computeFinancials already sums
    // everything else in, so it gets the same size.fm scaling as every
    // real upgrade rather than needing a separate post-hoc adjustment.
    const rawUpgradeCapexSum = upgrades.reduce((sum, u) => sum + u.capex, 0);
    pseudoUpgrades.push({
      id: 'region-tx-capex-rebate', name: 'TX Lower Construction Cost', capex: -(rawUpgradeCapexSum * 0.1),
      sav: 0, co2: 0, pue: 0, wue: 0, phase: 0,
    });

    // "20% more cooling power" is modeled as a 20% increase in the
    // *overhead* portion of PUE (the amount above 1.0, i.e. non-IT power)
    // rather than 20% of the whole PUE number — a PUE of 1.5 has 0.5 of
    // overhead, and that's the part heat waves actually make worse.
    const overhead = preliminaryPueValue - 1.0;
    pseudoUpgrades.push({
      id: 'region-tx-heat-load', name: 'TX Summer Heat Load', capex: 0, sav: 0, co2: 0,
      pue: overhead * 0.2, wue: 0, phase: 0,
    });
  }

  if (regionId === 'us-southwest' && hasAirChiller && !hasGreywater) {
    pseudoUpgrades.push({
      id: 'region-az-water-penalty', name: 'AZ Water Scarcity Penalty', capex: 0,
      sav: -(coolingCostShare * 0.25), co2: 0, pue: 0, wue: 0, phase: 0,
    });
  }

  if (regionId === 'us-midwest') {
    pseudoUpgrades.push({
      id: 'region-il-free-cooling', name: 'IL Free-Cooling Credit', capex: 0,
      sav: coolingCostShare * 0.25, co2: 0, pue: 0, wue: 0, phase: 0,
    });
  }

  if (hasRack && !hasCoolingForRack) {
    // Only reachable if cooling got removed after the rack was already
    // placed — placement itself is already gated on cooling being present.
    pseudoUpgrades.push({
      id: 'region-rack-thermal-spike', name: 'Uncooled Compute Thermal Spike', capex: 0,
      sav: 0, co2: 0, pue: 0.4, wue: 0, phase: 0,
    });
  }

  return pseudoUpgrades;
}

function createInitialState({ defaultSizeIdx = 1, initialSlots = 8, defaultRegion = DEFAULT_REGION } = {}) {
  return {
    grid: Array(initialSlots).fill(null),
    gridSlots: initialSlots,
    slotExpansionCost: 0,
    sizeIdx: defaultSizeIdx,
    carbonPriceIdx: 0,
    energyRate: 0.08,
    sortKey: 'phase',
    qty: {},
    darkForced: null,
    budgetLimit: DEFAULT_BUDGET_LIMIT,
    targetDecarbonization: DEFAULT_TARGET_DECARBONIZATION,
    region: defaultRegion,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'PLACE_UPGRADE': {
      const { slotIndex, upgrade } = action;
      if (slotIndex < 0 || slotIndex >= state.grid.length) return state;
      const grid = state.grid.slice();
      grid[slotIndex] = upgrade;
      return { ...state, grid };
    }

    case 'REMOVE_UPGRADE': {
      const { slotIndex } = action;
      if (slotIndex < 0 || slotIndex >= state.grid.length) return state;
      const grid = state.grid.slice();
      grid[slotIndex] = null;
      return { ...state, grid };
    }

    case 'SWAP_SLOTS': {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 ||
        fromIndex >= state.grid.length ||
        toIndex < 0 ||
        toIndex >= state.grid.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const grid = state.grid.slice();
      [grid[fromIndex], grid[toIndex]] = [grid[toIndex], grid[fromIndex]];
      return { ...state, grid };
    }

    case 'EXPAND_GRID':
      return {
        ...state,
        grid: [...state.grid, null],
        gridSlots: state.gridSlots + 1,
        slotExpansionCost: state.slotExpansionCost + BASE_SLOT_COST,
      };

    case 'SHRINK_GRID': {
      if (state.gridSlots <= 1) return state;
      const removedSlotWasEmpty = state.grid[state.grid.length - 1] === null;
      return {
        ...state,
        grid: state.grid.slice(0, -1),
        gridSlots: state.gridSlots - 1,
        slotExpansionCost: Math.max(
          0,
          state.slotExpansionCost - (removedSlotWasEmpty ? BASE_SLOT_COST : 0)
        ),
      };
    }

    case 'SET_SIZE':
      return { ...state, sizeIdx: action.sizeIdx };

    case 'SET_REGION':
      return { ...state, region: action.region };

    case 'SET_CARBON_PRICE':
      return { ...state, carbonPriceIdx: action.carbonPriceIdx };

    case 'SET_ENERGY_RATE':
      return { ...state, energyRate: action.energyRate };

    case 'SET_SORT_KEY':
      return { ...state, sortKey: action.sortKey };

    case 'SET_QTY': {
      const { upgradeId, delta } = action;
      const current = state.qty[upgradeId] || 1;
      const next = Math.max(1, Math.min(state.gridSlots, current + delta));
      if (next === current) return state;
      return { ...state, qty: { ...state.qty, [upgradeId]: next } };
    }

    case 'SET_DARK_FORCED':
      return { ...state, darkForced: action.darkForced };

    case 'SET_BUDGET_LIMIT':
      return { ...state, budgetLimit: action.budgetLimit };

    case 'SET_TARGET_DECARBONIZATION':
      return { ...state, targetDecarbonization: action.targetDecarbonization };

    case 'RESET':
      return createInitialState(action.config);

    default:
      return state;
  }
}

export function useGameState(config) {
  const [state, dispatch] = useReducer(reducer, config, createInitialState);

  const [isOverBudget, setIsOverBudget] = useState(false);
  const [placementError, setPlacementError] = useState(null);

  const size = SIZES[state.sizeIdx];
  const carbonPricePerTon = CPS[state.carbonPriceIdx].v;
  const placedUpgrades = useMemo(
    () => state.grid.filter((cell) => cell !== null),
    [state.grid]
  );

  // placedUpgrades stays raw — the grid, the catalog aggregation, and the
  // business case export all need the actual physical assets deployed, not
  // a curtailed version. Only the numbers that feed the sidebar and the
  // financial/roadmap views go through the curtailment adjustment.
  const { effectiveUpgrades, curtailmentActive } = useMemo(
    () => applyGridCurtailment(placedUpgrades),
    [placedUpgrades]
  );

  const regionMultipliedUpgrades = useMemo(
    () => applyRegionalUpgradeMultipliers(effectiveUpgrades, state.region),
    [effectiveUpgrades, state.region]
  );

  // Pass 1: a preliminary PUE from real placed upgrades only, before any
  // regional pseudo-effects exist. Needed because the pseudo-effects below
  // (kWh-based OpEx costs, the heat-load PUE bump) depend on a PUE value,
  // and PUE is itself computed by computeMetrics.
  const preliminaryMetrics = useMemo(
    () => computeMetrics(regionMultipliedUpgrades, size, state.gridSlots),
    [regionMultipliedUpgrades, size, state.gridSlots]
  );

  const regionalPseudoUpgrades = useMemo(
    () =>
      buildRegionalPseudoUpgrades(
        regionMultipliedUpgrades,
        state.region,
        size,
        state.energyRate,
        preliminaryMetrics.pue.value
      ),
    [regionMultipliedUpgrades, state.region, size, state.energyRate, preliminaryMetrics.pue.value]
  );

  // Pass 2: the real, final list. Everything downstream — sidebar, results,
  // roadmap, benchmarks, the printable brief — reads from this, not the
  // preliminary pass above.
  const finalUpgradeList = useMemo(
    () => [...regionMultipliedUpgrades, ...regionalPseudoUpgrades],
    [regionMultipliedUpgrades, regionalPseudoUpgrades]
  );

  const metrics = useMemo(
    () => computeMetrics(finalUpgradeList, size, state.gridSlots),
    [finalUpgradeList, size, state.gridSlots]
  );

  const financials = useMemo(
    () =>
      computeFinancials(
        finalUpgradeList,
        size,
        carbonPricePerTon,
        state.slotExpansionCost
      ),
    [finalUpgradeList, size, carbonPricePerTon, state.slotExpansionCost]
  );

  const roadmap = useMemo(
    () => computeRoadmapPhases(finalUpgradeList, size, PHASE_META),
    [finalUpgradeList, size]
  );

  // Real physical assets only — same list the grid, aggregation, and export
  // already use. Not finalUpgradeList, that one's got synthetic pseudo-
  // upgrades mixed in for the math, and a risk audit should talk about
  // what's actually deployed, not background financial line items.
  const activeRisks = useMemo(() => {
    const risks = [];

    if (curtailmentActive) {
      risks.push({
        id: 'grid-power',
        severity: 'WARNING',
        title: 'Grid Power Risk',
        message: CURTAILMENT_WARNING,
      });
    }

    const hasCoolingForRack = placedUpgrades.some((u) => COOLING_FOR_COMPUTE.includes(u.id));
    const hasRack = placedUpgrades.some((u) => u.id === 'AI_COMPUTE_RACK');
    if (hasRack && !hasCoolingForRack) {
      risks.push({
        id: 'resilience',
        severity: 'CRITICAL',
        title: 'Resilience Risk',
        message:
          'Uncooled Compute Thermal Spike: high-density compute is running without Liquid Cooling or a Rear Door Heat Exchanger. Facility PUE is degraded and hardware failure risk is elevated.',
      });
    }

    if (state.region === 'us-southwest') {
      const hasAirChiller = placedUpgrades.some((u) => u.id === 'AIR_CHILLER');
      const hasGreywater = placedUpgrades.some((u) => u.id === 'GREYWATER_REC');
      if (hasAirChiller && !hasGreywater) {
        risks.push({
          id: 'phoenix-water',
          severity: 'PENALTY',
          title: 'Phoenix Water Risk',
          message:
            'Environmental Resource Conflict: evaporative cooling is active without a Greywater Reclamation System. A 25% utility pricing penalty is being applied to baseline cooling costs.',
        });
      }
    }

    return risks;
  }, [placedUpgrades, state.region, curtailmentActive]);

  const pueBenchmark = useMemo(
    () =>
      computeBenchmarkPercentile(
        PEERS_PUE.filter((p) => !p.you),
        metrics.pue.value
      ),
    [metrics.pue.value]
  );

  const wueBenchmark = useMemo(
    () =>
      computeBenchmarkPercentile(
        PEERS_WUE.filter((p) => !p.you),
        metrics.wue.value
      ),
    [metrics.wue.value]
  );

  const targetAchievedPct = useMemo(() => {
    if (!state.targetDecarbonization) return 0;
    return Math.min(
      100,
      Math.round((metrics.progressPct / state.targetDecarbonization) * 100)
    );
  }, [metrics.progressPct, state.targetDecarbonization]);

  const placeUpgrade = useCallback(
    (slotIndex, upgradeType, requestedQty = 1) => {
      const upgrade = UPG.find((u) => u.id === upgradeType);
      if (!upgrade) {
        console.error(`placeUpgrade: "${upgradeType}" is not a known upgrade id`);
        return;
      }
      if (slotIndex < 0 || slotIndex >= state.grid.length) return;
      if (state.grid[slotIndex] !== null) return;

      const ruleCheck = validatePlacement(upgradeType, placedUpgrades);
      if (!ruleCheck.allowed) {
        setPlacementError(ruleCheck.reason);
        return;
      }

      const qty = Math.max(1, Math.min(state.gridSlots, Number(requestedQty) || 1));
      const prospectiveUpgradeCapex = financials.upgradeCapex + upgrade.capex * qty * size.fm;
      const prospectiveTotalCapex = prospectiveUpgradeCapex + state.slotExpansionCost;

      if (prospectiveTotalCapex > state.budgetLimit) {
        setIsOverBudget(true);
        setPlacementError('Budget Exceeded: this placement would push total CapEx past your configured limit.');
        return;
      }

      setIsOverBudget(false);
      setPlacementError(null);
      dispatch({ type: 'PLACE_UPGRADE', slotIndex, upgrade: { ...upgrade, qty } });
    },
    [state.grid, state.slotExpansionCost, state.budgetLimit, placedUpgrades, financials.upgradeCapex, size.fm]
  );

  const removeUpgrade = useCallback(
    (slotIndex) => {
      if (slotIndex < 0 || slotIndex >= state.grid.length) return;
      const removed = state.grid[slotIndex];
      dispatch({ type: 'REMOVE_UPGRADE', slotIndex });
      if (!removed) return;

      const newUpgradeCapex = financials.upgradeCapex - removed.capex * (removed.qty || 1) * size.fm;
      const newTotalCapex = newUpgradeCapex + state.slotExpansionCost;
      if (newTotalCapex <= state.budgetLimit) setIsOverBudget(false);
    },
    [state.grid, state.slotExpansionCost, state.budgetLimit, financials.upgradeCapex, size.fm]
  );

  const clearPlacementError = useCallback(() => setPlacementError(null), []);

  const actions = {
    placeUpgrade,
    removeUpgrade,
    validatePlacement,
    clearPlacementError,
    swapSlots: useCallback(
      (fromIndex, toIndex) => dispatch({ type: 'SWAP_SLOTS', fromIndex, toIndex }),
      []
    ),
    expandGrid: useCallback(() => dispatch({ type: 'EXPAND_GRID' }), []),
    shrinkGrid: useCallback(() => dispatch({ type: 'SHRINK_GRID' }), []),
    setSize: useCallback((sizeIdx) => dispatch({ type: 'SET_SIZE', sizeIdx }), []),
    setRegion: useCallback((region) => dispatch({ type: 'SET_REGION', region }), []),
    setCarbonPrice: useCallback(
      (carbonPriceIdx) => dispatch({ type: 'SET_CARBON_PRICE', carbonPriceIdx }),
      []
    ),
    setEnergyRate: useCallback(
      (energyRate) => dispatch({ type: 'SET_ENERGY_RATE', energyRate }),
      []
    ),
    setSortKey: useCallback(
      (sortKey) => dispatch({ type: 'SET_SORT_KEY', sortKey }),
      []
    ),
    setQty: useCallback(
      (upgradeId, delta) => dispatch({ type: 'SET_QTY', upgradeId, delta }),
      []
    ),
    setDarkForced: useCallback(
      (darkForced) => dispatch({ type: 'SET_DARK_FORCED', darkForced }),
      []
    ),
    setBudgetLimit: useCallback(
      (budgetLimit) => dispatch({ type: 'SET_BUDGET_LIMIT', budgetLimit }),
      []
    ),
    setTargetDecarbonization: useCallback(
      (targetDecarbonization) =>
        dispatch({ type: 'SET_TARGET_DECARBONIZATION', targetDecarbonization }),
      []
    ),
    reset: useCallback(() => dispatch({ type: 'RESET', config }), [config]),
  };

  return {
    state,
    placedUpgrades,
    metrics,
    financials,
    roadmap,
    pueBenchmark,
    wueBenchmark,
    targetAchievedPct,
    isOverBudget,
    placementError,
    curtailmentActive,
    curtailmentWarning: curtailmentActive ? CURTAILMENT_WARNING : null,
    activeRisks,
    actions,
  };
}

export function getQty(state, upgradeId) {
  return state.qty[upgradeId] || 1;
}
