import { describe, expect, it, vi } from 'vitest';

import { ActionState, ActionTypes } from '../../src/api/ActionState';
import { Events } from '../../src/lib/core';

describe('# ActionState tests', () => {
  it('Should emit a download aborted event', async () => {
    const state = new ActionState(ActionTypes.Download);
    const abortListener = vi.fn();

    state.on(Events.Download.Abort, abortListener);
    state.stop();

    await new Promise((r) => setTimeout(r, 50));

    expect(abortListener).toHaveBeenCalledOnce();
  });

  it('Should emit an upload aborted event', async () => {
    const state = new ActionState(ActionTypes.Upload);
    const abortListener = vi.fn();

    state.on(Events.Upload.Abort, abortListener);
    state.stop();

    await new Promise((r) => setTimeout(r, 50));

    expect(abortListener).toHaveBeenCalledOnce();
  });
});
