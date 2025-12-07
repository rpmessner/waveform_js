/**
 * Delay effect with feedback
 * SuperDirt-compatible parameters: delay, delaytime, delayfeedback
 */

import type { SoundParams, DelayNodes } from '../types';

/**
 * Create a delay effect node
 */
export function createDelay(
  audioContext: AudioContext,
  params: SoundParams = {}
): DelayNodes | null {
  const delay = params.delay ?? 0;
  const delaytime = params.delaytime ?? 0.5;
  const delayfeedback = params.delayfeedback ?? 0.5;

  // If delay is 0, return null (passthrough)
  if (delay <= 0) {
    return null;
  }

  // Create nodes
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const delayNode = audioContext.createDelay(5.0); // Max 5 second delay
  const feedbackGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const dryGain = audioContext.createGain();

  // Set parameters
  delayNode.delayTime.value = Math.min(delaytime, 5.0);
  feedbackGain.gain.value = Math.min(delayfeedback, 0.95); // Cap to prevent runaway
  wetGain.gain.value = delay;
  dryGain.gain.value = 1;

  // Connect: input -> dry -> output
  //          input -> delay -> wet -> output
  //                   delay -> feedback -> delay (loop)
  input.connect(dryGain);
  input.connect(delayNode);
  delayNode.connect(wetGain);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  wetGain.connect(output);
  dryGain.connect(output);

  return {
    input,
    output,
    delayNode,
    feedbackGain,
    wetGain,
    dryGain
  };
}

/** Ping-pong delay nodes */
export interface PingPongDelayNodes {
  input: GainNode;
  output: GainNode;
  delayL: DelayNode;
  delayR: DelayNode;
  feedbackL: GainNode;
  feedbackR: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
}

/**
 * Create a ping-pong stereo delay
 */
export function createPingPongDelay(
  audioContext: AudioContext,
  params: SoundParams = {}
): PingPongDelayNodes | null {
  const delay = params.delay ?? 0;
  const delaytime = params.delaytime ?? 0.5;
  const delayfeedback = params.delayfeedback ?? 0.5;

  if (delay <= 0) {
    return null;
  }

  // Create nodes
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const splitter = audioContext.createChannelSplitter(2);
  const merger = audioContext.createChannelMerger(2);

  const delayL = audioContext.createDelay(5.0);
  const delayR = audioContext.createDelay(5.0);
  const feedbackL = audioContext.createGain();
  const feedbackR = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const dryGain = audioContext.createGain();

  // Set parameters
  delayL.delayTime.value = Math.min(delaytime, 5.0);
  delayR.delayTime.value = Math.min(delaytime * 0.75, 5.0); // Slight offset for stereo
  feedbackL.gain.value = Math.min(delayfeedback, 0.95);
  feedbackR.gain.value = Math.min(delayfeedback, 0.95);
  wetGain.gain.value = delay;
  dryGain.gain.value = 1;

  // Dry path
  input.connect(dryGain);
  dryGain.connect(output);

  // Wet path with ping-pong
  input.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);

  // Cross-feedback for ping-pong effect
  delayL.connect(feedbackR);
  delayR.connect(feedbackL);
  feedbackL.connect(delayL);
  feedbackR.connect(delayR);

  // Merge back to stereo
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(wetGain);
  wetGain.connect(output);

  return {
    input,
    output,
    delayL,
    delayR,
    feedbackL,
    feedbackR,
    wetGain,
    dryGain
  };
}
