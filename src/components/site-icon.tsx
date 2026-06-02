"use client";

import { useState } from "react";

type SiteIconProps = {
  src?: string | null;
  label: string;
  imgClassName?: string;
  fallbackClassName?: string;
  alt?: string;
};

export function SiteIcon({
  src,
  label,
  imgClassName,
  fallbackClassName,
  alt,
}: SiteIconProps) {
  const [hasError, setHasError] = useState(false);
  const fallbackText = label.trim().slice(0, 1).toUpperCase() || "?";

  if (!src || hasError) {
    return <span className={fallbackClassName}>{fallbackText}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={imgClassName}
      src={src}
      alt={alt ?? label}
      onError={() => setHasError(true)}
    />
  );
}
