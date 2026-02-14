/**
 * Synthesised voice-channel sound effects (Discord-style).
 * Uses the Web Audio API — no external audio files needed.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Play a tone at the given frequency for `dur` seconds starting at `when`. */
function tone(
  ac: AudioContext,
  dest: AudioNode,
  freq: number,
  dur: number,
  when: number,
  type: OscillatorType = 'sine',
  volume = 0.18,
) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur)
  osc.connect(gain).connect(dest)
  osc.start(when)
  osc.stop(when + dur)
}

// ── public API ──────────────────────────────────────────────

/** Rising two-tone chime — user joins a voice channel. */
export function playJoinSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 880, 0.12, t, 'sine', 0.15)
  tone(ac, ac.destination, 1175, 0.15, t + 0.08, 'sine', 0.15)
}

/** Falling two-tone — user leaves a voice channel. */
export function playLeaveSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 660, 0.12, t, 'sine', 0.15)
  tone(ac, ac.destination, 440, 0.18, t + 0.08, 'sine', 0.15)
}

/** Short low click — mute. */
export function playMuteSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 480, 0.06, t, 'triangle', 0.12)
}

/** Short higher click — unmute. */
export function playUnmuteSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 640, 0.06, t, 'triangle', 0.12)
}

/** Double low tone — deafen. */
export function playDeafenSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 440, 0.08, t, 'triangle', 0.12)
  tone(ac, ac.destination, 330, 0.10, t + 0.07, 'triangle', 0.12)
}

/** Double higher tone — undeafen. */
export function playUndeafenSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 550, 0.08, t, 'triangle', 0.12)
  tone(ac, ac.destination, 720, 0.10, t + 0.07, 'triangle', 0.12)
}

/** Soft rising ping — viewer started watching your stream. */
export function playViewerJoinSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 1050, 0.09, t, 'sine', 0.10)
  tone(ac, ac.destination, 1320, 0.12, t + 0.07, 'sine', 0.10)
}

/** Soft falling ping — viewer stopped watching your stream. */
export function playViewerLeaveSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 1050, 0.09, t, 'sine', 0.10)
  tone(ac, ac.destination, 790, 0.12, t + 0.07, 'sine', 0.10)
}

/** Descending three-tone — a stream (screen share) ended. */
export function playStreamEndedSound() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, ac.destination, 880, 0.10, t, 'sine', 0.13)
  tone(ac, ac.destination, 660, 0.10, t + 0.09, 'sine', 0.13)
  tone(ac, ac.destination, 440, 0.16, t + 0.18, 'sine', 0.13)
}
