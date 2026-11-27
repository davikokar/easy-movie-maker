// Usage: node scripts/analyze-rss.mjs 7.3. Joins results/<id>-renderer-rss.txt with each channel's time window.
import { readFileSync } from 'node:fs';

const id = process.argv[2] ?? '7.3';
const result = JSON.parse(readFileSync(`results/${id}-result.json`, 'utf8'));
const samples = readFileSync(`results/${id}-renderer-rss.txt`, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/).map(Number))
  .filter((a) => a.length === 2 && a[0] > 1e9 && a[1] > 0)
  .map(([t, kb]) => [t, Math.round(kb / 1024)]);

for (const c of result.channels) {
  if (!c.startedAtMs) continue;
  const start = Math.floor(c.startedAtMs / 1000);
  const end = Math.ceil(c.endedAtMs / 1000);
  const during = samples.filter(([t]) => t >= start && t <= end).map(([, mib]) => mib);
  const before = samples.filter(([t]) => t < start).at(-1)?.[1];
  const after = samples.filter(([t]) => t > end && t <= end + 4).at(-1)?.[1];
  console.log(
    `${c.channel.padEnd(36)} ${String(c.megabytesPerSecond).padStart(6)} MB/s  renderer MiB: before ${before ?? '-'}, during ${Math.min(...during)}..${Math.max(...during)}, 4 s after ${after ?? '-'}`,
  );
}
