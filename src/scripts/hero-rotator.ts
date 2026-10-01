/**
 * Shows the hero headline's endings one after another and stops on the last one.
 *
 * `root` holds one child per ending; the child on show carries `data-active`, and the
 * stylesheet does the fading. Nothing here measures or moves anything.
 */
export interface Rotator {
  /** Jumps straight to the last ending and ends the rotation. */
  finish(): void;
}

export function startRotator(
  root: HTMLElement,
  opts: { intervalMs: number; onChange?: (index: number) => void },
): Rotator {
  const endings = Array.from(root.children);
  const last = endings.length - 1;
  let index = Math.max(
    0,
    endings.findIndex((ending) => ending.hasAttribute('data-active')),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;

  function show(next: number) {
    if (next === index) return;
    endings[index].removeAttribute('data-active');
    index = next;
    endings[index].setAttribute('data-active', '');
    opts.onChange?.(index);
  }

  function wait() {
    timer =
      index < last
        ? setTimeout(() => {
            show(index + 1);
            wait();
          }, opts.intervalMs)
        : undefined;
  }

  wait();

  return {
    finish() {
      clearTimeout(timer);
      timer = undefined;
      show(last);
    },
  };
}
