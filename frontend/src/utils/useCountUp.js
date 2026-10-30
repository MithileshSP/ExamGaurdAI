import { useEffect, useRef, useState } from 'react';

// A number that glides to its new value instead of jumping, so a change is easy to see.
export default function useCountUp(target, ms = 400) {
  const [shown, setShown] = useState(target);
  const last = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      last.current = target;
      setShown(target);
      return;
    }
    const from = last.current, start = performance.now();
    let frame;
    const step = (now) => {
      const k = Math.min((now - start) / ms, 1);
      last.current = from + (target - from) * (1 - (1 - k) ** 3); // ease out
      setShown(last.current);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return shown;
}
