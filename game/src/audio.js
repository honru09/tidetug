// Every sound in TIDETUG is synthesised here with oscillators — no audio files, nothing to
// load. The context is created lazily on the first user gesture (browsers refuse it sooner),
// and every call is a no-op until then and while muted.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
    return true;
  }

  function tone(freqFrom, freqTo, seconds, type = 'sine', volume = 1, delay = 0) {
    if (muted || !ensure()) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  return {
    /** Call from any click or keypress: unlocks the context the browser was holding back. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone(660, 660, 0.06, 'triangle', 0.5);
    },
    pod(streak) {
      const base = 520 + Math.min(streak, 10) * 40;
      tone(base, base * 1.5, 0.11, 'sine', 0.8);
      tone(base * 2, base * 2, 0.07, 'triangle', 0.3, 0.03);
    },
    graze() {
      tone(1180, 900, 0.05, 'square', 0.18);
    },
    hit() {
      tone(160, 45, 0.28, 'sawtooth', 0.9);
      tone(90, 40, 0.32, 'square', 0.5, 0.02);
    },
    level() {
      tone(440, 440, 0.07, 'triangle', 0.5);
      tone(587, 587, 0.07, 'triangle', 0.5, 0.07);
      tone(880, 880, 0.1, 'triangle', 0.5, 0.14);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, index) => tone(freq, freq, 0.16, 'triangle', 0.6, index * 0.09));
    },
    lose() {
      tone(392, 392, 0.14, 'triangle', 0.6);
      tone(330, 330, 0.14, 'triangle', 0.6, 0.13);
      tone(262, 120, 0.34, 'triangle', 0.6, 0.26);
    },
  };
}
