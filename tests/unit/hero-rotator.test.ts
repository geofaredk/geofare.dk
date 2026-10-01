import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startRotator } from '../../src/scripts/hero-rotator';

// The rotator only reads `children` and sets one attribute, so plain objects stand in for the DOM.
function fakeRotator(count: number, active = 0) {
  const endings = Array.from({ length: count }, (_, i) => {
    const attributes = new Set<string>(i === active ? ['data-active'] : []);
    return {
      attributes,
      hasAttribute: (name: string) => attributes.has(name),
      setAttribute: (name: string) => void attributes.add(name),
      removeAttribute: (name: string) => void attributes.delete(name),
    };
  });
  const root = { children: endings } as unknown as HTMLElement;
  const active_ = () => endings.flatMap((ending, i) => (ending.attributes.has('data-active') ? [i] : []));
  return { root, active: active_ };
}

describe('startRotator', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('shows each ending in order for one interval and reports every change', () => {
    const { root, active } = fakeRotator(5);
    const changes: number[] = [];
    startRotator(root, { intervalMs: 3000, onChange: (index) => changes.push(index) });

    expect(active()).toEqual([0]);
    expect(changes).toEqual([]);
    vi.advanceTimersByTime(2999);
    expect(active()).toEqual([0]);
    for (const index of [1, 2, 3, 4]) {
      vi.advanceTimersByTime(index === 1 ? 1 : 3000);
      expect(active()).toEqual([index]);
    }
    expect(changes).toEqual([1, 2, 3, 4]);
  });

  it('stops on the last ending and never loops', () => {
    const { root, active } = fakeRotator(5);
    const changes: number[] = [];
    startRotator(root, { intervalMs: 3000, onChange: (index) => changes.push(index) });

    vi.advanceTimersByTime(12_000);
    expect(active()).toEqual([4]);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(active()).toEqual([4]);
    expect(changes).toEqual([1, 2, 3, 4]);
  });

  it('finish() jumps straight to the last ending and cancels the rest', () => {
    const { root, active } = fakeRotator(5);
    const changes: number[] = [];
    const rotator = startRotator(root, { intervalMs: 3000, onChange: (index) => changes.push(index) });

    vi.advanceTimersByTime(3000);
    rotator.finish();
    expect(active()).toEqual([4]);
    expect(changes).toEqual([1, 4]);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(active()).toEqual([4]);
    expect(changes).toEqual([1, 4]);
  });

  it('finish() after the rotation has ended changes nothing', () => {
    const { root, active } = fakeRotator(3);
    const changes: number[] = [];
    const rotator = startRotator(root, { intervalMs: 100, onChange: (index) => changes.push(index) });

    vi.advanceTimersByTime(200);
    rotator.finish();
    rotator.finish();
    expect(active()).toEqual([2]);
    expect(changes).toEqual([1, 2]);
  });

  it('with a single ending there is nothing to rotate', () => {
    const { root, active } = fakeRotator(1);
    const onChange = vi.fn();
    startRotator(root, { intervalMs: 3000, onChange }).finish();
    expect(vi.getTimerCount()).toBe(0);
    expect(active()).toEqual([0]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
