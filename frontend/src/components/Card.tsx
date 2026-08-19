import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
      {...props}
    />
  );
}
