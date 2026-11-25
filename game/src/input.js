// Sizzle & Serve — input: keyboard and mouse, one place.
// The game reads this, never the DOM events directly, so play-testing can drive it too.

/** Fresh input state: which keys are held, where the mouse is, what was just clicked. */
export function createInput() {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false },
    clicked: null,
    pressed: new Set(),
    wheel: 0,
  };
}

/** Wire the page's keyboard and mouse into `input`; `canvas` maps clicks to game pixels. */
export function attachInput(input, canvas) {
  function toGame(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (!event.repeat) input.pressed.add(key);
    input.keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const point = toGame(event);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toGame(event);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
    input.mouse.down = true;
    input.clicked = point;
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

/** True while any of these keys is held down. */
export function keysHeld(input, ...names) {
  return names.some((name) => input.keys.has(name));
}

/** The movement vector from WASD or the arrow keys, normalised. */
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (keysHeld(input, 'a', 'arrowleft')) x -= 1;
  if (keysHeld(input, 'd', 'arrowright')) x += 1;
  if (keysHeld(input, 'w', 'arrowup')) y -= 1;
  if (keysHeld(input, 's', 'arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

/** True once, on the frame the key went down (call after reading, then clear). */
export function wasPressed(input, name) {
  return input.pressed.has(name);
}

/** Clear the one-frame presses and the click, at the end of each frame. */
export function endFrame(input) {
  input.pressed.clear();
  input.clicked = null;
}
