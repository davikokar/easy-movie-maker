import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
cpSync('src', 'www', { recursive: true });
cpSync('node_modules/mediabunny/dist/bundles/mediabunny.min.mjs', 'www/mediabunny.min.mjs');
