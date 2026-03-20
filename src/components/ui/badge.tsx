import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        unacceptable:
          "border-transparent bg-red-500/15 text-red-400",
        high:
          "border-transparent bg-orange-500/15 text-orange-400",
        limited:
          "border-transparent bg-yellow-500/15 text-yellow-400",
        minimal:
          "border-transparent bg-green-500/15 text-green-400",
        unassessed:
          "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function RiskBadge({ tier }: { tier: string }) {
  const variant = (
    {
      unacceptable: "unacceptable",
      high: "high",
      limited: "limited",
      minimal: "minimal",
    } as const
  )[tier.toLowerCase()] ?? "unassessed";

  return (
    <Badge variant={variant}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const colors: Record<string, string> = {
    compliant: "bg-green-500/15 text-green-400",
    partially_compliant: "bg-yellow-500/15 text-yellow-400",
    non_compliant: "bg-red-500/15 text-red-400",
    under_review: "bg-blue-500/15 text-blue-400",
    not_started: "bg-muted text-muted-foreground",
  };

  return (
    <Badge className={colors[status] ?? colors["not_started"]}>
      {label}
    </Badge>
  );
}

export { Badge, badgeVariants };
