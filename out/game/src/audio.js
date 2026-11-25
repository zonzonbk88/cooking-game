// Sizzle & Serve — sound: every effect is a small synthesised blip, no audio files.
// WebAudio only, created on the first user gesture so browsers allow it.

/** Fresh sound bank; call `ensureAudio` from a click or keypress before playing. */
export function createAudio() {
  return { ctx: null, muted: false, sizzle: null };
}

/** Build the AudioContext lazily, and keep it running once the player has acted. */
export function ensureAudio(audio) {
  if (!audio.ctx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
    } catch (error) {
      audio.ctx = null;
    }
  }
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio.ctx;
}

/** One short tone: `freq` in Hz, `seconds` long, `type` waveform, `gain` volume. */
export function tone(audio, freq, seconds, type, gain, when) {
  const ctx = audio.ctx;
  if (!ctx || audio.muted) return;
  const start = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(gain || 0.12, start);
  amp.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

/** A burst of filtered noise, for chopping and for the grill's sizzle. */
export function noiseBurst(audio, seconds, gain, cutoff) {
  const ctx = audio.ctx;
  if (!ctx || audio.muted) return;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff || 2400;
  const amp = ctx.createGain();
  amp.gain.value = gain || 0.15;
  source.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  source.start();
}

/** The named effects the game triggers. */
export function playEffect(audio, name) {
  if (!audio.ctx || audio.muted) return;
  if (name === 'pickup') tone(audio, 520, 0.09, 'triangle', 0.12);
  if (name === 'place') tone(audio, 340, 0.09, 'triangle', 0.12);
  if (name === 'chop') { noiseBurst(audio, 0.08, 0.22, 3200); tone(audio, 180, 0.06, 'square', 0.06); }
  if (name === 'grill') noiseBurst(audio, 0.25, 0.1, 1200);
  if (name === 'ding') { tone(audio, 880, 0.16, 'sine', 0.14); tone(audio, 1318, 0.22, 'sine', 0.1, 0.1); }
  if (name === 'serve') {
    tone(audio, 523, 0.12, 'triangle', 0.14);
    tone(audio, 659, 0.12, 'triangle', 0.14, 0.09);
    tone(audio, 784, 0.22, 'triangle', 0.14, 0.18);
  }
  if (name === 'wrong') { tone(audio, 220, 0.18, 'sawtooth', 0.08); tone(audio, 174, 0.26, 'sawtooth', 0.08, 0.12); }
  if (name === 'ticket') { tone(audio, 660, 0.1, 'sine', 0.1); tone(audio, 990, 0.14, 'sine', 0.08, 0.08); }
  if (name === 'click') tone(audio, 700, 0.05, 'square', 0.05);
  if (name === 'over') {
    tone(audio, 392, 0.2, 'triangle', 0.14);
    tone(audio, 523, 0.2, 'triangle', 0.14, 0.16);
    tone(audio, 659, 0.34, 'triangle', 0.14, 0.32);
  }
}

/** Start or stop the grill's looping sizzle while a patty cooks. */
export function setSizzle(audio, on) {
  const ctx = audio.ctx;
  if (!ctx || audio.muted) on = false;
  if (on && !audio.sizzle) {
    const length = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.6;
    const amp = ctx.createGain();
    amp.gain.value = 0.035;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    source.start();
    audio.sizzle = { source, amp };
  }
  if (!on && audio.sizzle) {
    try { audio.sizzle.source.stop(); } catch (error) { /* already stopped */ }
    audio.sizzle = null;
  }
}
