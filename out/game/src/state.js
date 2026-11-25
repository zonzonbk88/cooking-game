// Sizzle & Serve — the world: tickets, plates, the grill and the board, the score.
// Pure state and rules; nothing here touches the canvas or the keyboard.

import {
  CARRY_MAX, CHOP_MAP, CHOP_SECONDS, FLOOR, GRILL_INPUT, GRILL_OUTPUT, GRILL_SECONDS,
  MAX_TICKETS, MISS_POINTS, PATIENCE_EARLY_SECONDS, PATIENCE_LATE_SECONDS, RECIPES,
  SERVE_POINTS, SHIFT_SECONDS, SPAWN_EARLY_SECONDS, SPAWN_LATE_SECONDS, TIP_MAX,
  mulberry32, pickRandom,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_SERVED = 1;
export const EVENT_MISSED = 2;
export const EVENT_OVER = 4;
export const EVENT_WRONG = 8;

/** A fresh shift: the chef in the middle of the floor, no tickets, no food yet. */
export function createWorld(seed) {
  const rand = mulberry32(seed);
  return {
    seed,
    rand,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    over: false,
    won: false,
    spawnIn: 4,
    nextTicketId: 1,
    tickets: [],
    chef: {
      x: FLOOR.x + FLOOR.w / 2,
      y: FLOOR.y + FLOOR.h / 2,
      face: 1,
      carry: [],
      moving: false,
      walkPhase: 0,
    },
    grill: { slots: [null, null] },
    board: { slot: null },
    pass: { plate: [] },
    flash: null,
    floating: [],
  };
}

/** How fast tickets arrive and how patient they are, from how far the shift has run. */
export function spawnInterval(world) {
  const t = world.time / SHIFT_SECONDS;
  return SPAWN_EARLY_SECONDS + (SPAWN_LATE_SECONDS - SPAWN_EARLY_SECONDS) * t;
}

export function patienceFor(world) {
  const t = world.time / SHIFT_SECONDS;
  return PATIENCE_EARLY_SECONDS + (PATIENCE_LATE_SECONDS - PATIENCE_EARLY_SECONDS) * t;
}

/** Deal one new ticket onto the board, if there is room for it. */
export function spawnTicket(world) {
  if (world.tickets.length >= MAX_TICKETS) return null;
  const recipe = pickRandom(world.rand, RECIPES);
  const ticket = {
    id: world.nextTicketId,
    recipe,
    patience: patienceFor(world),
    maxPatience: patienceFor(world),
    born: world.time,
  };
  world.nextTicketId += 1;
  world.tickets.push(ticket);
  return ticket;
}

/** The recipe a plate matches, or null when it matches nothing yet. */
export function matchRecipe(plate) {
  const sorted = [...plate].sort().join(',');
  for (const recipe of RECIPES) {
    if ([...recipe.needs].sort().join(',') === sorted) return recipe;
  }
  return null;
}

/** The first ticket a plate would satisfy, or null when no ticket wants it. */
export function ticketForPlate(world, plate) {
  const recipe = matchRecipe(plate);
  if (!recipe) return null;
  let best = null;
  for (const ticket of world.tickets) {
    if (ticket.recipe.id === recipe.id && (best === null || ticket.patience < best.patience)) best = ticket;
  }
  return best;
}

/** A short-lived floating note over the kitchen ("+140", "WRONG ORDER!"). */
export function floatText(world, text, color, x, y) {
  world.floating.push({ text, color, x, y, life: 1.4 });
}

/** Serve the plate the chef carries at the serve window. */
export function servePlate(world) {
  const plateIndex = world.chef.carry.indexOf('plate');
  if (plateIndex < 0) return EVENT_NONE;
  const plate = world.pass.servedPlate || world.chef.plate;
  const ticket = plate ? ticketForPlate(world, plate) : null;
  world.chef.carry.splice(plateIndex, 1);
  world.chef.plate = null;
  if (!ticket) {
    world.combo = 0;
    world.flash = { text: 'NO ONE ORDERED THAT!', color: '#ff5a4e', life: 1.6 };
    floatText(world, 'WRONG ORDER', '#ff5a4e', 1185, 560);
    return EVENT_WRONG;
  }
  const tip = Math.round((TIP_MAX * ticket.patience) / ticket.maxPatience);
  const points = (SERVE_POINTS + tip) * (1 + Math.min(world.combo, 5) * 0.1);
  const gained = Math.round(points);
  world.score += gained;
  world.coins += ticket.recipe.price;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.tickets = world.tickets.filter((entry) => entry.id !== ticket.id);
  world.flash = { text: `SERVED! +${gained}`, color: '#7be382', life: 1.6 };
  floatText(world, `+${gained}`, '#ffd75e', 1185, 560);
  return EVENT_SERVED;
}

/** Advance the shift: the clock, ticket patience, the grill and the board. */
export function stepWorld(world, dt) {
  if (world.over) return EVENT_NONE;
  let events = EVENT_NONE;
  world.time += dt;
  world.timeLeft = Math.max(0, SHIFT_SECONDS - world.time);
  if (world.timeLeft <= 0) {
    world.over = true;
    world.won = world.missed === 0 && world.served >= 3;
    return EVENT_OVER;
  }
  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    spawnTicket(world);
    world.spawnIn = spawnInterval(world);
  }
  for (const ticket of world.tickets) ticket.patience -= dt;
  const expired = world.tickets.filter((ticket) => ticket.patience <= 0);
  if (expired.length > 0) {
    world.tickets = world.tickets.filter((ticket) => ticket.patience > 0);
    world.missed += expired.length;
    world.score = Math.max(0, world.score + MISS_POINTS * expired.length);
    world.combo = 0;
    world.flash = { text: 'CUSTOMER WALKED OUT!', color: '#ff5a4e', life: 1.6 };
    events |= EVENT_MISSED;
  }
  for (const slot of world.grill.slots) {
    if (slot && slot.state === 'cooking') {
      slot.left -= dt;
      if (slot.left <= 0) slot.state = 'done';
    }
  }
  if (world.board.slot && world.board.slot.state === 'chopping') {
    world.board.slot.left -= dt;
    if (world.board.slot.left <= 0) world.board.slot.state = 'done';
  }
  if (world.flash) {
    world.flash.life -= dt;
    if (world.flash.life <= 0) world.flash = null;
  }
  for (const note of world.floating) note.life -= dt;
  world.floating = world.floating.filter((note) => note.life > 0);
  return events;
}

/** Can the chef still pick something up? A plate counts as one carried item. */
export function canCarry(world) {
  return world.chef.carry.length < CARRY_MAX;
}

/** Take an ingredient into the chef's hands, when there is room. */
export function pickUp(world, kind) {
  if (!canCarry(world)) return false;
  world.chef.carry.push(kind);
  return true;
}

/** Drop the carried item the player chose (index into the carry tray). */
export function dropCarried(world, index) {
  if (index < 0 || index >= world.chef.carry.length) return null;
  return world.chef.carry.splice(index, 1)[0];
}

/** Put a raw patty on a free grill slot, or take a finished one off. */
export function useGrill(world) {
  for (const slot of world.grill.slots) {
    if (slot && slot.state === 'done') {
      if (!canCarry(world)) return 'hands-full';
      world.chef.carry.push(GRILL_OUTPUT);
      world.grill.slots[world.grill.slots.indexOf(slot)] = null;
      return 'took-patty';
    }
  }
  const rawIndex = world.chef.carry.indexOf(GRILL_INPUT);
  if (rawIndex >= 0) {
    const free = world.grill.slots.findIndex((slot) => slot === null);
    if (free < 0) return 'grill-full';
    world.chef.carry.splice(rawIndex, 1);
    world.grill.slots[free] = { kind: GRILL_INPUT, state: 'cooking', left: GRILL_SECONDS, total: GRILL_SECONDS };
    return 'grilling';
  }
  return 'need-patty';
}

/** Put veg on the chopping board, or take the chopped veg off. */
export function useBoard(world) {
  const slot = world.board.slot;
  if (slot && slot.state === 'done') {
    if (!canCarry(world)) return 'hands-full';
    world.chef.carry.push(CHOP_MAP[slot.kind]);
    world.board.slot = null;
    return 'took-chopped';
  }
  if (slot) return 'board-busy';
  for (let index = 0; index < world.chef.carry.length; index += 1) {
    const kind = world.chef.carry[index];
    if (CHOP_MAP[kind]) {
      world.chef.carry.splice(index, 1);
      world.board.slot = { kind, state: 'chopping', left: CHOP_SECONDS, total: CHOP_SECONDS };
      return 'chopping';
    }
  }
  return 'need-veg';
}

/** Lay a carried ingredient onto the plate on the assembly pass. */
export function addToPass(world) {
  if (world.pass.plate.length >= 4) return 'plate-full';
  for (let index = 0; index < world.chef.carry.length; index += 1) {
    const kind = world.chef.carry[index];
    if (kind === 'plate') continue;
    world.chef.carry.splice(index, 1);
    world.pass.plate.push(kind);
    return 'plated';
  }
  return 'need-food';
}

/** Pick the finished plate off the pass and carry it to the serve window. */
export function takePlate(world) {
  if (world.pass.plate.length === 0) return 'no-plate';
  if (world.chef.carry.includes('plate')) return 'already-plate';
  if (!canCarry(world)) return 'hands-full';
  world.chef.carry.push('plate');
  world.chef.plate = [...world.pass.plate];
  world.pass.plate = [];
  return 'took-plate';
}

/** Throw away everything the chef carries. */
export function binCarried(world) {
  if (world.chef.carry.length === 0 && world.chef.plate === null) return 'empty-hands';
  world.chef.carry = [];
  world.chef.plate = null;
  return 'binned';
}
