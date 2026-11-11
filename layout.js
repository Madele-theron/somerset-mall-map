// layout.js — the schematic "skeleton" of the mall: corridors, junctions and big anchor blocks.
// Everything is in the same 0–100 (x) / 0–85 (y) space as data.js.
// You only need to touch this if a corridor changes. Open the site with ?edit=1 and tap the map
// to read off x/y coordinates.

const MAP = { width: 100, height: 85 };

// Junction points along the walkways. Every shop snaps to its nearest junction for routing.
const NODES = {
  W0: [9, 29],    // toward Pick n Pay Hypermarket
  W1: [14, 36],   // Entrance 1 hall
  W2: [14, 28],
  W3: [24, 27],
  W4: [33, 26],
  N1: [39, 25],   // north junction (Mozambik / UNIQ)
  N2: [47, 23],
  N3: [58, 24],   // curve by Edgars / Adidas
  C1: [41, 31],   // central plaza
  C2: [44, 42],   // Jet
  C3: [45, 52],
  C4: [45, 58],   // south corridor junction
  C5: [36, 60],   // Entrance 2 hall
  S1: [42, 68],   // walkway down to Woolworths
  SE1: [56, 58],  // Entrance 3
  SE2: [63, 57],
  SE3: [67, 48],
  SE4: [74, 47],
  E1: [61, 31],   // LEGO corridor
  E2: [63, 44],
  D1: [78, 40],   // Dis-Chem / Checkers wing
  D2: [80, 30],
  D3: [82, 23],   // Cinema Connect
  ENT4: [84, 44]  // Entrance 4
};

// Which junctions connect to which.
const EDGES = [
  ['W1', 'W2'], ['W2', 'W0'], ['W2', 'W3'], ['W3', 'W4'], ['W4', 'N1'],
  ['W4', 'C1'], ['N1', 'N2'], ['N2', 'N3'], ['N3', 'E1'], ['E1', 'E2'],
  ['E2', 'SE3'], ['N1', 'C1'], ['C1', 'C2'], ['C2', 'C3'], ['C3', 'C4'],
  ['C4', 'C5'], ['C4', 'SE1'], ['SE1', 'SE2'], ['SE2', 'SE3'], ['SE3', 'SE4'],
  ['SE4', 'D1'], ['SE4', 'ENT4'], ['D1', 'ENT4'], ['D1', 'D2'], ['D2', 'D3'],
  ['C4', 'S1']
];

// Big shops drawn as soft blocks behind the pins (centred on the shop's x/y from data.js).
const BLOCKS = [
  { id: 'pnp-hyper', w: 12, h: 16 },
  { id: 'clicks', w: 9, h: 8 },
  { id: 'ackermans', w: 9, h: 8 },
  { id: 'foschini', w: 9, h: 8 },
  { id: 'coricraft', w: 6, h: 6 },
  { id: 'truworths', w: 8, h: 8 },
  { id: 'jet', w: 9, h: 9 },
  { id: 'edgars', w: 8, h: 7 },
  { id: 'hm', w: 10, h: 12 },
  { id: 'checkers', w: 12, h: 10 },
  { id: 'dis-chem', w: 8, h: 6 },
  { id: 'toys-r-us', w: 9, h: 9 },
  { id: 'mr-price', w: 8, h: 8 },
  { id: 'woolworths', w: 16, h: 12 }
];
