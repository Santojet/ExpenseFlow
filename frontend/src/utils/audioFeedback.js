/**
 * Audio feedback utility using Web Audio API
 */

const getAudioContext = () => {
  const isSoundEnabled = localStorage.getItem("ef_sound_enabled") !== "false";
  if (!isSoundEnabled) return null;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  const ctx = new AudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
};

// Generic success (already present)
export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

    osc2.frequency.setValueAtTime(783.99, now + 0.04); // G5
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.16); // C6

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    setTimeout(() => { ctx.close(); }, 500);
  } catch {}
}

// 1. Expense added (Ka-ching! cash register sound effect approximation)
export function playExpenseSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // High-pitched chime for coins
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
    
    setTimeout(() => { ctx.close(); }, 300);
  } catch {}
}

// 2. Debt added (Lower pitched 'thud/pop' indicating pending liability/asset)
export function playDebtSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
    
    setTimeout(() => { ctx.close(); }, 300);
  } catch {}
}

// 3. Salary/Income added (Uplifting arpeggio)
export function playSalarySound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // C4, E4, G4, C5 arpeggio
    osc.frequency.setValueAtTime(261.63, now);
    osc.frequency.setValueAtTime(329.63, now + 0.1);
    osc.frequency.setValueAtTime(392.00, now + 0.2);
    osc.frequency.setValueAtTime(523.25, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.setValueAtTime(0.08, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    setTimeout(() => { ctx.close(); }, 600);
  } catch {}
}
