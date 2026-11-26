import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index';

describe('audio entry point', () => {
  it('exposes its package name', () => {
    const name = PACKAGE_NAME;

    expect(name).toBe('@moviemaker/audio');
  });
});
