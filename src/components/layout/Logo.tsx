import Image from "next/image";

export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/logo_only.png"
      alt="Logo"
      width={50}
      height={50}
      priority
      className={className}
      style={{ height: "2.25rem", width: "auto" }}
    />
  );
}
