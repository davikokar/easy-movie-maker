import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index';

describe('media entry point', () => {
  it('exposes its package name', () => {
    const name = PACKAGE_NAME;

    expect(name).toBe('@moviemaker/media');
  });
});
