// Stage 7.5: sync pattern (flash plus beep every second) driven by the corrected audio clock (architecture 10.3).
// Part 1 records what the browser reports. Part 2 plays beeps through the speaker and listens with the
// microphone, to compare the real audio round trip with the reported latencies.
import { log, median, percentile } from './common.js';

const BEEPS = 20;
const LOOPBACK_BEEPS = 12;
const round = (v, digits = 1) => (v === null || v === undefined ? null : +v.toFixed(digits));

const TAP_WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0][0];
    if (channel) this.port.postMessage({ frame: currentFrame, samples: channel.slice() });
    return true;
  }
}
registerProcessor('tap', Tap);
`;

async function measureLoopback() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  const track = stream.getAudioTracks()[0];
  const settings = track.getSettings();
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  await ctx.resume();
  const workletUrl = URL.createObjectURL(new Blob([TAP_WORKLET], { type: 'text/javascript' }));
  await ctx.audioWorklet.addModule(workletUrl);
  const tap = new AudioWorkletNode(ctx, 'tap', { numberOfOutputs: 1, outputChannelCount: [1] });
  const blocks = [];
  tap.port.onmessage = (event) => blocks.push(event.data);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  ctx.createMediaStreamSource(stream).connect(tap).connect(mute).connect(ctx.destination);

  const sr = ctx.sampleRate;
  const startAt = ctx.currentTime + 1.5;
  const spacing = 0.8;
  for (let k = 0; k < LOOPBACK_BEEPS; k++) {
    const t = startAt + k * spacing;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.9, t + 0.002);
    gain.gain.setValueAtTime(0.9, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.052);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }
  const reportedOutputLatencyMs = [];
  const timer = setInterval(() => reportedOutputLatencyMs.push(ctx.outputLatency * 1000), 200);
  await new Promise((resolve) => setTimeout(resolve, (1.5 + LOOPBACK_BEEPS * spacing + 1) * 1000));
  clearInterval(timer);

  // Join the captured blocks into one timeline indexed by context frame.
  const first = blocks[0].frame;
  const total = blocks.at(-1).frame + blocks.at(-1).samples.length - first;
  const signal = new Float32Array(total);
  for (const b of blocks) signal.set(b.samples, b.frame - first);

  const rms = (from, len) => {
    let sum = 0;
    for (let i = from; i < from + len && i < total; i++) sum += signal[i] * signal[i];
    return Math.sqrt(sum / len);
  };
  const window = 16;
  const noiseEnd = Math.round(startAt * sr) - first - Math.floor(0.1 * sr);
  const noiseWindows = [];
  for (let i = 0; i + window < noiseEnd; i += window) noiseWindows.push(rms(i, window));
  const noise = median(noiseWindows) ?? 0;

  const roundTripsMs = [];
  const peaks = [];
  for (let k = 0; k < LOOPBACK_BEEPS; k++) {
    const expected = Math.round((startAt + k * spacing) * sr) - first;
    const searchEnd = Math.min(total - window, expected + Math.floor(0.6 * sr));
    let peak = 0;
    for (let i = expected; i < searchEnd; i += window) peak = Math.max(peak, rms(i, window));
    const threshold = Math.max(noise * 6, peak * 0.3);
    peaks.push(peak);
    if (peak < noise * 8 || peak < 0.003) continue;
    for (let i = expected; i < searchEnd; i++) {
      if (rms(i, window) >= threshold) {
        roundTripsMs.push(((i - expected) / sr) * 1000);
        break;
      }
    }
  }
  for (const t of stream.getTracks()) t.stop();
  await ctx.close();

  const mean = roundTripsMs.reduce((a, b) => a + b, 0) / (roundTripsMs.length || 1);
  const sd = Math.sqrt(roundTripsMs.reduce((a, b) => a + (b - mean) ** 2, 0) / (roundTripsMs.length || 1));
  return {
    beepsPlayed: LOOPBACK_BEEPS,
    beepsDetected: roundTripsMs.length,
    roundTripsMs: roundTripsMs.map((v) => round(v)),
    debug: {
      firstCapturedFrame: first,
      firstBeepFrameIndex: Math.round(startAt * sr) - first,
      capturedFrames: total,
      envelope10ms: Array.from({ length: Math.floor(total / 480) }, (_, i) => +rms(i * 480, 480).toFixed(4)),
    },
    roundTripMs: { median: round(median(roundTripsMs)), min: round(Math.min(...roundTripsMs)), max: round(Math.max(...roundTripsMs)), stdDev: round(sd) },
    reportedOutputLatencyMs: { median: round(median(reportedOutputLatencyMs)), min: round(Math.min(...reportedOutputLatencyMs)), max: round(Math.max(...reportedOutputLatencyMs)) },
    reportedBaseLatencyMs: round(ctx.baseLatency * 1000),
    micTrackLatencySettingMs: settings.latency === undefined ? null : round(settings.latency * 1000),
    micSampleRate: settings.sampleRate ?? null,
    noiseFloorRms: +noise.toFixed(5),
    peakRms: { median: +median(peaks).toFixed(4), min: +Math.min(...peaks).toFixed(4) },
    note: 'Round trip is speaker output plus microphone input plus one render block. It is not the output latency alone.',
  };
}

async function startContext() {
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  await ctx.resume().catch(() => {});
  if (ctx.state !== 'running') {
    log('AudioContext is suspended: tap the screen to start.');
    await new Promise((resolve) => document.addEventListener('pointerdown', resolve, { once: true }));
    await ctx.resume();
  }
  return ctx;
}

export async function run() {
  const ctx = await startContext();
  const flash = document.getElementById('flash');
  const startAt = ctx.currentTime + 1.5;
  for (let k = 0; k < BEEPS; k++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0, startAt + k);
    gain.gain.linearRampToValueAtTime(0.8, startAt + k + 0.002);
    gain.gain.setValueAtTime(0.8, startAt + k + 0.05);
    gain.gain.linearRampToValueAtTime(0, startAt + k + 0.052);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt + k);
    osc.stop(startAt + k + 0.06);
  }

  const frameIntervals = [];
  const overshoots = [];
  const latencySamples = [];
  let lastFrame = null;
  let lastSample = 0;
  let next = 0;
  let flashOffAt = 0;

  await new Promise((resolve) => {
    function frame(now) {
      if (lastFrame !== null) frameIntervals.push(now - lastFrame);
      lastFrame = now;
      const stamp = ctx.getOutputTimestamp();
      const heard = stamp.contextTime + (now - stamp.performanceTime) / 1000;
      if (now - lastSample > 500) {
        lastSample = now;
        latencySamples.push({
          baseLatencyMs: ctx.baseLatency * 1000,
          outputLatencyMs: ctx.outputLatency * 1000,
          // How far the device output position trails currentTime: what a naive clock gets wrong.
          currentTimeMinusOutputMs: (ctx.currentTime - stamp.contextTime) * 1000,
        });
      }
      if (next < BEEPS && heard >= startAt + next) {
        overshoots.push((heard - (startAt + next)) * 1000);
        flash.classList.add('on');
        flashOffAt = heard + 0.1;
        next++;
      }
      if (flash.classList.contains('on') && heard >= flashOffAt) flash.classList.remove('on');
      if (next >= BEEPS && !flash.classList.contains('on')) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  const stat = (key) => {
    const values = latencySamples.map((s) => s[key]);
    return { median: round(median(values)), min: round(Math.min(...values)), max: round(Math.max(...values)) };
  };
  const result = {
    stage: '7.5',
    sampleRate: ctx.sampleRate,
    contextState: ctx.state,
    baseLatencyMs: stat('baseLatencyMs'),
    outputLatencyMs: stat('outputLatencyMs'),
    currentTimeMinusOutputTimestampMs: stat('currentTimeMinusOutputMs'),
    frameIntervalMs: { median: round(median(frameIntervals)), p95: round(percentile(frameIntervals, 0.95)), max: round(Math.max(...frameIntervals)) },
    flashTriggerLateMs: { median: round(median(overshoots)), p95: round(percentile(overshoots, 0.95)), max: round(Math.max(...overshoots)) },
    verdict: 'Audio path: see loopback. Picture path (display latency) is not measured; it needs an external recording.',
  };
  log(JSON.stringify(result));
  await ctx.close();
  try {
    result.loopback = await measureLoopback();
  } catch (e) {
    result.loopback = { error: `${e.name}: ${e.message}` };
  }
  log(`loopback: ${JSON.stringify(result.loopback)}`);
  return result;
}
