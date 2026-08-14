import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * The button of shadcn/ui, with the tokens of the theme.
 *
 * The height is 44 pixels. That size is the smallest control for a finger.
 * Refer to paragraph 5.4 of `docs/architecture.md`.
 *
 * `buttonVariants` is public, as in shadcn/ui. An element that is not a
 * `button` then holds the same appearance: a `Link` of the router gives an `a`
 * element, and a navigation needs that element.
 */
export const buttonVariants = cva(
	"inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				outline:
					"border border-input bg-transparent text-foreground hover:bg-accent",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export function Button({
	className,
	variant,
	...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
	return (
		<button className={cn(buttonVariants({ variant }), className)} {...props} />
	);
}
