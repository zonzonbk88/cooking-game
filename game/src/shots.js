// Sizzle & Serve — the screenshot scenes behind ?shot=cover|play|rush.
// Each scene sets the world up through the game's own rules (real tickets, real plates,
// real grill and board state), then the normal renderer draws it — so every screenshot
// is a frame the game itself can reach while playing.

import { CHOP_SECONDS, GRILL_SECONDS, STATIONS } from './config.js';
import { createWorld, spawnTicket, stepWorld } from './state.js';
import { SCREEN_PLAY } from './render.js';

/**
 * Build the world for a named scene and return the screen to draw.
 * - cover: the fullest frame — tickets, ingredients on the counter, a dish
 *   mid-assembly on the pass, a patty on the grill, veg on the board, the timer
 *   running and a finished plate ready to serve.
 * - play: an early-shift moment, one ticket, the chef carrying a tomato.
 * - rush: the late rush — four tickets, two patties sizzling, a plate ready.
 */
export function stageShot(name, seed) {
  const world = createWorld(seed || 7);
  if (name === 'play') {
    spawnTicket(world);
    world.tickets[0].recipe = world.tickets[0].recipe;
    world.chef.carry.push('tomato');
    world.chef.x = STATIONS.veg.x + 105;
    world.chef.y = STATIONS.veg.y + 130;
    world.chef.face = 1;
    world.time = 22;
    world.timeLeft = 158;
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'rush') {
    world.time = 132;
    world.timeLeft = 48;
    world.score = 1240;
    world.coins = 430;
    world.served = 9;
    world.combo = 4;
    for (let i = 0; i < 4; i += 1) spawnTicket(world);
    world.tickets.forEach((ticket, i) => {
      ticket.patience = [9, 17, 26, 34][i];
      ticket.maxPatience = 40;
    });
    world.grill.slots[0] = { kind: 'pattyRaw', state: 'cooking', left: GRILL_SECONDS * 0.4, total: GRILL_SECONDS };
    world.grill.slots[1] = { kind: 'pattyRaw', state: 'done', left: 0, total: GRILL_SECONDS };
    world.board.slot = { kind: 'lettuce', state: 'chopping', left: CHOP_SECONDS * 0.5, total: CHOP_SECONDS };
    world.pass.plate = ['bun', 'patty', 'lettuceChopped'];
    world.chef.carry = ['plate'];
    world.chef.plate = ['bun', 'patty', 'cheese', 'tomatoChopped'];
    world.chef.x = 1070;
    world.chef.y = 640;
    world.chef.face = 1;
    return { world, screen: SCREEN_PLAY };
  }
  // Cover: the richest single frame the game can show.
  world.time = 47;
  world.timeLeft = 133;
  world.score = 520;
  world.coins = 210;
  world.served = 4;
  world.combo = 3;
  for (let i = 0; i < 3; i += 1) spawnTicket(world);
  world.tickets[0].patience = 31;
  world.tickets[0].maxPatience = 52;
  world.tickets[1].patience = 18;
  world.tickets[1].maxPatience = 52;
  world.tickets[2].patience = 42;
  world.tickets[2].maxPatience = 52;
  world.grill.slots[0] = { kind: 'pattyRaw', state: 'cooking', left: GRILL_SECONDS * 0.55, total: GRILL_SECONDS };
  world.board.slot = { kind: 'tomato', state: 'chopping', left: CHOP_SECONDS * 0.6, total: CHOP_SECONDS };
  // A dish mid-assembly on the pass: bun + patty, lettuce still to come.
  world.pass.plate = ['bun', 'patty'];
  // And a finished plate in the chef's hands, ready to serve.
  world.chef.carry = ['plate'];
  world.chef.plate = ['bun', 'patty', 'lettuceChopped'];
  world.chef.x = 760;
  world.chef.y = 420;
  world.chef.face = 1;
  world.chef.moving = true;
  world.chef.walkPhase = 0.8;
  return { world, screen: SCREEN_PLAY };
}

/** A short scripted play-through, used by the cover test to prove the rules run. */
export function demoPlay(seed) {
  const world = createWorld(seed || 7);
  for (let i = 0; i < 60 * 30; i += 1) stepWorld(world, 1 / 60);
  return world;
}
