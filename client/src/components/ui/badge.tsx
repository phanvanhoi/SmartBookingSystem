import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline:
          'border-border text-foreground',
        // Status variants
        available:
          'border-transparent bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
        occupied:
          'border-transparent bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
        ending:
          'border-transparent bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30 animate-pulse-status',
        maintenance:
          'border-transparent bg-[#6b7280]/20 text-[#6b7280] border-[#6b7280]/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
