import { Probe, log, saveResult } from './common.js';

const probes = {
  '7.2': () => import('./probe-encoders.js'),
  '7.3': () => import('./probe-transfer.js'),
  '7.4': () => import('./probe-decoders.js'),
  '7.5': () => import('./probe-sync.js'),
};

async function runProbe(id) {
  log(`--- ${id} start`);
  try {
    await Probe.keepScreenOn({ on: true });
    const module = await probes[id]();
    const result = await module.run();
    await saveResult(`${id}-result`, result);
    log(`--- ${id} done`);
  } catch (e) {
    log(`--- ${id} crashed: ${e && e.stack ? e.stack : e}`);
    await saveResult(`${id}-result`, { crashed: String(e && e.stack ? e.stack : e) });
  }
}

for (const id of Object.keys(probes)) {
  document.getElementById(`b${id.replace('.', '')}`).addEventListener('click', () => runProbe(id));
}

const { probe } = await Probe.launchProbe();
if (probe) await runProbe(probe);
