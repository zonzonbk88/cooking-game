// Sizzle & Serve — rendering: the whole kitchen drawn on one canvas, no images.
// Warm diner colours, chunky readable counters, and a ticket board you can read at a glance.

import { CHOP_MAP, FLOOR, INGREDIENTS, STATIONS, VIEW, formatClock } from './config.js';
import { matchRecipe, ticketForPlate } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** Round a rectangle path on `ctx`, for counters, tickets and buttons. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draw one ingredient as a coloured disc with its glyph. */
export function drawIngredient(ctx, kind, x, y, radius) {
  const def = INGREDIENTS[kind];
  if (!def) return;
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = def.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `${Math.round(radius * 1.15)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.glyph, x, y + 1);
}

/** A thin progress ring, for the grill and the chopping board. */
export function drawProgress(ctx, x, y, radius, fraction, color) {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, fraction)));
  ctx.stroke();
}

/** The tiled kitchen floor, walls and the warm glow of the pass. */
export function drawKitchen(ctx, world, hover) {
  ctx.fillStyle = '#2b1d16';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Floor tiles.
  ctx.fillStyle = '#f3e2c7';
  ctx.fillRect(FLOOR.x - 8, FLOOR.y - 8, FLOOR.w + 16, FLOOR.h + 16);
  ctx.strokeStyle = '#d9c49c';
  ctx.lineWidth = 1;
  for (let x = FLOOR.x; x <= FLOOR.x + FLOOR.w; x += 49) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR.y);
    ctx.lineTo(x, FLOOR.y + FLOOR.h);
    ctx.stroke();
  }
  for (let y = FLOOR.y; y <= FLOOR.y + FLOOR.h; y += 49) {
    ctx.beginPath();
    ctx.moveTo(FLOOR.x, y);
    ctx.lineTo(FLOOR.x + FLOOR.w, y);
    ctx.stroke();
  }
  // Wall band with a menu strip.
  ctx.fillStyle = '#7a3b2e';
  ctx.fillRect(0, 96, VIEW.width, 14);
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ SIZZLE & SERVE — RUSH HOUR KITCHEN ★', 300, 88);
  // A round rug in the middle of the floor, and a potted plant in the corner.
  ctx.fillStyle = '#b65c4a';
  ctx.beginPath();
  ctx.ellipse(770, 400, 150, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8c98f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(770, 400, 128, 56, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3f8f37';
  ctx.beginPath();
  ctx.arc(310, 545, 16, 0, Math.PI * 2);
  ctx.arc(322, 532, 12, 0, Math.PI * 2);
  ctx.arc(298, 532, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b65c4a';
  roundRect(ctx, 296, 548, 28, 20, 4);
  ctx.fill();
  drawStations(ctx, world, hover);
  drawPass(ctx, world, hover);
}

/** Each station: a counter block, its label, and what is cooking on it. */
export function drawStations(ctx, world, hover) {
  const names = Object.keys(STATIONS);
  for (const key of names) {
    if (key === 'pass') continue;
    const station = STATIONS[key];
    const isHover = hover && hover.x >= station.x && hover.x <= station.x + station.w
      && hover.y >= station.y && hover.y <= station.y + station.h;
    ctx.fillStyle = isHover ? '#8a5a3b' : '#6b4630';
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#4a2f1e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffe9c4';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.label, station.x + station.w / 2, station.y + 16);
    ctx.fillStyle = '#d8b98a';
    ctx.font = '11px sans-serif';
    // While something cooks, the hint is replaced by a status pill drawn after the icons.
    const busy = (key === 'grill' && world.grill.slots.some((slot) => slot))
      || (key === 'board' && world.board.slot);
    if (!busy) ctx.fillText(station.hint, station.x + station.w / 2, station.y + 36);
    if (key === 'veg') {
      drawIngredient(ctx, 'lettuce', station.x + 42, station.y + 52, 11);
      drawIngredient(ctx, 'tomato', station.x + 105, station.y + 52, 11);
      drawIngredient(ctx, 'onion', station.x + 168, station.y + 52, 11);
    }
    if (key === 'fridge') {
      drawIngredient(ctx, 'pattyRaw', station.x + 50, station.y + 52, 11);
      drawIngredient(ctx, 'cheese', station.x + 100, station.y + 52, 11);
    }
    if (key === 'buns') {
      drawIngredient(ctx, 'bun', station.x + 50, station.y + 52, 11);
      drawIngredient(ctx, 'bun', station.x + 100, station.y + 52, 11);
    }
    if (key === 'grill') {
      world.grill.slots.forEach((slot, i) => {
        const cx = station.x + 55 + i * 80;
        const cy = station.y + 50;
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fill();
        if (slot) {
          drawIngredient(ctx, slot.state === 'done' ? 'patty' : 'pattyRaw', cx, cy, 12);
          if (slot.state === 'cooking') drawProgress(ctx, cx, cy, 18, 1 - slot.left / slot.total, '#ff8c42');
        }
      });
      if (world.grill.slots.some((slot) => slot)) {
        drawStationStatus(ctx, station,
          world.grill.slots.some((slot) => slot && slot.state === 'done') ? '✓ READY!' : 'SIZZLING…',
          world.grill.slots.some((slot) => slot && slot.state === 'done') ? '#7be382' : '#ff8c42');
      }
    }
    if (key === 'board') {
      const slot = world.board.slot;
      const cx = station.x + station.w / 2;
      const cy = station.y + 52;
      ctx.fillStyle = '#e8d5a8';
      roundRect(ctx, cx - 42, cy - 12, 84, 24, 6);
      ctx.fill();
      if (slot) {
        const doneKind = CHOP_MAP[slot.kind];
        drawIngredient(ctx, slot.state === 'done' ? doneKind : slot.kind, cx, cy, 11);
        if (slot.state === 'chopping') drawProgress(ctx, cx, cy, 17, 1 - slot.left / slot.total, '#7bc96f');
        drawStationStatus(ctx, station, slot.state === 'done' ? '✓ READY!' : 'CHOPPING…',
          slot.state === 'done' ? '#7be382' : '#7bc96f');
      }
    }
    if (key === 'serve') {
      ctx.fillStyle = '#ffd75e';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('🍽️', station.x + station.w / 2, station.y + 50);
    }
    if (key === 'trash') {
      ctx.fillStyle = '#ffd75e';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('🗑️', station.x + station.w / 2, station.y + 50);
    }
  }
}

/** A status label on a pill, drawn over a station's icons so it always reads. */
export function drawStationStatus(ctx, station, text, color) {
  ctx.font = 'bold 11px sans-serif';
  const width = ctx.measureText(text).width + 14;
  const x = station.x + station.w / 2 - width / 2;
  const y = station.y + 27;
  ctx.fillStyle = 'rgba(20,10,5,0.85)';
  roundRect(ctx, x, y, width, 18, 9);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, station.x + station.w / 2, y + 9);
}

/** The assembly pass: the plate being built, and whether it matches a ticket. */
export function drawPass(ctx, world, hover) {
  const station = STATIONS.pass;
  const isHover = hover && hover.x >= station.x && hover.x <= station.x + station.w
    && hover.y >= station.y && hover.y <= station.y + station.h;
  ctx.fillStyle = isHover ? '#9a6a42' : '#7c5233';
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd75e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(station.label, station.x + station.w / 2, station.y + 15);
  // The plate itself.
  const cx = station.x + 60;
  const cy = station.y + 44;
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b9b9b9';
  ctx.lineWidth = 2;
  ctx.stroke();
  world.pass.plate.forEach((kind, i) => {
    drawIngredient(ctx, kind, cx - 22 + i * 15, cy - 8 - (i % 2) * 4, 9);
  });
  const recipe = matchRecipe(world.pass.plate);
  const ticket = recipe ? ticketForPlate(world, world.pass.plate) : null;
  ctx.textAlign = 'left';
  ctx.font = '13px sans-serif';
  if (world.pass.plate.length === 0) {
    ctx.fillStyle = '#d8b98a';
    ctx.fillText('Drop ingredients here to build a dish', station.x + 112, station.y + 44);
  } else if (ticket) {
    ctx.fillStyle = '#7be382';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`✓ ${recipe.name} — ready to serve!`, station.x + 112, station.y + 44);
  } else if (recipe) {
    ctx.fillStyle = '#ffd75e';
    ctx.fillText(`${recipe.name} — no ticket wants it right now`, station.x + 112, station.y + 44);
  } else {
    ctx.fillStyle = '#ff9a8a';
    ctx.fillText('Mid-assembly… keep adding ingredients', station.x + 112, station.y + 44);
  }
}

/** The chef: a little cook with a tall hat, a tray of what they carry, and a walk bob. */
export function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 2 : 0;
  const x = chef.x;
  const y = chef.y + bob;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, chef.y + 18, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body (apron) and head.
  ctx.fillStyle = '#f4f4f4';
  roundRect(ctx, x - 15, y - 6, 30, 26, 9);
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  ctx.fillRect(x - 15, y + 8, 30, 5);
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.arc(x, y - 14, 12, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 7, y - 24, 7, 0, Math.PI * 2);
  ctx.arc(x, y - 27, 8, 0, Math.PI * 2);
  ctx.arc(x + 7, y - 24, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 11, y - 25, 22, 5);
  // Eyes look where the chef faces.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(x - 4 + chef.face * 2, y - 14, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 4 + chef.face * 2, y - 14, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // What the chef carries, on a little tray above the hat.
  if (chef.carry.length > 0) {
    const trayY = y - 42;
    ctx.fillStyle = '#c9a06a';
    roundRect(ctx, x - 32, trayY - 4, 64, 10, 5);
    ctx.fill();
    chef.carry.forEach((kind, i) => {
      const itemX = x - 21 + i * 21;
      if (kind === 'plate') {
        ctx.fillStyle = '#f4f4f4';
        ctx.beginPath();
        ctx.ellipse(itemX, trayY - 9, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        if (world.chef.plate) {
          world.chef.plate.forEach((item, j) => drawIngredient(ctx, item, itemX - 6 + j * 6, trayY - 14, 4.5));
        }
      } else {
        drawIngredient(ctx, kind, itemX, trayY - 11, 10);
      }
    });
  }
}

/** The order board on the left: one ticket per waiting customer. */
export function drawTickets(ctx, world) {
  ctx.fillStyle = '#3a2a1e';
  roundRect(ctx, 12, 108, 262, 470, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('📋 ORDER BOARD', 28, 130);
  ctx.fillStyle = '#d8b98a';
  ctx.font = '12px sans-serif';
  ctx.fillText('Serve before the clock runs out!', 28, 150);
  if (world.tickets.length === 0) {
    ctx.fillStyle = '#8a7a66';
    ctx.font = 'italic 14px sans-serif';
    ctx.fillText('No orders yet — the lunch', 28, 200);
    ctx.fillText('rush is coming…', 28, 220);
  }
  world.tickets.forEach((ticket, i) => {
    const y = 168 + i * 100;
    const urgency = ticket.patience / ticket.maxPatience;
    const barColor = urgency > 0.5 ? '#7bc96f' : urgency > 0.25 ? '#ffb347' : '#ff5a4e';
    ctx.fillStyle = '#fff8ea';
    roundRect(ctx, 24, y, 238, 88, 8);
    ctx.fill();
    ctx.strokeStyle = urgency <= 0.25 ? '#ff5a4e' : '#d9c49c';
    ctx.lineWidth = urgency <= 0.25 ? 3 : 1.5;
    ctx.stroke();
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ticket.recipe.icon, 34, y + 30);
    ctx.fillStyle = '#2b1d16';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(ticket.recipe.name, 70, y + 20);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6b5a48';
    const needs = ticket.recipe.needs.map((kind) => INGREDIENTS[kind].name).join(' + ');
    ctx.fillText(needs, 70, y + 40, 180);
    // Patience bar and clock.
    ctx.fillStyle = '#e8ddcb';
    roundRect(ctx, 34, y + 58, 170, 10, 5);
    ctx.fill();
    ctx.fillStyle = barColor;
    roundRect(ctx, 34, y + 58, Math.max(10, 170 * urgency), 10, 5);
    ctx.fill();
    ctx.fillStyle = urgency <= 0.25 ? '#d92b1f' : '#2b1d16';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatClock(ticket.patience), 252, y + 62);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c79a1d';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`$${ticket.recipe.price}`, 212, y + 20);
  });
  // The menu, pinned under the tickets so new players can plan.
  ctx.fillStyle = '#d8b98a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MENU', 28, 592);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#bfae94';
  const menu = [
    '🍔 Classic: bun + patty + lettuce',
    '🧀 Melt: bun + patty + cheese + tomato',
    '🥗 Salad: lettuce + tomato + onion',
    '🍔 Double: bun + patty ×2 + cheese',
    '🥬 Veggie: bun + lettuce + tomato + onion',
    '🧅 Smoky: bun + patty + cheese + onion',
  ];
  menu.forEach((line, i) => ctx.fillText(line, 28, 610 + i * 17));
}

/** The top bar: shift timer, score, coins, combo and the mute hint. */
export function drawHud(ctx, world) {
  ctx.fillStyle = '#1f130c';
  ctx.fillRect(0, 0, VIEW.width, 96);
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍳 SIZZLE & SERVE', 20, 30);
  ctx.fillStyle = '#d8b98a';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD / arrows to move · Click a station or press E to use it · M mutes', 20, 58);
  // Shift timer, big and impossible to miss.
  const low = world.timeLeft <= 30;
  ctx.fillStyle = low ? '#ff5a4e' : '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatClock(world.timeLeft), 640, 34);
  ctx.fillStyle = '#d8b98a';
  ctx.font = '13px sans-serif';
  ctx.fillText(low ? 'LAST ORDERS!' : 'SHIFT TIMER', 640, 66);
  // Score, coins, combo.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`SCORE ${world.score}`, 1260, 26);
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`🪙 $${world.coins}   🍽️ ${world.served} served`, 1260, 54);
  if (world.combo >= 2) {
    ctx.fillStyle = '#ff9a3d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`🔥 COMBO ×${world.combo}`, 1260, 78);
  }
  // Flash banner for serves and walk-outs.
  if (world.flash) {
    ctx.globalAlpha = Math.min(1, world.flash.life);
    ctx.fillStyle = world.flash.color;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.flash.text, 640, 130);
    ctx.globalAlpha = 1;
  }
  // Floating score notes.
  ctx.font = 'bold 20px sans-serif';
  for (const note of world.floating) {
    ctx.globalAlpha = Math.min(1, note.life);
    ctx.fillStyle = note.color;
    ctx.fillText(note.text, note.x, note.y - (1.4 - note.life) * 30);
  }
  ctx.globalAlpha = 1;
}

/** The title screen: the kitchen behind, the pitch in front. */
export function drawTitle(ctx, world) {
  drawKitchen(ctx, world, null);
  drawTickets(ctx, world);
  drawChef(ctx, world);
  ctx.fillStyle = 'rgba(20,10,5,0.88)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SIZZLE & SERVE', 640, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('One chef. One lunch rush. No burnt patties.', 640, 250);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffe9c4';
  ctx.fillText('Tickets land on the order board — fetch, grill, chop, build and serve', 640, 300);
  ctx.fillText('before the customer walks out. Chain serves for combo tips!', 640, 328);
  ctx.fillStyle = '#7be382';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('▶  CLICK or press ENTER to start your shift', 640, 400);
  ctx.fillStyle = '#d8b98a';
  ctx.font = '15px sans-serif';
  ctx.fillText('Move: WASD / arrows / click to walk · Use a station: click it or press E · 1/2/3 pick a carry slot to drop', 640, 450);
  ctx.fillText('Grill patties · Chop veg · Build plates on the pass · Serve at the window', 640, 476);
}

/** The end of the shift: the tally, and what to beat next time. */
export function drawOver(ctx, world) {
  drawKitchen(ctx, world, null);
  drawTickets(ctx, world);
  drawChef(ctx, world);
  ctx.fillStyle = 'rgba(20,10,5,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(world.won ? '🏆 SHIFT COMPLETE!' : '⏰ SHIFT OVER', 640, 180);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`Final score: ${world.score}`, 640, 250);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#ffe9c4';
  ctx.fillText(`🍽️ ${world.served} dishes served · 🪙 $${world.coins} earned · ${world.missed} customers walked out`, 640, 300);
  ctx.fillText(`Best combo: ×${world.bestCombo}`, 640, 332);
  ctx.fillStyle = '#7be382';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('▶  CLICK or press ENTER to cook another shift', 640, 400);
}

/** Draw one frame of the named screen. */
export function drawFrame(ctx, world, screen, hover) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  if (screen === SCREEN_OVER) {
    drawOver(ctx, world);
    return;
  }
  drawKitchen(ctx, world, hover);
  drawTickets(ctx, world);
  drawChef(ctx, world);
  drawHud(ctx, world);
}
