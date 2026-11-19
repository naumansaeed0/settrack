import { useEffect, useState } from "react";
export function AnimatedNumber({ value }: { value: string }) {
  const target = Number(value.replaceAll(",", ""));
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (
      !Number.isFinite(target) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const progress = Math.min(1, (now - start) / 200);
      setShown(
        new Intl.NumberFormat("en-GB").format(
          Math.round(target * (1 - (1 - progress) ** 3)),
        ),
      );
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [value, target]);
  return (
    <span>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
