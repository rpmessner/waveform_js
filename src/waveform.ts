/**
 * Waveform - Web Audio transport layer
 */

import * as AudioContextManager from './audio-context';
import { playOscillator, SYNTH_TYPES } from './synths/oscillator';
import { playFMSynth, isFMSynth } from './synths/fm-synth';
import { playSampleWithNote } from './synths/sampler';
import { Samples } from './samples/index';
import { createScheduler } from './scheduler';
import type {
  WaveformInstance,
  WaveformOptions,
  SoundParams,
  PlaybackNodes,
  SchedulerInstance,
  SampleManager,
  Hap,
  HapQueryFn,
  ProgressCallback,
  Unsubscribe
} from './types';

/**
 * Create a Waveform instance - Web Audio transport layer
 */
export const createWaveform = (options: WaveformOptions = {}): WaveformInstance => {
  let initialized = false;
  let scheduler: SchedulerInstance | null = null;

  /**
   * Ensure waveform is initialized
   */
  const ensureInitialized = (): void => {
    if (!initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
  };

  /**
   * Play a sound with SuperDirt-compatible parameters
   */
  const play = (params: SoundParams, startTime: number | null = null): PlaybackNodes => {
    ensureInitialized();

    const audioContext = AudioContextManager.getContext()!;
    const masterGain = AudioContextManager.getMasterGain()!;

    const synthType = params.s || 'sine';
    const variant = params.n ?? null;

    console.log(`[waveform.play] s=${synthType}, n=${variant}, startTime=${startTime}, currentTime=${audioContext.currentTime}`);

    // Check if this is a loaded sample
    const sampleBuffer = Samples.get(synthType, variant);

    console.log(`[waveform.play] sampleBuffer=${!!sampleBuffer}`);

    if (sampleBuffer) {
      return playSampleWithNote(audioContext, masterGain, sampleBuffer, params, startTime);
    }

    if (isFMSynth(synthType)) {
      return playFMSynth(audioContext, masterGain, { ...params, preset: synthType }, startTime);
    }

    // Play basic oscillator synth
    const oscType = SYNTH_TYPES[synthType] || 'sine';
    return playOscillator(audioContext, masterGain, { ...params, type: oscType }, startTime);
  };

  /**
   * Initialize the audio context
   */
  const init = async (): Promise<WaveformInstance> => {
    await AudioContextManager.init(options);

    // Initialize sample manager with the audio context
    Samples.init(AudioContextManager.getContext()!);

    // Initialize scheduler with play function
    scheduler = createScheduler({
      audioContext: AudioContextManager.getContext()!,
      playFn: play,
      config: options.scheduler
    });

    initialized = true;
    return api;
  };

  // Audio context methods
  const suspend = (): Promise<void> => AudioContextManager.suspend();
  const resume = (): Promise<void> => AudioContextManager.resume();
  const close = async (): Promise<void> => {
    initialized = false;
    return AudioContextManager.close();
  };
  const getContext = (): AudioContext | null => AudioContextManager.getContext();
  const getState = (): string => AudioContextManager.getState();
  const setMasterGain = (gain: number, rampTime?: number): void => AudioContextManager.setMasterGain(gain, rampTime);
  const getMasterGain = (): number => AudioContextManager.getMasterGainValue();
  const getAnalyser = (): AnalyserNode | null => AudioContextManager.getAnalyser();
  const getFrequencyData = (): Uint8Array | null => AudioContextManager.getFrequencyData();
  const getTimeDomainData = (): Uint8Array | null => AudioContextManager.getTimeDomainData();

  // Sample methods
  const loadSample = async (name: string, url: string): Promise<AudioBuffer> => {
    ensureInitialized();
    return Samples.load(name, url);
  };

  const loadSamples = async (samples: Record<string, string>): Promise<Record<string, AudioBuffer>> => {
    ensureInitialized();
    return Samples.loadMultiple(samples);
  };

  const loadSamplesWithProgress = async (
    samples: Record<string, string>,
    onProgress: ProgressCallback
  ): Promise<Record<string, AudioBuffer>> => {
    ensureInitialized();
    return Samples.loadWithProgress(samples, onProgress);
  };

  const loadSampleBank = async (
    manifestUrl: string,
    onProgress?: ProgressCallback
  ): Promise<Record<string, AudioBuffer>> => {
    ensureInitialized();
    return Samples.loadBank(manifestUrl, onProgress);
  };

  const getSamples = (): SampleManager => Samples;

  // Scheduler methods
  const getScheduler = (): SchedulerInstance | null => scheduler;

  const schedulePattern = (id: string, hapsOrQueryFn: Hap[] | HapQueryFn): void => {
    ensureInitialized();
    scheduler!.schedulePattern(id, hapsOrQueryFn);
  };

  const updatePattern = (id: string, hapsOrQueryFn: Hap[] | HapQueryFn): void => {
    ensureInitialized();
    scheduler!.updatePattern(id, hapsOrQueryFn);
  };

  const stopPattern = (id: string): boolean => {
    if (!initialized) return false;
    return scheduler!.stopPattern(id);
  };

  const hush = (): void => {
    if (scheduler) scheduler.hush();
  };

  const startScheduler = (): void => {
    ensureInitialized();
    scheduler!.start();
  };

  const stopScheduler = (): void => {
    if (scheduler) scheduler.stop();
  };

  const isSchedulerRunning = (): boolean => scheduler ? scheduler.isRunning() : false;

  const setCps = (cps: number): void => {
    ensureInitialized();
    scheduler!.setCps(cps);
  };

  const getCps = (): number => scheduler ? scheduler.getCps() : 0.5;

  const setBpm = (bpm: number): void => {
    ensureInitialized();
    scheduler!.setBpm(bpm);
  };

  const getBpm = (): number => scheduler ? scheduler.getBpm() : 120;

  const getCurrentCycle = (): number => scheduler ? scheduler.getCurrentCycle() : 0;

  const onCycle = (callback: (cycle: number) => void): Unsubscribe => {
    ensureInitialized();
    return scheduler!.onCycle(callback);
  };

  const onHap = (callback: (hap: Hap, startTime: number, cycle: number) => void): Unsubscribe => {
    ensureInitialized();
    return scheduler!.onHap(callback);
  };

  // Public API
  const api: WaveformInstance = {
    // Core
    init,
    play,
    // Audio context
    suspend,
    resume,
    close,
    getContext,
    getState,
    setMasterGain,
    getMasterGain,
    getAnalyser,
    getFrequencyData,
    getTimeDomainData,
    // Samples
    loadSample,
    loadSamples,
    loadSamplesWithProgress,
    loadSampleBank,
    getSamples,
    // Scheduler
    getScheduler,
    schedulePattern,
    updatePattern,
    stopPattern,
    hush,
    startScheduler,
    stopScheduler,
    isSchedulerRunning,
    setCps,
    getCps,
    setBpm,
    getBpm,
    getCurrentCycle,
    onCycle,
    onHap
  };

  return api;
};
