// Layer 1 — Static Constants
// Raw data only. No functions, no derived values.
// Pulled verbatim from the original <script> block (SIZES, CPS, TC, TC_DARK,
// UPG, PEERS_PUE, PEERS_WUE, PHASE_META).

export const SIZES = [
  { id: 'edge', label: 'Edge', sub: '~1 MW', mw: 1, cm: 0.20, fm: 0.28, sm: 0.19 },
  { id: 'mid', label: 'Mid-size', sub: '~5 MW', mw: 5, cm: 1, fm: 1, sm: 1 },
  { id: 'large', label: 'Large', sub: '~20 MW', mw: 20, cm: 4, fm: 3.4, sm: 4.1 },
  { id: 'hyper', label: 'Hyperscale', sub: '~100 MW', mw: 100, cm: 20, fm: 14, sm: 22 },
];

export const REGIONS = [
  { id: 'us-west', label: 'US-West (Northern California - Silicon Valley Hub)' },
  { id: 'us-east', label: 'US-East (Northern Virginia - Data Center Alley)' },
  { id: 'us-central', label: 'US-Central (Dallas, TX - Low Cost, High Thermal Load)' },
  { id: 'us-southwest', label: 'US-Southwest (Phoenix, AZ - Maximum Solar, Water Scarce)' },
  { id: 'us-midwest', label: 'US-Midwest (Chicago, IL - Free-Cooling Climate)' },
];

export const CPS = [
  { l: 'None', v: 0 },
  { l: '$50/t', v: 50 },
  { l: '$100/t', v: 100 },
  { l: '$200/t', v: 200 },
];

// Tag colors: [background, text] per theme.
export const TC = {
  'Scope 2': ['#e6f0fa', '#0f4a8a'],
  'Scope 3': ['#ede8ff', '#5c3daa'],
  CSRD: ['#ede8ff', '#5c3daa'],
  'ISO 50001': ['#e0f5ef', '#0f5a45'],
  RE100: ['#e8f4e1', '#2d6a1f'],
  'SEC Climate': ['#fef3dc', '#8a5a00'],
  'Grid Resilience': ['#fef3dc', '#7a4a00'],
  'Circular Economy': ['#fdeaea', '#9a2020'],
};

export const TC_DARK = {
  'Scope 2': ['#102040', '#7ab0e8'],
  'Scope 3': ['#1e1438', '#b898e8'],
  CSRD: ['#1e1438', '#b898e8'],
  'ISO 50001': ['#102a20', '#7ecfa8'],
  RE100: ['#122010', '#80c860'],
  'SEC Climate': ['#281800', '#d4a840'],
  'Grid Resilience': ['#281800', '#c89030'],
  'Circular Economy': ['#280808', '#e07070'],
};

export const UPG = [
  {
    id: 'solar', name: 'Solar Array', abbr: 'SOL', co2: 450,
    bg: '#F5B84A', tc: '#3d2600', capex: 3500000, sav: 700000,
    pue: 0, wue: 0, phase: 3, cplx: 'H', time: '24–36 months', scope3: false,
    tags: ['Scope 2', 'RE100', 'CSRD', 'SEC Climate'],
    why: 'Eliminates purchased electricity carbon (Scope 2). Solar PPAs can reduce CapEx to $0.',
    cnote: 'Requires site survey, utility interconnection, permitting, and 2–3 year construction.',
  },
  {
    id: 'liquid', name: 'Liquid Cooling', abbr: 'LQD', co2: 280,
    bg: '#5B9FD4', tc: '#04244a', capex: 1200000, sav: 480000,
    pue: -0.08, wue: -0.15, phase: 2, cplx: 'H', time: '12–24 months', scope3: false,
    tags: ['ISO 50001', 'CSRD'],
    why: 'Reduces cooling energy 10–18%, lowers water evaporation vs. air cooling.',
    cnote: 'Requires infrastructure retrofit; potential downtime during installation. Plan around maintenance windows.',
  },
  {
    id: 'virtual', name: 'Server Virtualization', abbr: 'VRT', co2: 320,
    bg: '#8B7FD4', tc: '#1a1040', capex: 400000, sav: 520000,
    pue: -0.03, wue: -0.05, phase: 1, cplx: 'L', time: '1–6 months', scope3: true,
    tags: ['CSRD', 'SEC Climate'],
    why: 'Reduces physical server count, cutting compute energy and hardware manufacturing emissions (Scope 3).',
    cnote: 'Lowest complexity. Can start immediately with existing hypervisor licenses. Strong quick-win ROI.',
  },
  {
    id: 'battery', name: 'Battery Storage', abbr: 'BAT', co2: 180,
    bg: '#6DC05A', tc: '#0f2c06', capex: 2000000, sav: 250000,
    pue: 0, wue: 0, phase: 3, cplx: 'H', time: '12–24 months', scope3: false,
    tags: ['Scope 2', 'Grid Resilience'],
    why: 'Enables renewable time-shifting and reduces demand charges. Provides resilience against grid outages.',
    cnote: 'Longer payback (~8 yrs) but provides critical grid independence and supports RE100 compliance.',
  },
  {
    id: 'freeair', name: 'Free Air Cooling', abbr: 'AIR', co2: 200,
    bg: '#4BBFAA', tc: '#04302a', capex: 600000, sav: 340000,
    pue: -0.10, wue: -0.25, phase: 2, cplx: 'M', time: '6–12 months', scope3: false,
    tags: ['ISO 50001', 'CSRD'],
    why: 'Eliminates or reduces mechanical chilling using ambient air. Best ROI in temperate climates.',
    cnote: 'Climate-dependent — most effective in northern latitudes. Assess local weather patterns before committing.',
  },
  {
    id: 'pdu', name: 'Smart PDU', abbr: 'PDU', co2: 150,
    bg: '#E8845A', tc: '#3a1000', capex: 200000, sav: 180000,
    pue: -0.03, wue: -0.02, phase: 1, cplx: 'L', time: '1–3 months', scope3: false,
    tags: ['ISO 50001'],
    why: 'Granular load monitoring eliminates idle draw and enables real-time power optimization.',
    cnote: 'Lowest upfront cost and fastest installation. Excellent standalone quick win. Pairs well with virtualization.',
  },
  {
    id: 'ai', name: 'AI Load Balancing', abbr: 'A.I', co2: 240,
    bg: '#D484A8', tc: '#2a0820', capex: 380000, sav: 380000,
    pue: -0.05, wue: -0.08, phase: 2, cplx: 'M', time: '6–12 months', scope3: false,
    tags: ['CSRD', 'SEC Climate'],
    why: 'Intelligent workload scheduling improves server utilization and coordinates cooling for 10–12% total energy reduction.',
    cnote: 'Requires integration with existing DCIM and orchestration systems. Medium implementation complexity.',
  },
  {
    id: 'heat', name: 'Heat Recovery', abbr: 'REC', co2: 120,
    bg: '#9E9E90', tc: '#202018', capex: 700000, sav: 160000,
    pue: -0.02, wue: -0.05, phase: 2, cplx: 'M', time: '12–18 months', scope3: false,
    tags: ['CSRD', 'Circular Economy'],
    why: 'Captures waste heat from liquid-cooled racks for building heating, reducing district energy consumption.',
    cnote: 'Requires heat demand on-site or nearby. Most effective in cold climates with nearby buildings to supply.',
  },
  {
    id: 'rdhx', name: 'Rear Door Heat Exchangers', abbr: 'RDX', co2: 180,
    bg: '#3F8FBF', tc: '#02222E', capex: 800000, sav: 320000,
    pue: -0.06, wue: -0.10, phase: 2, cplx: 'M', time: '6–12 months', scope3: false,
    tags: ['ISO 50001'],
    why: 'Rack-level heat exchange handles high-density thermal load without a full liquid cooling retrofit.',
    cnote: 'Satisfies the cooling prerequisite for high-density compute racks, same as full liquid cooling.',
  },
  {
    id: 'iot', name: 'IoT Environmental Sensor Grid', abbr: 'IOT', co2: 60,
    bg: '#7FAE5E', tc: '#132608', capex: 150000, sav: 90000,
    pue: -0.01, wue: -0.01, phase: 1, cplx: 'L', time: '1–3 months', scope3: false,
    tags: ['ISO 50001'],
    why: 'Distributed thermal and power sensors provide the live telemetry stream optimization software depends on.',
    cnote: 'Prerequisite for AI Thermal Optimization Engine — that software has no data to act on without this deployed first.',
  },
  {
    id: 'aithermal', name: 'AI Thermal Optimization Engine', abbr: 'ATO', co2: 140,
    bg: '#B98CD6', tc: '#2A1638', capex: 260000, sav: 300000,
    pue: -0.04, wue: -0.03, phase: 2, cplx: 'M', time: '3–6 months', scope3: false,
    tags: ['CSRD', 'SEC Climate'],
    why: 'Dynamically retunes cooling setpoints from live sensor data, distinct from AI Load Balancing which schedules compute workloads.',
    cnote: 'Requires an active IoT Environmental Sensor Grid — placement is blocked without one.',
  },
  {
    id: 'AIR_CHILLER', name: 'Traditional Air Cooling Chiller', abbr: 'ACH', co2: 10,
    bg: '#8FA3B0', tc: '#122028', capex: 1200000, sav: 150000,
    pue: -0.02, wue: 0.15, phase: 2, cplx: 'M', time: '6–12 months', scope3: false,
    category: 'cooling', coolingType: 'air', wueImpact: 'high',
    tags: ['ISO 50001'],
    why: 'Evaporative cooling at scale drives water use up sharply — the wue delta here is positive (worse), not a typo.',
    cnote: 'Gated by the rules engine: needs a Greywater Reclamation System present to offset water draw.',
  },
  {
    id: 'GREYWATER_REC', name: 'Greywater Reclamation System', abbr: 'GWR', co2: 0,
    bg: '#5E9E8F', tc: '#0A2420', capex: 800000, sav: 50000,
    pue: 0, wue: -0.20, phase: 1, cplx: 'M', time: '3–6 months', scope3: false,
    category: 'water',
    tags: ['ISO 50001'],
    why: 'Recycles greywater for cooling makeup, offsetting the water draw of evaporative systems.',
    cnote: 'Prerequisite for Traditional Air Cooling Chiller under the water infrastructure rule.',
  },
  {
    id: 'AI_COMPUTE_RACK', name: 'Ultra-Dense AI Compute Cluster', abbr: 'UDC', co2: -15,
    bg: '#3A3A42', tc: '#F0F0F0', capex: 2500000, sav: -100000,
    pue: 0.08, wue: 0.03, phase: 3, cplx: 'H', time: '6–12 months', scope3: false,
    category: 'compute', density: 'high', weightClass: 'heavy',
    tags: ['Grid Resilience'],
    why: 'GPU-dense cluster. Adds heat load and power draw rather than reducing it — this is a demand asset, not an efficiency upgrade.',
    cnote: 'The one high-density compute item in the catalog. Gated on three fronts: needs cooling present, a 3:1 compute-to-power ratio, and a slab retrofit for structural load.',
  },
  {
    id: 'SLAB_RETROFIT', name: 'Solid Slab Floor Retrofitting', abbr: 'SLB', co2: 0,
    bg: '#A6A296', tc: '#1E1C16', capex: 600000, sav: 0,
    pue: 0, wue: 0, phase: 3, cplx: 'H', time: '3–6 months', scope3: false,
    category: 'structural',
    tags: [],
    why: 'Reinforces raised-floor slab load rating ahead of deploying heavy compute hardware.',
    cnote: 'Prerequisite for Ultra-Dense AI Compute Cluster under the structural load rule.',
  },
  {
    id: 'WORKLOAD_ORCH', name: 'Virtualization & Workload Orchestration Software', abbr: 'WLO', co2: 15,
    bg: '#6E8FBF', tc: '#0E1E32', capex: 300000, sav: 500000,
    pue: -0.03, wue: -0.02, phase: 1, cplx: 'M', time: '3–6 months', scope3: true,
    category: 'software',
    tags: ['CSRD', 'SEC Climate'],
    why: 'Dynamic workload placement across the fleet, distinct from AI Load Balancing — also counts as a curtailment offset for excess solar.',
    cnote: 'One of two ways to unlock full solar ROI past the second array under the grid curtailment rule.',
  },
  {
    id: 'GEOTHERMAL_COOL', name: 'Geothermal Deep-Well Closed-Loop Sink', abbr: 'GEO', co2: 40,
    bg: '#B0704A', tc: '#2A1206', capex: 4000000, sav: 1200000,
    pue: -0.12, wue: -0.30, phase: 3, cplx: 'H', time: '24–36 months', scope3: false,
    category: 'cooling',
    tags: ['ISO 50001', 'RE100'],
    why: 'Deep-well closed-loop thermal sink for large-scale rejection, no evaporative water loss.',
    cnote: 'Highest capex and longest lead time in the catalog, but the deepest PUE and WUE improvement of any cooling option.',
  },
];

export const PEERS_PUE = [
  { name: 'Google', val: 1.10, color: '#4285F4' },
  { name: 'Microsoft', val: 1.18, color: '#00A4EF' },
  { name: 'Apple', val: 1.20, color: '#555' },
  { name: 'AWS', val: 1.22, color: '#FF9900' },
  { name: 'Industry avg', val: 1.58, color: '#aaa' },
  { name: 'Your DC', val: null, color: '#2d6a1f', you: true },
];

export const PEERS_WUE = [
  { name: 'Google', val: 1.10, color: '#4285F4' },
  { name: 'Microsoft', val: 1.12, color: '#00A4EF' },
  { name: 'AWS', val: 1.35, color: '#FF9900' },
  { name: 'Industry avg', val: 1.80, color: '#aaa' },
  { name: 'Your DC', val: null, color: '#2d6a1f', you: true },
];

export const PHASE_META = [
  {
    n: 1, label: 'Phase 1', sub: 'Quick Wins', time: '0–90 days',
    bg: '#e8f4e1', bc: '#2d6a1f', tc: '#2d6a1f',
    desc: 'High-ROI, low-disruption changes that can be approved and deployed quickly with minimal capital.',
  },
  {
    n: 2, label: 'Phase 2', sub: 'Infrastructure', time: '6–18 months',
    bg: '#e6f0fa', bc: '#0f4a8a', tc: '#0f4a8a',
    desc: 'Infrastructure upgrades requiring planning, procurement, and scheduled maintenance windows.',
  },
  {
    n: 3, label: 'Phase 3', sub: 'Capital Projects', time: '2–3 years',
    bg: '#fef3dc', bc: '#8a5a00', tc: '#8a5a00',
    desc: 'Large capital investments requiring board approval, utility coordination, and multi-year timelines.',
  },
];

// BASE_PUE, MIN_PUE, BASE_WUE, MIN_WUE, MAX_CO2_PER_SLOT, SLOT_COST_BASE,
// TREE_SEEDLINGS_PER_TON, CARS_PER_TON, TONS_PER_FLIGHT already live in
// calculations.js because Layer 2 needs them as direct inputs. Re-exported
// here so constants.js stays the one import path for data, without two
// files defining the same numbers.
export {
  BASE_PUE,
  MIN_PUE,
  BASE_WUE,
  MIN_WUE,
  MAX_CO2_PER_SLOT,
  SLOT_COST_BASE,
  TREE_SEEDLINGS_PER_TON,
  CARS_PER_TON,
  TONS_PER_FLIGHT,
} from './calculations.js';
