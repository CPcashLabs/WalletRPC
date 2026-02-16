import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { CountUp } from '../../components/ui/CountUp';

describe('CountUp', () => {
  let frameId = 0;
  let now = 0;
  let rafQueue = new Map<number, FrameRequestCallback>();
  let rafSpy: ReturnType<typeof vi.fn>;
  let cancelSpy: ReturnType<typeof vi.fn>;

  const runOneFrame = (step = 16) => {
    now += step;
    const pending = [...rafQueue.entries()];
    rafQueue.clear();
    for (const [, cb] of pending) cb(now);
  };

  beforeEach(() => {
    frameId = 0;
    now = 0;
    rafQueue = new Map();
    rafSpy = vi.fn((cb: FrameRequestCallback) => {
      frameId += 1;
      rafQueue.set(frameId, cb);
      return frameId;
    });
    cancelSpy = vi.fn((id: number) => {
      rafQueue.delete(id);
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('支持前后缀与小数格式化', () => {
    render(<CountUp value="1,234.56789" decimals={2} prefix="$" suffix=" TRX" />);
    expect(screen.getByText('$1,234.57 TRX')).toBeInTheDocument();
  });

  it('数值变化时会动画推进到目标值', () => {
    const { rerender } = render(<CountUp value={1} decimals={0} duration={64} />);
    rerender(<CountUp value={10} decimals={0} duration={64} />);

    act(() => runOneFrame(16));
    act(() => runOneFrame(16));
    act(() => runOneFrame(16));
    act(() => runOneFrame(16));
    act(() => runOneFrame(16));

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('目标值未变化时不会创建动画帧', () => {
    const { rerender } = render(<CountUp value={5} decimals={0} />);
    rerender(<CountUp value={5} decimals={0} />);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('卸载时会取消未完成动画', () => {
    const { rerender, unmount } = render(<CountUp value={1} decimals={0} duration={1000} />);
    rerender(<CountUp value={20} decimals={0} duration={1000} />);
    expect(rafSpy).toHaveBeenCalled();
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });
});

