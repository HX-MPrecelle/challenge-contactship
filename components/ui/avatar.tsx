import { cn } from "@/lib/utils";

const HUES = [15, 200, 270, 140, 30, 320, 240];

function hashHue(name: string): number {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return HUES[sum % HUES.length] as number;
}

export function Avatar({
  name,
  size = 28,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const hue = hashHue(name);

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        letterSpacing: "-0.01em",
        background: `oklch(0.94 0.03 ${hue})`,
        color: `oklch(0.42 0.10 ${hue})`,
      }}
    >
      {initials || "?"}
    </div>
  );
}
