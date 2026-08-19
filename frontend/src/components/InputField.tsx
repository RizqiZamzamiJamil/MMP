import type { InputHTMLAttributes } from "react";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function InputField({
  label,
  className = "",
  ...props
}: InputFieldProps) {
  return (
    <label className="grid min-w-0 gap-2 text-[11px] text-slate-500">
      {label}
      <input
        className={`min-h-10 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${className}`}
        {...props}
      />
    </label>
  );
}
