// Stage 7.3: how fast can the WebView stream a large export file to native storage (MediaStore)?
// Compares the channels candidate for ExportSink (architecture sections 11 and 13.3).
import { Probe, log } from './common.js';

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

function makeChunk(size) {
  const buf = new Uint8Array(size);
  let x = 0x9e3779b9;
  for (let i = 0; i < size; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    buf[i] = x & 255;
  }
  return buf;
}

async function memorySample(sentBytes) {
  const m = await Probe.memory();
  return {
    sentMiB: Math.round(sentBytes / MiB),
    nativePssMiB: Math.round(m.totalPssKb / 1024),
    nativeHeapMiB: Math.round(m.nativeHeapKb / 1024),
    javaHeapMiB: Math.round(m.javaHeapKb / 1024),
    jsHeapMiB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / MiB),
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function runChannel({ name, totalBytes, chunkSize, windowSize, send }) {
  const result = { channel: name, totalMiB: totalBytes / MiB, chunkMiB: chunkSize / MiB, windowSize, startedAtMs: Date.now() };
  const chunk = makeChunk(chunkSize);
  const samples = [];
  try {
    await Probe.sinkOpen({ name: `probe-${name}.mp4` });
    samples.push(await memorySample(0));
    const step = Math.max(chunkSize, Math.floor(totalBytes / 8));
    let nextSample = step;
    let sent = 0;
    const inflight = new Set();
    const started = performance.now();
    while (sent < totalBytes) {
      const p = send(chunk).then(() => inflight.delete(p));
      inflight.add(p);
      sent += chunkSize;
      if (inflight.size >= windowSize) await Promise.race(inflight);
      if (sent >= nextSample) {
        samples.push(await memorySample(sent));
        nextSample += step;
      }
    }
    await Promise.all(inflight);
    const { bytes } = await Probe.sinkClose();
    const seconds = (performance.now() - started) / 1000;
    samples.push(await memorySample(sent));
    const mid = samples[Math.floor(samples.length / 2)];
    const last = samples[samples.length - 1];
    Object.assign(result, {
      seconds: +seconds.toFixed(2),
      megabytesPerSecond: +(sent / 1e6 / seconds).toFixed(1),
      bytesSent: sent,
      bytesWrittenByNative: bytes,
      byteCountMatches: bytes === sent,
      nativePssDriftMiB: last.nativePssMiB - mid.nativePssMiB,
      jsHeapDriftMiB: last.jsHeapMiB - mid.jsHeapMiB,
    });
  } catch (e) {
    result.error = `${e && e.message ? e.message : e}`;
  } finally {
    await Probe.sinkDelete().catch(() => {});
  }
  result.endedAtMs = Date.now();
  result.samples = samples;
  log(`${name}: ${result.error ?? `${result.megabytesPerSecond} MB/s in ${result.seconds}s, native PSS drift ${result.nativePssDriftMiB} MiB, JS heap drift ${result.jsHeapDriftMiB} MiB`}`);
  await new Promise((resolve) => setTimeout(resolve, 4000)); // settle so the renderer can release memory
  return result;
}

export async function run() {
  const features = await Probe.features();
  log(`features: ${JSON.stringify(features)}`);
  const channels = [];

  channels.push(
    await runChannel({
      name: 'capacitor-base64',
      totalBytes: 64 * MiB,
      chunkSize: 1 * MiB,
      windowSize: 1,
      send: async (chunk) => Probe.sinkWriteBase64({ data: await blobToBase64(new Blob([chunk])) }),
    }),
  );

  const { port } = await Probe.httpStart();
  const url = `http://127.0.0.1:${port}/write`;
  channels.push(
    await runChannel({
      name: 'loopback-http-post',
      totalBytes: 1 * GiB,
      chunkSize: 4 * MiB,
      windowSize: 2,
      send: async (chunk) => {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: chunk });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      },
    }),
  );

  if (features.webMessageListener && features.webMessageArrayBuffer && typeof nativeSink !== 'undefined') {
    const pending = [];
    nativeSink.onmessage = (event) => {
      const waiter = pending.shift();
      if (typeof event.data === 'string' && event.data.startsWith('ok:')) waiter.resolve();
      else waiter.reject(new Error(String(event.data)));
    };
    channels.push(
      await runChannel({
        name: 'web-message-listener-arraybuffer',
        totalBytes: 1 * GiB,
        chunkSize: 4 * MiB,
        windowSize: 4,
        send: (chunk) =>
          new Promise((resolve, reject) => {
            pending.push({ resolve, reject });
            nativeSink.postMessage(chunk.buffer);
          }),
      }),
    );
  } else {
    channels.push({ channel: 'web-message-listener-arraybuffer', error: `not available: ${JSON.stringify(features)}, nativeSink=${typeof nativeSink}` });
  }

  // Provisional "flat memory": native PSS and JS heap grow by no more than 50 MiB between the midpoint and the end.
  // The renderer's own memory is not visible from JS; scripts/run.sh samples it from outside (SAMPLE_RSS=1).
  const smallChunks = [];
  smallChunks.push(
    await runChannel({
      name: 'loopback-http-post-1MiB-2GiB',
      totalBytes: 2 * GiB,
      chunkSize: 1 * MiB,
      windowSize: 2,
      send: async (chunk) => {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: chunk });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      },
    }),
  );
  if (typeof nativeSink !== 'undefined' && features.webMessageArrayBuffer) {
    const pending = [];
    nativeSink.onmessage = (event) => {
      const waiter = pending.shift();
      if (typeof event.data === 'string' && event.data.startsWith('ok:')) waiter.resolve();
      else waiter.reject(new Error(String(event.data)));
    };
    smallChunks.push(
      await runChannel({
        name: 'web-message-listener-1MiB-2GiB',
        totalBytes: 2 * GiB,
        chunkSize: 1 * MiB,
        windowSize: 4,
        send: (chunk) =>
          new Promise((resolve, reject) => {
            pending.push({ resolve, reject });
            nativeSink.postMessage(chunk.buffer);
          }),
      }),
    );
  }
  channels.push(...smallChunks);

  const verdict = Object.fromEntries(
    channels.map((c) => [
      c.channel,
      c.error ? 'FAIL (error)' : c.megabytesPerSecond >= 20 && c.byteCountMatches && c.nativePssDriftMiB <= 50 && c.jsHeapDriftMiB <= 50 ? 'PASS' : 'FAIL',
    ]),
  );
  return { stage: '7.3', criterion: 'at least 20 MB/s with flat memory, 1 GB to MediaStore', channels, verdict };
}
