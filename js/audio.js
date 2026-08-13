/**
 * AudioEngine - Web Audio API Synthesizer & Sound Effects
 * Native browser audio generation without external file dependencies.
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmTimer = null;
    this.bgmPlaying = false;
    this.bgmStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }

  // --- Sound Effects ---

  // Correct Answer Bell (เสียงกระดิ่งใสกังวาน + ก้องกังวานแบบไทย)
  playBell() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    // Multi-frequency bell harmonics
    const freqs = [1046.5, 1318.5, 1567.98, 2093]; // C6, E6, G6, C7
    freqs.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25 / (index + 1), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + index * 0.05);
      osc.stop(now + 2.0);
    });
  }

  // Coin Collect Sound (เสียงเหรียญทองหล่นโปรยลงมา)
  playCoinSound() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const notes = [987.77, 1318.51, 1567.98, 1975.53]; // B5, E6, G6, B6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.32);
    });
  }

  // Hold Timer Tick (เสียงติ๊กนับถอยหลัง 3-2-1)
  playTick(pitchShift = 1) {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 * pitchShift, now);
    osc.frequency.exponentialRampToValueAtTime(800 * pitchShift, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Button Click
  playClick() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Skip Sound (เสียงฟึ่บ/ข้ามข้อ)
  playSkip() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  // Fanfare / Game Victory
  playFanfare() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((note, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.65);
    });
  }

  // --- Dynamic Procedural BGM (ตื่นเต้น เร้าใจ สไตล์ประยุกต์) ---
  startBGM() {
    if (this.isMuted || this.bgmPlaying) return;
    this.init();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    const melodyScale = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5, D5, E5, G5, A5
    const stepInterval = 220; // ms per sixteenth note beat (~136 BPM)

    this.bgmTimer = setInterval(() => {
      if (!this.bgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Bass drum & percussion rhythm
      if (this.bgmStep % 4 === 0 || this.bgmStep % 8 === 6) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }

      // Percussive tick/hi-hat on offbeats
      if (this.bgmStep % 2 === 1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }

      // Melodic notes
      if (this.bgmStep % 2 === 0) {
        const noteIdx = (this.bgmStep / 2) % melodyScale.length;
        const noteFreq = melodyScale[(noteIdx * 2 + (this.bgmStep % 5)) % melodyScale.length];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(noteFreq, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      }

      this.bgmStep = (this.bgmStep + 1) % 32;
    }, stepInterval);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundEngine = new AudioEngine();
