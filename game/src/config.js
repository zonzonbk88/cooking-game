// Sizzle & Serve — configuration: the kitchen's size, its ingredients, its recipes.
// Every value the rest of the game reads lives here, so tuning the rush is one file.

export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;

/** The whole shift lasts three minutes; the rush is a shift, not an endless grind. */
export const SHIFT_SECONDS = 180;
export const CHEF_SPEED = 265;
export const CHEF_RADIUS = 20;
/** How many single items the chef can carry at once (a plate counts as one). */
export const CARRY_MAX = 3;
/** How long a raw patty sizzles on the grill, and veg on the chopping board. */
export const GRILL_SECONDS = 6;
export const CHOP_SECONDS = 3;
/** Seconds between new tickets at the start of the shift, and at its end. */
export const SPAWN_EARLY_SECONDS = 15;
export const SPAWN_LATE_SECONDS = 9;
/** How long a ticket waits before the customer walks out, early and late. */
export const PATIENCE_EARLY_SECONDS = 52;
export const PATIENCE_LATE_SECONDS = 36;
export const MAX_TICKETS = 4;
/** Points for a served dish, plus a tip of up to this much for serving fast. */
export const SERVE_POINTS = 100;
export const TIP_MAX = 60;
export const MISS_POINTS = -50;
/** How close the chef must stand to a station to use it. */
export const USE_RANGE = 78;

/**
 * One ingredient. `kind` is the carried item id; `cooked` / `chopped` are the ids a
 * station turns it into. `color` and `glyph` are how the counter draws it.
 */
export const INGREDIENTS = {
  bun: { name: 'Bun', color: '#e8a95c', dark: '#b97a2e', glyph: '🥖', raw: true },
  pattyRaw: { name: 'Raw Patty', color: '#c96a5e', dark: '#8e3b32', glyph: '🥩', raw: true },
  patty: { name: 'Grilled Patty', color: '#7a4a28', dark: '#4d2c15', glyph: '🍔', cooked: true },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#c79a1d', glyph: '🧀', raw: true },
  lettuce: { name: 'Lettuce', color: '#7bc96f', dark: '#3f8f37', glyph: '🥬', raw: true },
  lettuceChopped: { name: 'Chopped Lettuce', color: '#a5dd94', dark: '#5da24e', glyph: '🥗', chopped: true },
  tomato: { name: 'Tomato', color: '#e14b43', dark: '#9c231d', glyph: '🍅', raw: true },
  tomatoChopped: { name: 'Chopped Tomato', color: '#f07068', dark: '#b0332c', glyph: '🍅', chopped: true },
  onion: { name: 'Onion', color: '#e8ddf0', dark: '#a98fc0', glyph: '🧅', raw: true },
  onionChopped: { name: 'Chopped Onion', color: '#f4ecfa', dark: '#c3a8d8', glyph: '🧅', chopped: true },
};

/** What the grill accepts and what it turns it into. */
export const GRILL_INPUT = 'pattyRaw';
export const GRILL_OUTPUT = 'patty';
/** What the chopping board accepts and what each becomes. */
export const CHOP_MAP = { lettuce: 'lettuceChopped', tomato: 'tomatoChopped', onion: 'onionChopped' };

/**
 * The menu. `needs` lists ingredient ids in build order; a plate is a dish when its
 * contents match one recipe exactly, in any order. `icon` is the ticket's picture.
 */
export const RECIPES = [
  { id: 'classic', name: 'Classic Burger', needs: ['bun', 'patty', 'lettuceChopped'], icon: '🍔', price: 100 },
  { id: 'cheese', name: 'Cheese Melt', needs: ['bun', 'patty', 'cheese', 'tomatoChopped'], icon: '🧀', price: 120 },
  { id: 'salad', name: 'Garden Salad', needs: ['lettuceChopped', 'tomatoChopped', 'onionChopped'], icon: '🥗', price: 90 },
  { id: 'double', name: 'Double Stack', needs: ['bun', 'patty', 'patty', 'cheese'], icon: '🍔', price: 150 },
  { id: 'veggie', name: 'Veggie Stack', needs: ['bun', 'lettuceChopped', 'tomatoChopped', 'onionChopped'], icon: '🥬', price: 110 },
  { id: 'smoky', name: 'Smoky Onion Melt', needs: ['bun', 'patty', 'cheese', 'onionChopped'], icon: '🧅', price: 130 },
];

/** Where each station sits on the kitchen floor (top-left corner, width, height). */
export const STATIONS = {
  veg: { x: 300, y: 118, w: 210, h: 64, label: 'VEG CRATE', hint: 'Lettuce · Tomato · Onion' },
  fridge: { x: 540, y: 118, w: 150, h: 64, label: 'FRIDGE', hint: 'Patty · Cheese' },
  buns: { x: 720, y: 118, w: 150, h: 64, label: 'BUN BASKET', hint: 'Fresh buns' },
  grill: { x: 900, y: 118, w: 190, h: 64, label: 'GRILL', hint: 'Sizzle patties here' },
  board: { x: 1120, y: 118, w: 130, h: 64, label: 'CHOP BOARD', hint: 'Chop veg here' },
  pass: { x: 540, y: 596, w: 330, h: 72, label: 'ASSEMBLY PASS', hint: 'Build the plate here' },
  serve: { x: 1120, y: 596, w: 130, h: 72, label: 'SERVE', hint: 'Hand the plate over' },
  trash: { x: 300, y: 596, w: 120, h: 72, label: 'BIN', hint: 'Toss what you carry' },
};

/** The walkable floor, inside the walls and clear of the stations. */
export const FLOOR = { x: 280, y: 196, w: 980, h: 386 };

/** Small deterministic random helper, so a seed always replays the same shift. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one of `list` with the seeded random. */
export function pickRandom(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

/** Format seconds as M:SS for the shift timer and ticket clocks. */
export function formatClock(seconds) {
  const left = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
