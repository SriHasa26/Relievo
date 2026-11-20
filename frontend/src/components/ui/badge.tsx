// shadcn/ui-style Badge.
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      gray: "bg-slate-100 text-slate-700",
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      amber: "bg-amber-100 text-amber-900",
      red: "bg-red-100 text-red-800",
      purple: "bg-purple-100 text-purple-800",
    },
  },
  defaultVariants: { tone: "gray" },
});

export const Badge = ({
  className, tone, ...p
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ tone }), className)} {...p} />
);
