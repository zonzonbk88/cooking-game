// Sizzle & Serve — the game loop: moving the chef, using stations, starting shifts.
// This is the file the page loads; everything else is a module it imports.

import { CHEF_RADIUS, CHEF_SPEED, FLOOR, STEP, STATIONS, USE_RANGE, VIEW } from './config.js';
import { createWorld, servePlate, stepWorld } from './state.js';
import {
  addToPass, binCarried, canCarry, pickUp, takePlate, useBoard, useGrill,
} from './state.js';
import { EVENT_MISSED, EVENT_OVER, EVENT_SERVED, EVENT_WRONG } from './state.js';
import { attachInput, createInput, endFrame, moveVector, wasPressed } from './input.js';
import { createAudio, ensureAudio, playEffect, setSizzle } from './audio.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, drawFrame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7');

const input = createInput();
attachInput(input, canvas);
const audio = createAudio();

// A small read-only handle for play-testing (and for the curious): the live world.
window.__sizzle = {
  get world() { return world; },
  get screen() { return screen; },
};

let world;
let screen;
let walkTarget = null;
let pendingUse = null;
let vegCycle = 0;
let fridgeCycle = 0;
let lastEvents = 0;

if (shotName) {
  // A staged scene: the world is set up by shots.js and drawn, never played.
  const staged = stageShot(shotName, seed);
  world = staged.world;
  screen = staged.screen;
  drawFrame(ctx, world, screen, null);
} else {
  world = createWorld(seed);
  screen = SCREEN_TITLE;
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += dt;
    while (accumulator >= STEP) {
      tick(STEP);
      accumulator -= STEP;
    }
    drawFrame(ctx, world, screen, { x: input.mouse.x, y: input.mouse.y });
    announce();
    endFrame(input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** One fixed step: keys, clicks, walking, stations, and the world's own clock. */
export function tick(dt) {
  ensureAudio(audio);
  if (wasPressed(input, 'm')) {
    audio.muted = !audio.muted;
    if (audio.muted) setSizzle(audio, false);
  }
  if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
    if (input.clicked || wasPressed(input, 'enter') || wasPressed(input, ' ')) {
      playEffect(audio, 'click');
      world = createWorld((Math.random() * 100000) | 0);
      screen = SCREEN_PLAY;
      walkTarget = null;
      pendingUse = null;
      playEffect(audio, 'ticket');
    }
    return;
  }
  if (wasPressed(input, 'e') || wasPressed(input, ' ')) {
    useNearestStation();
  }
  if (wasPressed(input, '1')) dropSlot(0);
  if (wasPressed(input, '2')) dropSlot(1);
  if (wasPressed(input, '3')) dropSlot(2);
  if (input.clicked) handleClick(input.clicked);
  moveChef(dt);
  const events = stepWorld(world, dt);
  lastEvents = events;
  if (events & EVENT_SERVED) playEffect(audio, 'serve');
  if (events & EVENT_WRONG) playEffect(audio, 'wrong');
  if (events & EVENT_MISSED) playEffect(audio, 'wrong');
  if (events & EVENT_OVER) {
    playEffect(audio, 'over');
    screen = SCREEN_OVER;
    setSizzle(audio, false);
  }
  const cooking = world.grill.slots.some((slot) => slot && slot.state === 'cooking');
  setSizzle(audio, cooking);
}

/** Walk the chef: keys steer directly, a click sets a target to walk to. */
export function moveChef(dt) {
  const chef = world.chef;
  const vector = moveVector(input);
  let dx = vector.x;
  let dy = vector.y;
  if (dx === 0 && dy === 0 && walkTarget) {
    const tx = walkTarget.x - chef.x;
    const ty = walkTarget.y - chef.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 6) {
      walkTarget = null;
      if (pendingUse) {
        const use = pendingUse;
        pendingUse = null;
        useStation(use);
      }
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  if (dx !== 0 || dy !== 0) {
    chef.moving = true;
    chef.walkPhase += dt * 11;
    if (dx !== 0) chef.face = dx > 0 ? 1 : -1;
    chef.x += dx * CHEF_SPEED * dt;
    chef.y += dy * CHEF_SPEED * dt;
    chef.x = Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - CHEF_RADIUS, chef.x));
    chef.y = Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - CHEF_RADIUS, chef.y));
    pushOutOfStations(chef);
  } else {
    chef.moving = false;
  }
}

/** Keep the chef out of the station blocks (they are counters, not floor). */
export function pushOutOfStations(chef) {
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    const nearestX = Math.max(s.x, Math.min(chef.x, s.x + s.w));
    const nearestY = Math.max(s.y, Math.min(chef.y, s.y + s.h));
    const dx = chef.x - nearestX;
    const dy = chef.y - nearestY;
    const dist = Math.hypot(dx, dy);
    if (dist < CHEF_RADIUS && dist > 0) {
      chef.x = nearestX + (dx / dist) * CHEF_RADIUS;
      chef.y = nearestY + (dy / dist) * CHEF_RADIUS;
    } else if (dist === 0) {
      chef.y = s.y + s.h + CHEF_RADIUS;
    }
  }
}

/** A click: on a station it walks there and uses it; on the floor it just walks. */
export function handleClick(point) {
  ensureAudio(audio);
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    if (point.x >= s.x && point.x <= s.x + s.w && point.y >= s.y && point.y <= s.y + s.h) {
      const station = { key, point };
      if (nearStation(key)) {
        useStation(station);
      } else {
        walkTarget = approachPoint(key);
        pendingUse = station;
      }
      return;
    }
  }
  walkTarget = { x: point.x, y: point.y };
  pendingUse = null;
}

/** Is the chef close enough to use this station right now? */
export function nearStation(key) {
  const s = STATIONS[key];
  const cx = Math.max(s.x, Math.min(world.chef.x, s.x + s.w));
  const cy = Math.max(s.y, Math.min(world.chef.y, s.y + s.h));
  return Math.hypot(world.chef.x - cx, world.chef.y - cy) <= USE_RANGE;
}

/** The floor point the chef walks to in order to reach a station. */
export function approachPoint(key) {
  const s = STATIONS[key];
  if (s.y < FLOOR.y) return { x: s.x + s.w / 2, y: FLOOR.y + 30 };
  return { x: s.x + s.w / 2, y: FLOOR.y + FLOOR.h - 30 };
}

/** The nearest station in range, for the E key. */
export function useNearestStation() {
  let best = null;
  let bestDist = Infinity;
  for (const key of Object.keys(STATIONS)) {
    if (!nearStation(key)) continue;
    const s = STATIONS[key];
    const cx = Math.max(s.x, Math.min(world.chef.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(world.chef.y, s.y + s.h));
    const dist = Math.hypot(world.chef.x - cx, world.chef.y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  }
  if (best) useStation({ key: best });
}

/** Drop one carried item (keys 1-3): it vanishes, the tray stays tidy. */
export function dropSlot(index) {
  if (index < world.chef.carry.length) {
    const kind = world.chef.carry[index];
    if (kind === 'plate') world.chef.plate = null;
    world.chef.carry.splice(index, 1);
    playEffect(audio, 'place');
  }
}

/** A short banner across the kitchen, for feedback the player can read at a glance. */
export function say(text, color) {
  world.flash = { text, color: color || '#ffd75e', life: 1.4 };
}

/** Use a station: fetch, grill, chop, build, serve or bin — with a sound for each. */
export function useStation(station) {
  const key = station.key;
  const point = station.point;
  if (key === 'veg') {
    const kinds = ['lettuce', 'tomato', 'onion'];
    let kind = kinds[vegCycle % 3];
    vegCycle += 1;
    if (point) {
      const s = STATIONS.veg;
      const third = s.w / 3;
      kind = kinds[Math.min(2, Math.floor((point.x - s.x) / third))];
    }
    if (pickUp(world, kind)) playEffect(audio, 'pickup');
    else say('HANDS FULL!', '#ff5a4e');
    return;
  }
  if (key === 'fridge') {
    const kinds = ['pattyRaw', 'cheese'];
    let kind = kinds[fridgeCycle % 2];
    fridgeCycle += 1;
    if (point) {
      const s = STATIONS.fridge;
      kind = point.x - s.x < s.w / 2 ? 'pattyRaw' : 'cheese';
    }
    if (pickUp(world, kind)) playEffect(audio, 'pickup');
    else say('HANDS FULL!', '#ff5a4e');
    return;
  }
  if (key === 'buns') {
    if (pickUp(world, 'bun')) playEffect(audio, 'pickup');
    else say('HANDS FULL!', '#ff5a4e');
    return;
  }
  if (key === 'grill') {
    const result = useGrill(world);
    if (result === 'grilling') playEffect(audio, 'grill');
    else if (result === 'took-patty') { playEffect(audio, 'ding'); }
    else if (result === 'hands-full') say('HANDS FULL!', '#ff5a4e');
    else if (result === 'grill-full') say('GRILL IS FULL!', '#ff5a4e');
    else say('NEED A RAW PATTY FIRST', '#ff9a8a');
    return;
  }
  if (key === 'board') {
    const result = useBoard(world);
    if (result === 'chopping') playEffect(audio, 'chop');
    else if (result === 'took-chopped') playEffect(audio, 'ding');
    else if (result === 'hands-full') say('HANDS FULL!', '#ff5a4e');
    else if (result === 'board-busy') say('STILL CHOPPING…', '#ff9a8a');
    else say('NEED VEG TO CHOP', '#ff9a8a');
    return;
  }
  if (key === 'pass') {
    if (world.chef.carry.some((kind) => kind !== 'plate')) {
      const result = addToPass(world);
      if (result === 'plated') playEffect(audio, 'place');
      else say('PLATE IS FULL!', '#ff5a4e');
      return;
    }
    const result = takePlate(world);
    if (result === 'took-plate') playEffect(audio, 'pickup');
    else if (result === 'hands-full') say('HANDS FULL!', '#ff5a4e');
    else if (result === 'already-plate') say('ALREADY CARRYING A PLATE', '#ff9a8a');
    else say('NO PLATE ON THE PASS', '#ff9a8a');
    return;
  }
  if (key === 'serve') {
    const events = servePlate(world);
    if (events & EVENT_SERVED) playEffect(audio, 'serve');
    else if (events & EVENT_WRONG) playEffect(audio, 'wrong');
    else say('CARRY A PLATE TO SERVE', '#ff9a8a');
    return;
  }
  if (key === 'trash') {
    const result = binCarried(world);
    if (result === 'binned') playEffect(audio, 'place');
    else say('NOTHING TO TOSS', '#ff9a8a');
  }
}

/** Keep the screen-reader status line in step with the shift. */
export function announce() {
  if (!status) return;
  const text = screen === SCREEN_TITLE
    ? 'Sizzle and Serve. Press Enter to start your shift.'
    : screen === SCREEN_OVER
      ? `Shift over. Final score ${world.score}, ${world.served} dishes served.`
      : `Time left ${Math.ceil(world.timeLeft)} seconds. Score ${world.score}. `
        + `${world.tickets.length} orders waiting. Carrying ${world.chef.carry.length} items.`;
  if (status.textContent !== text) status.textContent = text;
}
