/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BeatListener = (beatNumber: number, time: number) => void;

class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private isRunning: boolean = false;
  private tempo: number = 72; // BPM
  private beatsPerMeasure: number = 4;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0.0;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // seconds
  private timerId: number | null = null;
  private listeners: Set<BeatListener> = new Set();

  private initAudio() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public subscribe(listener: BeatListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(beat: number, time: number) {
    this.listeners.forEach(fn => fn(beat, time));
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.audioContext) return;

    // Trigger visual pulse notification
    const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning) {
        this.notifyListeners(beatNumber, time);
      }
    }, delay);

    // Audio click synthesis
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    // Accent beat 0 with higher pitch and volume
    if (beatNumber === 0) {
      osc.frequency.value = 1000; // High click
      gain.gain.value = 0.8;
    } else {
      osc.frequency.value = 650; // Regular beat
      gain.gain.value = 0.4;
    }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private scheduler = () => {
    if (!this.audioContext) return;
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isRunning) {
      this.timerId = window.setTimeout(this.scheduler, this.lookahead);
    }
  };

  public start(tempo?: number, beats: number = 4) {
    if (tempo) this.tempo = tempo;
    this.beatsPerMeasure = beats;
    this.initAudio();

    if (this.isRunning) return;

    this.isRunning = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext!.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public toggle(tempo?: number, beats?: number): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start(tempo, beats);
      return true;
    }
  }

  public setTempo(newTempo: number) {
    this.tempo = Math.max(30, Math.min(300, newTempo));
  }

  public setBpm(newBpm: number) {
    this.setTempo(newBpm);
  }

  public onTick(listener: BeatListener) {
    return this.subscribe(listener);
  }

  public getTempo(): number {
    return this.tempo;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const metronome = new MetronomeEngine();
