// Stage 7.4: decoder throughput, concurrency, and seek latency on long-GOP 4K HEVC and short-GOP 720p H.264 proxies.
// Clips are generated here with the WebCodecs encoder, then decoded from memory; frames are closed, not rendered.
import { log, median, percentile } from './common.js';

const FPS = 30;
const SECONDS = 10;
const FRAME_COUNT = FPS * SECONDS;

const ORIGINAL = { label: 'original-4k-hevc', codec: 'hvc1.1.6.L153.B0', width: 3840, height: 2160, bitrate: 40_000_000, gop: 60 };
const PROXY = { label: 'proxy-720p-h264', codec: 'avc1.64001f', width: 1280, height: 720, bitrate: 4_000_000, gop: 15 };

const waitForDequeue = (decoder) => new Promise((resolve) => decoder.addEventListener('dequeue', resolve, { once: true }));
const withTimeout = (promise, ms, what) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${what}`)), ms))]);

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSourceCanvas(width, height) {
  const rand = mulberry32(7);
  const canvas = new OffscreenCanvas(width + 400, height + 400);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `hsl(${Math.floor(rand() * 360)} ${40 + Math.floor(rand() * 50)}% ${20 + Math.floor(rand() * 60)}%)`;
    ctx.fillRect(rand() * canvas.width, rand() * canvas.height, 20 + rand() * 300, 20 + rand() * 300);
  }
  return canvas;
}

async function generateClip(spec) {
  const chunks = [];
  let decoderConfig = null;
  let error = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      chunks.push({ type: chunk.type, timestamp: chunk.timestamp, duration: chunk.duration, data });
      if (meta?.decoderConfig && !decoderConfig) decoderConfig = meta.decoderConfig;
    },
    error: (e) => {
      error = `${e.name}: ${e.message}`;
    },
  });
  const config = {
    codec: spec.codec,
    width: spec.width,
    height: spec.height,
    framerate: FPS,
    bitrate: spec.bitrate,
    latencyMode: 'quality',
    ...(spec.codec.startsWith('avc') ? { avc: { format: 'avc' } } : {}),
  };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) return { spec, error: 'encoder config not supported' };
  const started = performance.now();
  encoder.configure(config);
  const source = makeSourceCanvas(spec.width, spec.height);
  const canvas = new OffscreenCanvas(spec.width, spec.height);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < FRAME_COUNT && !error; i++) {
    ctx.drawImage(source, -((i * 3) % 400), -((i * 2) % 400));
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % spec.gop === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 4 && !error) await new Promise((r) => encoder.addEventListener('dequeue', r, { once: true }));
  }
  if (!error) await encoder.flush();
  encoder.close();
  const bytes = chunks.reduce((sum, c) => sum + c.data.byteLength, 0);
  return {
    spec,
    chunks,
    decoderConfig,
    error,
    encodeSeconds: +((performance.now() - started) / 1000).toFixed(1),
    megabits: +((bytes * 8) / 1e6 / SECONDS).toFixed(1),
    keyFrames: chunks.filter((c) => c.type === 'key').length,
  };
}

const toChunk = (c) => new EncodedVideoChunk({ type: c.type, timestamp: c.timestamp, duration: c.duration, data: c.data });

async function decodeRange(clip, hardwareAcceleration, from = 0, to = clip.chunks.length) {
  let frames = 0;
  let error = null;
  const decoder = new VideoDecoder({
    output: (frame) => {
      frames++;
      frame.close();
    },
    error: (e) => {
      error = `${e.name}: ${e.message}`;
    },
  });
  const config = { ...clip.decoderConfig, hardwareAcceleration };
  const support = await VideoDecoder.isConfigSupported(config);
  if (!support.supported) return { error: 'decoder config not supported', frames: 0 };
  const started = performance.now();
  try {
    decoder.configure(config);
    for (let i = from; i < to && !error; i++) {
      decoder.decode(toChunk(clip.chunks[i]));
      while (decoder.decodeQueueSize > 8 && !error) await waitForDequeue(decoder);
    }
    if (!error) await withTimeout(decoder.flush(), 30000, 'flush');
  } catch (e) {
    error = error ?? `${e.name}: ${e.message}`;
  }
  const seconds = (performance.now() - started) / 1000;
  if (decoder.state !== 'closed') decoder.close();
  return { error, frames, expected: to - from, seconds: +seconds.toFixed(2), fps: +(frames / seconds).toFixed(1) };
}

async function seekLatencies(clip, hardwareAcceleration, count = 25) {
  const rand = mulberry32(99);
  const keyIndices = clip.chunks.map((c, i) => (c.type === 'key' ? i : -1)).filter((i) => i >= 0);
  let error = null;
  let frames = 0;
  const decoder = new VideoDecoder({
    output: (frame) => {
      frames++;
      frame.close();
    },
    error: (e) => {
      error = `${e.name}: ${e.message}`;
    },
  });
  const config = { ...clip.decoderConfig, hardwareAcceleration };
  const latencies = [];
  try {
    decoder.configure(config);
    for (let n = 0; n < count && !error; n++) {
      const target = Math.floor(rand() * clip.chunks.length);
      const key = keyIndices.filter((k) => k <= target).at(-1);
      const started = performance.now();
      decoder.reset();
      decoder.configure(config);
      for (let i = key; i <= target; i++) decoder.decode(toChunk(clip.chunks[i]));
      await withTimeout(decoder.flush(), 10000, 'seek flush');
      latencies.push(performance.now() - started);
    }
  } catch (e) {
    error = error ?? `${e.name}: ${e.message}`;
  }
  if (decoder.state !== 'closed') decoder.close();
  const round = (v) => (v === null ? null : +v.toFixed(1));
  return { error, count: latencies.length, medianMs: round(median(latencies)), p95Ms: round(percentile(latencies, 0.95)), maxMs: round(Math.max(...latencies)) };
}

async function decoderLimit(clip, hardwareAcceleration, max = 12) {
  const open = [];
  let ok = 0;
  let failure = null;
  try {
    for (let n = 1; n <= max; n++) {
      let error = null;
      let frames = 0;
      const decoder = new VideoDecoder({
        output: (frame) => {
          frames++;
          frame.close();
        },
        error: (e) => {
          error = `${e.name}: ${e.message}`;
        },
      });
      open.push(decoder);
      decoder.configure({ ...clip.decoderConfig, hardwareAcceleration });
      for (let i = 0; i < 4; i++) decoder.decode(toChunk(clip.chunks[i]));
      await withTimeout(decoder.flush(), 8000, `decoder ${n} flush`);
      if (error || frames === 0) {
        failure = error ?? `decoder ${n} produced no frames`;
        break;
      }
      ok = n;
    }
  } catch (e) {
    failure = `${e.name}: ${e.message}`;
  }
  for (const d of open) if (d.state !== 'closed') d.close();
  return { maxConcurrentWorking: ok, testedUpTo: max, firstFailure: failure };
}

export async function run() {
  const capability = {};
  for (const spec of [ORIGINAL, PROXY]) {
    const c = { codec: spec.codec, codedWidth: spec.width, codedHeight: spec.height };
    capability[spec.label] = {
      decodeHardware: (await VideoDecoder.isConfigSupported({ ...c, hardwareAcceleration: 'prefer-hardware' })).supported,
      decodeSoftware: (await VideoDecoder.isConfigSupported({ ...c, hardwareAcceleration: 'prefer-software' })).supported,
    };
  }
  log(`capability: ${JSON.stringify(capability)}`);

  log('generating clips...');
  const original = await generateClip(ORIGINAL);
  const proxy = await generateClip(PROXY);
  const clipInfo = (c) => ({ label: c.spec.label, error: c.error ?? null, frames: c.chunks?.length, keyFrames: c.keyFrames, megabitsPerSecond: c.megabits, encodeSeconds: c.encodeSeconds });
  log(`clips: ${JSON.stringify([clipInfo(original), clipInfo(proxy)])}`);
  if (original.error || proxy.error) return { stage: '7.4', capability, clips: [clipInfo(original), clipInfo(proxy)], error: 'clip generation failed' };

  const hw = 'prefer-hardware';
  const r = { stage: '7.4', capability, clips: [clipInfo(original), clipInfo(proxy)], decode: {}, seek: {}, limits: {} };

  r.decode.original4kSingleHardware = await decodeRange(original, hw);
  r.decode.original4kSingleSoftware = await decodeRange(original, 'prefer-software');
  log(`original single: hw ${JSON.stringify(r.decode.original4kSingleHardware)} sw ${JSON.stringify(r.decode.original4kSingleSoftware)}`);
  r.decode.original4kTwoSimultaneous = await Promise.all([decodeRange(original, hw), decodeRange(original, hw)]);
  log(`original x2: ${JSON.stringify(r.decode.original4kTwoSimultaneous)}`);
  r.decode.proxySingle = await decodeRange(proxy, hw);
  r.decode.proxyTwoSimultaneous = await Promise.all([decodeRange(proxy, hw), decodeRange(proxy, hw)]);
  log(`proxy x2: ${JSON.stringify(r.decode.proxyTwoSimultaneous)}`);
  r.decode.proxyPlusOriginal = await Promise.all([decodeRange(proxy, hw), decodeRange(original, hw)]);
  log(`proxy + original: ${JSON.stringify(r.decode.proxyPlusOriginal)}`);

  r.seek.original4k = await seekLatencies(original, hw);
  r.seek.proxy = await seekLatencies(proxy, hw);
  log(`seek: original ${JSON.stringify(r.seek.original4k)} proxy ${JSON.stringify(r.seek.proxy)}`);

  r.limits.original4kHardware = await decoderLimit(original, hw);
  r.limits.proxyHardware = await decoderLimit(proxy, hw);
  log(`limits: ${JSON.stringify(r.limits)}`);

  const fpsOf = (list) => list.map((d) => d.fps);
  r.verdict = {
    twoProxyDecodesRealTime30fps: fpsOf(r.decode.proxyTwoSimultaneous).every((f) => f >= 30) ? 'PASS' : 'FAIL',
    proxySeekUnder300ms: r.seek.proxy.p95Ms !== null && r.seek.proxy.p95Ms < 300 ? 'PASS' : 'FAIL',
    original4kExportDecodeAtLeast10fps: r.decode.original4kSingleHardware.fps >= 10 ? 'PASS' : 'FAIL',
    note: 'Decode only: no rendering, texture upload, or audio runs alongside.',
  };
  return r;
}
