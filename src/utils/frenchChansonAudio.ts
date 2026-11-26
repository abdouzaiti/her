/**
 * Gentle 1970s French Chanson & Paris Café Romance Web Audio engine.
 * Plays an intimate 3/4 Parisian waltz (warm felt piano, nylon guitar waltz,
 * soft musette accordion swell, and subtle vinyl warmth) at a very soft
 * background volume ("sond khfiiiiiiiiif").
 */

interface BarDef {
  bass: number;
  chord: number[];
  pad: number[];
  /** Melody events within the 3-beat waltz bar: [beatOffset, midiNote, durationBeats] */
  melody: Array<[number, number, number]>;
}

// Key of F Major / D Minor — classic 1970s French chanson harmonic palette
// Includes the signature nostalgic IVmaj7 -> iv6 (Bbmaj7 -> Bbm6) Parisian cadence.
const WALTZ_BARS: BarDef[] = [
  // 1-4: Fmaj7 -> Dm9 -> Gm7 -> C9
  { bass: 41, chord: [57, 60, 64, 67], pad: [57, 64], melody: [[0, 69, 2], [2, 72, 1]] },
  { bass: 50, chord: [57, 60, 64, 65], pad: [57, 65], melody: [[0, 74, 1.5], [1.5, 72, 0.5], [2, 69, 1]] },
  { bass: 43, chord: [58, 62, 65, 69], pad: [58, 65], melody: [[0, 70, 2], [2, 69, 1]] },
  { bass: 48, chord: [58, 62, 64, 67], pad: [58, 64], melody: [[0, 67, 2.5]] },

  // 5-8: Am7 -> D7(b9) -> Gm7 -> C13
  { bass: 45, chord: [55, 60, 64, 67], pad: [55, 64], melody: [[0, 72, 2], [2, 76, 1]] },
  { bass: 50, chord: [54, 60, 63, 69], pad: [54, 63], melody: [[0, 75, 1.5], [1.5, 74, 0.5], [2, 72, 1]] },
  { bass: 43, chord: [58, 62, 65, 69], pad: [58, 65], melody: [[0, 74, 2], [2, 72, 1]] },
  { bass: 48, chord: [58, 64, 67, 69], pad: [58, 69], melody: [[0, 70, 1.5], [1.5, 69, 0.5], [2, 67, 1]] },

  // 9-12: Bbmaj7 -> Bbm6 (nostalgic French minor iv6!) -> Am7 -> D7
  { bass: 46, chord: [57, 62, 65, 69], pad: [57, 65], melody: [[0, 74, 2], [2, 77, 1]] },
  { bass: 46, chord: [56, 61, 65, 67], pad: [56, 65], melody: [[0, 76, 1.5], [1.5, 74, 0.5], [2, 73, 1]] },
  { bass: 45, chord: [55, 60, 64, 67], pad: [55, 64], melody: [[0, 72, 2], [2, 69, 1]] },
  { bass: 50, chord: [54, 60, 64, 69], pad: [54, 64], melody: [[0, 72, 1.5], [1.5, 70, 0.5], [2, 69, 1]] },

  // 13-16: Gm7 -> C9 -> Fmaj7 -> C7sus4
  { bass: 43, chord: [58, 62, 65, 69], pad: [58, 65], melody: [[0, 67, 1.5], [1.5, 69, 0.5], [2, 70, 1]] },
  { bass: 48, chord: [58, 62, 64, 67], pad: [58, 64], melody: [[0, 72, 1.5], [1.5, 70, 0.5], [2, 67, 1]] },
  { bass: 41, chord: [57, 60, 64, 69], pad: [57, 64], melody: [[0, 69, 3]] },
  { bass: 48, chord: [58, 60, 65, 67], pad: [58, 65], melody: [[0, 67, 2], [2, 65, 1]] },
];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const TARGET_MASTER_GAIN = 0.145; // Very soft, whisper-gentle background sound
const BEAT_SEC = 60 / 74; // Slow, dreamy 74 BPM 3/4 Paris café waltz

export class FrenchChansonPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private echoSend: GainNode | null = null;
  private vinylSource: AudioBufferSourceNode | null = null;
  private schedulerId: number | null = null;
  private barIndex = 0;
  private nextBarTime = 0;
  private isMuted = false;
  private isStarted = false;

  private ensureContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx) return true;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.25;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;

    // Warm master lowpass to give a cozy 1970s analog tape character
    const tapeTone = ctx.createBiquadFilter();
    tapeTone.type = 'lowpass';
    tapeTone.frequency.value = 2850;
    tapeTone.Q.value = 0.45;

    const musicBus = ctx.createGain();
    musicBus.gain.value = 1;

    // Soft Parisian room echo (damped stereo-feeling dual delay)
    const echoSend = ctx.createGain();
    echoSend.gain.value = 0.32;

    const delayL = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.29;
    const delayR = ctx.createDelay(1.0);
    delayR.delayTime.value = 0.43;

    const fbL = ctx.createGain();
    fbL.gain.value = 0.28;
    const fbR = ctx.createGain();
    fbR.gain.value = 0.24;

    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1150;

    echoSend.connect(delayL);
    echoSend.connect(delayR);
    delayL.connect(fbL);
    delayR.connect(fbR);
    fbL.connect(delayR);
    fbR.connect(delayL);
    delayL.connect(damp);
    delayR.connect(damp);
    damp.connect(tapeTone);

    musicBus.connect(tapeTone);
    musicBus.connect(echoSend);

    tapeTone.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.musicBus = musicBus;
    this.echoSend = echoSend;
    this.startVinylWarmth(ctx, masterGain);
    return true;
  }

  private startVinylWarmth(ctx: AudioContext, dest: GainNode) {
    // 3 seconds of whisper-soft warm brown-noise + tiny dust pops for 1970s vinyl ambiance
    const len = Math.floor(ctx.sampleRate * 3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      let sample = lastOut * 0.6;
      if (Math.random() < 0.00028) {
        sample += (Math.random() * 2 - 1) * 0.14;
      }
      data[i] = sample;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 0.6;

    const vinylGain = ctx.createGain();
    vinylGain.gain.value = 0.06;

    src.connect(filter);
    filter.connect(vinylGain);
    vinylGain.connect(dest);
    src.start();
    this.vinylSource = src;
  }

  private playWarmBass(midi: number, time: number, dur: number) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(170, time + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.32, time + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    osc.start(time);
    sub.start(time);
    osc.stop(time + dur + 0.05);
    sub.stop(time + dur + 0.05);
  }

  private playWaltzChord(notes: number[], time: number, dur: number) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;

    notes.forEach((midi, idx) => {
      const onset = time + idx * 0.018; // Gentle nylon guitar / felt piano roll
      const freq = midiToFreq(midi);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, onset);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1150, onset);
      filter.frequency.exponentialRampToValueAtTime(420, onset + dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, onset);
      gain.gain.linearRampToValueAtTime(0.075, onset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, onset + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus!);

      osc.start(onset);
      osc.stop(onset + dur + 0.06);
    });
  }

  private playAccordionPad(notes: number[], time: number, dur: number) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;

    notes.forEach((midi) => {
      const freq = midiToFreq(midi);
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscB.type = 'triangle';
      oscA.frequency.setValueAtTime(freq, time);
      oscB.frequency.setValueAtTime(freq * 1.0028, time); // Subtle warm musette reed chorus

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(720, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.032, time + dur * 0.42);
      gain.gain.linearRampToValueAtTime(0.0001, time + dur);

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus!);

      oscA.start(time);
      oscB.start(time);
      oscA.stop(time + dur + 0.08);
      oscB.stop(time + dur + 0.08);
    });
  }

  private playSingingMelody(midi: number, time: number, dur: number) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const freq = midiToFreq(midi);

    const oscMain = ctx.createOscillator();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, time);

    const oscHarm = ctx.createOscillator();
    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(freq * 2, time);

    // Gentle singing vibrato after initial attack
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.linearRampToValueAtTime(2.6, time + 0.32);
    lfo.connect(lfoGain);
    lfoGain.connect(oscMain.frequency);

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.14;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1750, time);
    filter.frequency.exponentialRampToValueAtTime(860, time + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.14, time + 0.045);
    env.gain.exponentialRampToValueAtTime(0.055, time + dur * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.18);

    oscMain.connect(filter);
    oscHarm.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(env);
    env.connect(this.musicBus);

    oscMain.start(time);
    oscHarm.start(time);
    lfo.start(time);
    oscMain.stop(time + dur + 0.25);
    oscHarm.stop(time + dur + 0.25);
    lfo.stop(time + dur + 0.25);
  }

  private scheduleBar(bar: BarDef, barStart: number) {
    const barDur = BEAT_SEC * 3;
    const human = (Math.random() - 0.5) * 0.014;

    // Beat 1: Bass + gentle musette accordion swell
    this.playWarmBass(bar.bass, barStart + human, BEAT_SEC * 1.4);
    this.playAccordionPad(bar.pad, barStart, barDur * 0.96);

    // Beats 2 & 3: Classic delicate 3/4 French waltz accompaniment chords
    this.playWaltzChord(bar.chord, barStart + BEAT_SEC + (Math.random() - 0.5) * 0.012, BEAT_SEC * 0.88);
    this.playWaltzChord(bar.chord, barStart + BEAT_SEC * 2 + (Math.random() - 0.5) * 0.012, BEAT_SEC * 0.85);

    // Lyrical chanson melody
    bar.melody.forEach(([beatOffset, midi, beats]) => {
      const mTime = barStart + beatOffset * BEAT_SEC + (Math.random() - 0.5) * 0.012;
      this.playSingingMelody(midi, mTime, beats * BEAT_SEC * 0.96);
    });
  }

  private scheduleAhead = () => {
    if (!this.ctx || !this.isStarted) return;
    const lookAhead = 1.4;
    while (this.nextBarTime < this.ctx.currentTime + lookAhead) {
      const bar = WALTZ_BARS[this.barIndex % WALTZ_BARS.length];
      this.scheduleBar(bar, this.nextBarTime);
      this.nextBarTime += BEAT_SEC * 3;
      this.barIndex++;
    }
  };

  async start(): Promise<boolean> {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }

    if (!this.isStarted) {
      this.isStarted = true;
      this.nextBarTime = this.ctx.currentTime + 0.08;
      this.scheduleAhead();
      this.schedulerId = window.setInterval(this.scheduleAhead, 450);
    }

    if (!this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(TARGET_MASTER_GAIN, now + 2.4);
    }
    return true;
  }

  async setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx || !this.masterGain) {
      if (!muted) {
        await this.start();
      }
      return;
    }

    if (!muted && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return;
      }
    }

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(
      muted ? 0.0001 : TARGET_MASTER_GAIN,
      now + (muted ? 0.55 : 1.4)
    );
  }

  dispose() {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    try {
      this.vinylSource?.stop();
    } catch {
      // ignore if already stopped
    }
    this.vinylSource = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.isStarted = false;
  }
}
