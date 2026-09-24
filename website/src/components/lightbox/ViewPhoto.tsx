"use client";

// Makes a photo a button that opens it full screen in its group's slideshow.
// It fills the photo's frame, so the whole picture is the target.
import { useOpenPhoto } from "./LightboxProvider";
import type { PhotoGroup } from "@/lib/content";

export default function ViewPhoto({
  group,
  index,
  label,
  className,
  style,
  children,
}: {
  group: PhotoGroup;
  index: number;
  /** what the photo shows, for the button's accessible name */
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const open = useOpenPhoto();
  return (
    <button
      type="button"
      className={`photo-open${className ? ` ${className}` : ""}`}
      style={style}
      onClick={() => open(group, index)}
      aria-label={`View photo: ${label}`}
    >
      {children}
    </button>
  );
}
