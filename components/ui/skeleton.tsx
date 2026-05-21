import { cn } from "@/lib/utils";

type Variant = "row" | "card" | "panel" | "text" | "avatar";

const HEIGHTS: Record<Variant, string> = {
  row:    "h-10",
  card:   "h-24",
  panel:  "h-40",
  text:   "h-3",
  avatar: "h-8 w-8 rounded-full",
};

export function Skeleton({
  variant = "row",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-bg-subtle",
        HEIGHTS[variant],
        variant !== "avatar" && "w-full",
        className
      )}
    />
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}
