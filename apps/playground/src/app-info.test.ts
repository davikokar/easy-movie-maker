import { describe, expect, it } from 'vitest';

import { PLAYGROUND_TITLE } from './app-info';

describe('playground app info', () => {
  it('names the playground', () => {
    const title = PLAYGROUND_TITLE;

    expect(title).toBe('MovieMaker Playground');
  });
});
