import { useState } from "react";
import { cn } from "@/lib/utils";

const LOGO_URL = "/manus-storage/logo_nobg_4a51d334.png";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  invertImage?: boolean;
};

export default function BrandLogo({
  className,
  imageClassName,
  markClassName,
  textClassName,
  showText = true,
  invertImage = false,
}: BrandLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageFailed) {
    return (
      <img
        src={LOGO_URL}
        alt="닉스의 스몰톡"
        className={cn("h-10 w-auto", invertImage && "brightness-0 invert", imageClassName)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="닉스의 스몰톡">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground",
          markClassName
        )}
      >
        닉
      </span>
      {showText && (
        <span className={cn("whitespace-nowrap text-base font-bold text-foreground", textClassName)}>
          닉스의 스몰톡
        </span>
      )}
    </span>
  );
}
