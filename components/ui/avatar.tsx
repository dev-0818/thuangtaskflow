import { initials } from "@/lib/utils";

type AvatarProps = {
  name: string;
  className?: string;
};

export function Avatar({ name, className = "" }: AvatarProps) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-surface-container-high text-label-md font-semibold text-primary ${className}`}>
      {initials(name)}
    </div>
  );
}
