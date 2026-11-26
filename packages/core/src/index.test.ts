import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index';

describe('core entry point', () => {
  it('exposes its package name', () => {
    const name = PACKAGE_NAME;

    expect(name).toBe('@moviemaker/core');
  });

  it('runs without a DOM', () => {
    const hasDocument = typeof (globalThis as { document?: unknown }).document;

    expect(hasDocument).toBe('undefined');
  });
});
