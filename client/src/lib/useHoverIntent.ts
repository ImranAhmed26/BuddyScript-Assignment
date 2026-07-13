import { useRef, useState } from 'react';

/** Keeps a hover popover open briefly after pointer-leave so diagonal mouse travel doesn't close it early. */
export function useHoverIntent(closeDelayMs = 350) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    // Cancel any pending close from a previous leave.
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };

  // On mouse-leave, give the user closeDelayMs to re-enter before closing.
  const scheduleHide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), closeDelayMs);
  };

  // Immediate close with no grace period, e.g. explicit dismissal.
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return { open, show, scheduleHide, hide };
}
