import {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  Input,
  Mp4OutputFormat,
  Output,
} from './node_modules/mediabunny/dist/bundles/mediabunny.min.mjs';

// Settings match the default export preset (architecture section 11): 1080p30, 48 kHz stereo.
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const SECONDS = 3;
const SAMPLE_RATE = 48000;
const CHANNELS = 2;

const AVC_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42001f'];
const ACCELERATION = ['no-preference', 'prefer-hardware', 'prefer-software'];

function videoConfig(codec, hardwareAcceleration) {
  return {
    codec,
    width: WIDTH,
    height: HEIGHT,
    framerate: FPS,
    bitrate: 8_000_000,
    hardwareAcceleration,
    avc: { format: 'avc' },
  };
}

const AAC_CONFIG = { codec: 'mp4a.40.2', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS, bitrate: 128_000 };
const FALLBACK_CONFIGS = {
  vp9: { codec: 'vp09.00.10.08', width: WIDTH, height: HEIGHT, framerate: FPS, bitrate: 8_000_000 },
  opus: { codec: 'opus', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS, bitrate: 128_000 },
};

async function isSupported(Encoder, config) {
  if (typeof Encoder === 'undefined') return 'API missing';
  try {
    return (await Encoder.isConfigSupported(config)).supported ? 'yes' : 'no';
  } catch (e) {
    return `error: ${e.message}`;
  }
}

function waitForDequeue(encoder) {
  return new Promise((resolve) => encoder.addEventListener('dequeue', resolve, { once: true }));
}

async function encodeVideo(config) {
  const chunks = [];
  const packets = [];
  let error = null;
  let hasDescription = false;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      chunks.push({ type: chunk.type, timestamp: chunk.timestamp });
      packets.push({ packet: EncodedPacket.fromEncodedChunk(chunk), meta });
      if (meta?.decoderConfig?.description) hasDescription = true;
    },
    error: (e) => {
      error = `${e.name}: ${e.message}`;
    },
  });
  const started = performance.now();
  try {
    encoder.configure(config);
    const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    const frameCount = FPS * SECONDS;
    for (let i = 0; i < frameCount && !error; i++) {
      ctx.fillStyle = `hsl(${(i * 4) % 360} 70% 50%)`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.fillRect((i * 20) % (WIDTH - 200), HEIGHT / 2 - 100, 200, 200);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round((i * 1e6) / FPS),
        duration: Math.round(1e6 / FPS),
      });
      encoder.encode(frame, { keyFrame: i % FPS === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 8 && !error) await waitForDequeue(encoder);
    }
    if (!error) await encoder.flush();
  } catch (e) {
    error = error ?? `${e.name}: ${e.message}`;
  }
  if (encoder.state !== 'closed') encoder.close();
  const seconds = (performance.now() - started) / 1000;
  const expected = FPS * SECONDS;
  const ok = !error && chunks.length === expected && chunks[0]?.type === 'key' && hasDescription;
  return { ok, error, packets, chunks: chunks.length, expected, hasDescription, encodeSeconds: +seconds.toFixed(2) };
}

async function encodeAudio(config) {
  const chunks = [];
  const packets = [];
  let error = null;
  let hasDescription = false;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      chunks.push({ timestamp: chunk.timestamp, duration: chunk.duration });
      packets.push({ packet: EncodedPacket.fromEncodedChunk(chunk), meta });
      if (meta?.decoderConfig?.description) hasDescription = true;
    },
    error: (e) => {
      error = `${e.name}: ${e.message}`;
    },
  });
  const started = performance.now();
  try {
    encoder.configure(config);
    const block = 4800;
    for (let offset = 0; offset < SAMPLE_RATE * SECONDS && !error; offset += block) {
      const data = new Float32Array(block * CHANNELS);
      for (let c = 0; c < CHANNELS; c++) {
        for (let i = 0; i < block; i++) {
          data[c * block + i] = 0.3 * Math.sin((2 * Math.PI * 440 * (offset + i)) / SAMPLE_RATE);
        }
      }
      const audio = new AudioData({
        format: 'f32-planar',
        sampleRate: SAMPLE_RATE,
        numberOfFrames: block,
        numberOfChannels: CHANNELS,
        timestamp: Math.round((offset * 1e6) / SAMPLE_RATE),
        data,
      });
      encoder.encode(audio);
      audio.close();
    }
    if (!error) await encoder.flush();
  } catch (e) {
    error = error ?? `${e.name}: ${e.message}`;
  }
  if (encoder.state !== 'closed') encoder.close();
  const seconds = (performance.now() - started) / 1000;
  const last = chunks[chunks.length - 1];
  const coveredSeconds = last ? (last.timestamp + (last.duration ?? 0)) / 1e6 : 0;
  const ok = !error && chunks.length > 0 && coveredSeconds >= SECONDS - 0.1 && hasDescription;
  return { ok, error, packets, chunks: chunks.length, coveredSeconds: +coveredSeconds.toFixed(2), hasDescription, encodeSeconds: +seconds.toFixed(2) };
}

// Muxes our own encoder output, as export will (architecture section 11), then reads the file back.
async function muxToMp4(videoPackets, audioPackets) {
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const videoSource = new EncodedVideoPacketSource('avc');
  const audioSource = new EncodedAudioPacketSource('aac');
  output.addVideoTrack(videoSource, { frameRate: FPS });
  output.addAudioTrack(audioSource);
  await output.start();

  // Interleave by timestamp so the muxer does not buffer a whole track.
  let v = 0;
  let a = 0;
  while (v < videoPackets.length || a < audioPackets.length) {
    const takeVideo = a >= audioPackets.length || (v < videoPackets.length && videoPackets[v].packet.timestamp <= audioPackets[a].packet.timestamp);
    if (takeVideo) {
      const { packet, meta } = videoPackets[v++];
      await videoSource.add(packet, meta);
    } else {
      const { packet, meta } = audioPackets[a++];
      await audioSource.add(packet, meta);
    }
  }
  videoSource.close();
  audioSource.close();
  await output.finalize();

  const buffer = output.target.buffer;
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(buffer) });
  const videoTrack = await input.getPrimaryVideoTrack();
  const audioTrack = await input.getPrimaryAudioTrack();
  const duration = await input.computeDuration();
  const videoFrames = videoTrack ? (await videoTrack.computePacketStats()).packetCount : 0;
  const info = {
    bytes: buffer.byteLength,
    mimeType: await input.getMimeType(),
    durationSeconds: +duration.toFixed(3),
    videoCodec: videoTrack ? await videoTrack.getCodec() : null,
    videoFrames,
    videoWidth: videoTrack ? await videoTrack.getDisplayWidth() : null,
    videoCanDecode: videoTrack ? await videoTrack.canDecode() : false,
    audioCodec: audioTrack ? await audioTrack.getCodec() : null,
    audioSampleRate: audioTrack ? await audioTrack.getSampleRate() : null,
    audioChannels: audioTrack ? await audioTrack.getNumberOfChannels() : null,
    audioCanDecode: audioTrack ? await audioTrack.canDecode() : false,
  };
  input.dispose();
  const ok =
    info.videoCodec === 'avc' &&
    info.audioCodec === 'aac' &&
    info.videoFrames === FPS * SECONDS &&
    Math.abs(info.durationSeconds - SECONDS) < 0.1 &&
    info.videoWidth === WIDTH &&
    info.audioSampleRate === SAMPLE_RATE &&
    info.audioChannels === CHANNELS;
  return { ok, ...info };
}

function cell(text, cls) {
  const td = document.createElement('td');
  td.textContent = String(text);
  if (cls) td.className = cls;
  return td;
}

function renderTable(title, header, rows) {
  const h = document.createElement('h2');
  h.textContent = title;
  const table = document.createElement('table');
  const head = table.insertRow();
  for (const name of header) {
    const th = document.createElement('th');
    th.textContent = name;
    head.appendChild(th);
  }
  for (const row of rows) {
    const tr = table.insertRow();
    for (const value of row) {
      const cls = value === 'yes' || value === 'PASS' ? 'yes' : value === 'no' || value === 'FAIL' ? 'no' : '';
      tr.appendChild(cell(value, cls));
    }
  }
  document.getElementById('out').append(h, table);
}

async function main() {
  const support = { video: [], audio: [], fallbacks: {} };
  for (const codec of AVC_CODECS) {
    for (const accel of ACCELERATION) {
      support.video.push({ codec, accel, supported: await isSupported(globalThis.VideoEncoder, videoConfig(codec, accel)) });
    }
  }
  support.audio.push({ codec: AAC_CONFIG.codec, supported: await isSupported(globalThis.AudioEncoder, AAC_CONFIG) });
  support.fallbacks.vp9 = await isSupported(globalThis.VideoEncoder, FALLBACK_CONFIGS.vp9);
  support.fallbacks.opus = await isSupported(globalThis.AudioEncoder, FALLBACK_CONFIGS.opus);

  const videoPick = support.video.find((v) => v.supported === 'yes' && v.accel === 'no-preference');
  const videoRun = videoPick ? await encodeVideo(videoConfig(videoPick.codec, 'no-preference')) : null;
  const audioRun = support.audio[0].supported === 'yes' ? await encodeAudio(AAC_CONFIG) : null;
  const withoutPackets = ({ packets, ...rest }) => rest;
  const encode = {
    video: videoRun ? { codec: videoPick.codec, ...withoutPackets(videoRun) } : null,
    audio: audioRun ? { codec: AAC_CONFIG.codec, ...withoutPackets(audioRun) } : null,
  };

  let mp4 = null;
  if (videoRun?.ok && audioRun?.ok) {
    try {
      mp4 = await muxToMp4(videoRun.packets, audioRun.packets);
    } catch (e) {
      mp4 = { ok: false, error: `${e.name}: ${e.message}` };
    }
  }

  const h264Pass = Boolean(encode.video?.ok);
  const aacPass = Boolean(encode.audio?.ok);
  const result = {
    userAgent: navigator.userAgent,
    settings: { WIDTH, HEIGHT, FPS, SECONDS, SAMPLE_RATE, CHANNELS },
    support,
    encode,
    mp4,
    verdict: {
      h264EncodeViaWebCodecs: h264Pass ? 'PASS' : 'FAIL',
      aacEncodeViaWebCodecs: aacPass ? 'PASS' : 'FAIL',
      mp4Mux: mp4 ? (mp4.ok ? 'PASS' : 'FAIL') : 'FAIL (no encoded streams to mux)',
    },
  };

  document.getElementById('status').textContent = `H.264: ${result.verdict.h264EncodeViaWebCodecs}, AAC: ${result.verdict.aacEncodeViaWebCodecs}, MP4: ${result.verdict.mp4Mux}. Result saved to results/.`;
  renderTable('isConfigSupported', ['Codec', 'Hardware acceleration', 'Supported'], support.video.map((v) => [v.codec, v.accel, v.supported]));
  renderTable('Fallback codecs (information only)', ['Codec', 'Supported'], [
    ['AAC mp4a.40.2', support.audio[0].supported],
    ['VP9', support.fallbacks.vp9],
    ['Opus', support.fallbacks.opus],
  ]);
  renderTable('Real encode, 3 s', ['Stream', 'Result', 'Chunks', 'Detail'], [
    ['H.264 1080p30', result.verdict.h264EncodeViaWebCodecs, encode.video?.chunks ?? '-', encode.video?.error ?? (videoPick ? `${encode.video.encodeSeconds}s` : 'no supported config')],
    ['AAC 48 kHz stereo', result.verdict.aacEncodeViaWebCodecs, encode.audio?.chunks ?? '-', encode.audio?.error ?? (encode.audio ? `${encode.audio.encodeSeconds}s` : 'not supported')],
  ]);
  renderTable('MP4 mux and read-back (Mediabunny)', ['Check', 'Value'], mp4 ? Object.entries(mp4).map(([k, v]) => [k, v]) : [['mux', 'skipped']]);
  window.probeHost.report(result);
}

main().catch((e) => {
  document.getElementById('status').textContent = `Probe crashed: ${e.message}`;
  window.probeHost.report({ crashed: String(e && e.stack ? e.stack : e) });
});
