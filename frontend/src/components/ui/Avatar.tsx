"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/Primitives";

function initials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-24 w-24 text-2xl",
  };

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name} profile photo` : "Profile photo"}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full border object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-label={name ? `${name} avatar` : "Default avatar"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white",
        sizes[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
