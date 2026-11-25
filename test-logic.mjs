// Logic test: cook and serve a Classic Burger through the real state functions.
import {
  addToPass, binCarried, createWorld, matchRecipe, pickUp, servePlate, spawnTicket,
  stepWorld, takePlate, ticketForPlate, useBoard, useGrill,
} from './game/src/state.js';
import { RECIPES } from './game/src/config.js';

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  if (!cond) failures += 1;
}

const world = createWorld(7);
// Force the first ticket to be a Classic Burger.
const ticket = spawnTicket(world);
ticket.recipe = RECIPES.find((r) => r.id === 'classic');
ticket.patience = 50;
ticket.maxPatience = 50;

// Fetch a bun, a raw patty and a lettuce.
check('pick bun', pickUp(world, 'bun'));
check('pick raw patty', pickUp(world, 'pattyRaw'));
check('pick lettuce', pickUp(world, 'lettuce'));
check('hands full at 3', !pickUp(world, 'cheese'));
// Grill the patty.
check('grill starts', useGrill(world) === 'grilling');
check('grill busy with no patty', useGrill(world) === 'need-patty');
for (let i = 0; i < 60 * 7; i += 1) stepWorld(world, 1 / 60);
check('patty cooked', world.grill.slots[0].state === 'done');
check('take patty', useGrill(world) === 'took-patty');
// Chop the lettuce.
check('chop starts', useBoard(world) === 'chopping');
for (let i = 0; i < 60 * 4; i += 1) stepWorld(world, 1 / 60);
check('lettuce chopped', useBoard(world) === 'took-chopped');
check('carrying bun+patty+lettuce', world.chef.carry.join(',') === 'bun,patty,lettuceChopped');
// Build the plate on the pass.
check('plate bun', addToPass(world) === 'plated');
check('plate patty', addToPass(world) === 'plated');
check('plate lettuce', addToPass(world) === 'plated');
check('plate matches Classic', matchRecipe(world.pass.plate)?.id === 'classic');
check('ticket wants it', ticketForPlate(world, world.pass.plate)?.id === ticket.id);
// Carry it out and serve it.
check('take plate', takePlate(world) === 'took-plate');
const before = world.score;
check('serve scores', (servePlate(world) & 1) === 1 && world.score > before);
check('ticket gone', !world.tickets.some((t) => t.id === ticket.id));
check('served count 1', world.served === 1);
// Wrong plate: build a salad when nobody ordered it.
pickUp(world, 'lettuceChopped');
pickUp(world, 'tomatoChopped');
pickUp(world, 'onionChopped');
addToPass(world); addToPass(world); addToPass(world);
takePlate(world);
check('wrong plate rejected', (servePlate(world) & 8) === 8);
// Missed ticket: patience runs out.
const t2 = spawnTicket(world);
t2.patience = 0.5;
for (let i = 0; i < 60; i += 1) stepWorld(world, 1 / 60);
check('ticket expires', world.missed === 1 && !world.tickets.some((t) => t.id === t2.id));
// Shift ends after 180 seconds.
for (let i = 0; i < 60 * 200; i += 1) stepWorld(world, 1 / 60);
check('shift ends', world.over === true && world.timeLeft === 0);
check('bin empties hands', (() => { pickUp(world, 'bun'); return binCarried(world) === 'binned' && world.chef.carry.length === 0; })());

console.log(failures === 0 ? 'ALL LOGIC TESTS PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
