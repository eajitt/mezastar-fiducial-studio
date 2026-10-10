// Retro Arcade Sound FX Synthesizer using Web Audio API
const MezaAudio = (function() {
  let ctx = null;
  let isMuted = false;

  function init() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone(freq, type, duration, gainStart = 0.2, gainEnd = 0.001) {
    if (isMuted) return;
    init();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainStart, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainEnd, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio error catch
    }
  }

  // Sound: Tag Detected / Lock-on
  function playScan() {
    if (isMuted) return;
    init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // Sound: Tag Slide / Rush Forward
  function playSlide() {
    if (isMuted) return;
    init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {}
  }

  // Sound: Impact / Attack Explosion
  function playAttack() {
    if (isMuted) return;
    init();
    if (!ctx) return;

    try {
      // Noise burst for explosion
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (e) {}
  }

  // Sound: Critical Hit
  function playCritical() {
    if (isMuted) return;
    playTone(523.25, 'triangle', 0.08, 0.2); // C5
    setTimeout(() => playTone(659.25, 'triangle', 0.08, 0.2), 80); // E5
    setTimeout(() => playTone(783.99, 'triangle', 0.08, 0.2), 160); // G5
    setTimeout(() => playTone(1046.50, 'triangle', 0.25, 0.25), 240); // C6
  }

  // Sound: Button Tap
  function playClick() {
    playTone(440, 'sine', 0.04, 0.08);
  }

  function toggleMute() {
    isMuted = !isMuted;
    return isMuted;
  }

  return {
    init,
    playScan,
    playSlide,
    playAttack,
    playCritical,
    playClick,
    toggleMute,
    getMuted: () => isMuted
  };
})();
