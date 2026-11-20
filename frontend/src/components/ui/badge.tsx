// shadcn/ui-style Badge.
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("pill !pl-2.5", {
  variants: {
    tone: {
      gray: "tone-gray", blue: "tone-blue", green: "tone-green",
      amber: "tone-amber", red: "tone-red", purple: "tone-purple",
    },
  },
  defaultVariants: { tone: "gray" },
});

export const Badge = ({
  className, tone, ...p
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ tone }), className)} {...p} />
);
