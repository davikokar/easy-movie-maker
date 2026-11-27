// Stage 7.2: can the Android WebView encode H.264 and AAC and mux them into an MP4? Same checks as 7.1.
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
} from './mediabunny.min.mjs';
import { log } from './common.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const SECONDS = 3;
const SAMPLE_RATE = 48000;
const CHANNELS = 2;

const AVC_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42001f'];
const ACCELERATION = ['no-preference', 'prefer-hardware', 'prefer-software'];

const videoConfig = (codec, hardwareAcceleration) => ({
  codec,
  width: WIDTH,
  height: HEIGHT,
  framerate: FPS,
  bitrate: 8_000_000,
  hardwareAcceleration,
  avc: { format: 'avc' },
});
const AAC_CONFIG = { codec: 'mp4a.40.2', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS, bitrate: 128_000 };

async function isSupported(Encoder, config) {
  if (typeof Encoder === 'undefined') return 'API missing';
  try {
    return (await Encoder.isConfigSupported(config)).supported ? 'yes' : 'no';
  } catch (e) {
    return `error: ${e.message}`;
  }
}

const waitForDequeue = (encoder) => new Promise((resolve) => encoder.addEventListener('dequeue', resolve, { once: true }));

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
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
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
  return { ok, error, packets, chunks: chunks.length, expected, hasDescription, encodeSeconds: +seconds.toFixed(2), encodeFps: +(chunks.length / seconds).toFixed(1) };
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
        for (let i = 0; i < block; i++) data[c * block + i] = 0.3 * Math.sin((2 * Math.PI * 440 * (offset + i)) / SAMPLE_RATE);
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

async function muxToMp4(videoPackets, audioPackets) {
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const videoSource = new EncodedVideoPacketSource('avc');
  const audioSource = new EncodedAudioPacketSource('aac');
  output.addVideoTrack(videoSource, { frameRate: FPS });
  output.addAudioTrack(audioSource);
  await output.start();
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
  const info = {
    bytes: buffer.byteLength,
    mimeType: await input.getMimeType(),
    durationSeconds: +duration.toFixed(3),
    videoCodec: videoTrack ? await videoTrack.getCodec() : null,
    videoFrames: videoTrack ? (await videoTrack.computePacketStats()).packetCount : 0,
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

export async function run() {
  const support = { video: [], audio: [], other: {} };
  for (const codec of AVC_CODECS) {
    for (const accel of ACCELERATION) {
      support.video.push({ codec, accel, supported: await isSupported(globalThis.VideoEncoder, videoConfig(codec, accel)) });
    }
  }
  support.audio.push({ codec: AAC_CONFIG.codec, supported: await isSupported(globalThis.AudioEncoder, AAC_CONFIG) });
  support.other.opusEncode = await isSupported(globalThis.AudioEncoder, { codec: 'opus', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS, bitrate: 128_000 });
  support.other.vp9Encode = await isSupported(globalThis.VideoEncoder, { codec: 'vp09.00.10.08', width: WIDTH, height: HEIGHT, framerate: FPS, bitrate: 8_000_000 });
  support.other.hevcEncode4k = await isSupported(globalThis.VideoEncoder, { codec: 'hvc1.1.6.L153.B0', width: 3840, height: 2160, framerate: FPS, bitrate: 40_000_000 });
  support.other.hevcDecode4k = (await VideoDecoder.isConfigSupported({ codec: 'hvc1.1.6.L153.B0', codedWidth: 3840, codedHeight: 2160 })).supported ? 'yes' : 'no';
  log(`support: ${JSON.stringify(support.video.filter((v) => v.accel === 'no-preference'))} aac=${support.audio[0].supported}`);

  const pick = support.video.find((v) => v.supported === 'yes' && v.accel === 'no-preference');
  const videoRun = pick ? await encodeVideo(videoConfig(pick.codec, 'no-preference')) : null;
  log(`video encode: ${videoRun ? `${videoRun.chunks}/${videoRun.expected} frames, ${videoRun.encodeFps} fps, error=${videoRun.error}` : 'no supported config'}`);
  const audioRun = support.audio[0].supported === 'yes' ? await encodeAudio(AAC_CONFIG) : null;
  log(`audio encode: ${audioRun ? `${audioRun.chunks} chunks, error=${audioRun.error}` : 'not supported'}`);

  const withoutPackets = ({ packets, ...rest }) => rest;
  let mp4 = null;
  if (videoRun?.ok && audioRun?.ok) {
    try {
      mp4 = await muxToMp4(videoRun.packets, audioRun.packets);
    } catch (e) {
      mp4 = { ok: false, error: `${e.name}: ${e.message}` };
    }
    log(`mp4: ${JSON.stringify(mp4)}`);
  }
  return {
    stage: '7.2',
    settings: { WIDTH, HEIGHT, FPS, SECONDS, SAMPLE_RATE, CHANNELS },
    support,
    encode: {
      video: videoRun ? { codec: pick.codec, ...withoutPackets(videoRun) } : null,
      audio: audioRun ? { codec: AAC_CONFIG.codec, ...withoutPackets(audioRun) } : null,
    },
    mp4,
    verdict: {
      h264EncodeViaWebCodecs: videoRun?.ok ? 'PASS' : 'FAIL',
      aacEncodeViaWebCodecs: audioRun?.ok ? 'PASS' : 'FAIL',
      mp4Mux: mp4 ? (mp4.ok ? 'PASS' : 'FAIL') : 'FAIL (no encoded streams to mux)',
    },
  };
}
