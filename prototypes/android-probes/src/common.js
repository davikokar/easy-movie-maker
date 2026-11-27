// No bundler: call the native bridge directly instead of importing @capacitor/core.
export const Probe = new Proxy({}, { get: (_, method) => (options = {}) => window.Capacitor.nativePromise('Probe', method, options) });

export function log(message) {
  const el = document.getElementById('log');
  el.textContent += `${message}\n`;
  el.scrollTop = el.scrollHeight;
  console.log(message);
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
}

export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : null;
}

export async function saveResult(name, result) {
  const device = await Probe.deviceInfo();
  const full = { ...result, device, userAgent: navigator.userAgent, finishedAt: new Date().toISOString() };
  const { path } = await Probe.saveResult({ name, json: JSON.stringify(full, null, 2) });
  log(`Saved ${path}`);
  return full;
}
