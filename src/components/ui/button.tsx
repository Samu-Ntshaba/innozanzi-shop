import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-sky-600 text-white hover:bg-sky-700",
        secondary: "bg-zinc-900 text-white hover:bg-zinc-800",
        outline: "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
        ghost: "text-zinc-700 hover:bg-zinc-100",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3", lg: "h-12 px-7" },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
