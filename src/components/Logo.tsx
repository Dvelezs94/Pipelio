import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";

type LogoProps = {
  href?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 28, text: "text-sm" },
  lg: { icon: 40, text: "text-xl" },
} as const;

export function Logo({ href, showName = true, size = "md", className }: LogoProps) {
  const { icon, text } = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2 shrink-0", className)}>
      <Image
        src="/pipelio-logo.png"
        alt=""
        width={icon}
        height={icon}
        className="rounded-md"
        priority
      />
      {showName && (
        <span className={cn("font-semibold text-primary tracking-tight", text)}>{APP_NAME}</span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity" aria-label={APP_NAME}>
        {content}
      </Link>
    );
  }

  return content;
}
