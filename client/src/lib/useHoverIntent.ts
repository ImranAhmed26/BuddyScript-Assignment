import { useRef, useState } from 'react';

// closeDelayMs gives the cursor time to travel diagonally into the popover
// without it slamming shut the moment the pointer leaves the trigger
export function useHoverIntent(closeDelayMs = 350) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };

  const scheduleHide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), closeDelayMs);
  };

  // same as scheduleHide but skips the delay, for explicit dismissal
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return { open, show, scheduleHide, hide };
}
