import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * The input of shadcn/ui, with the tokens of the theme.
 *
 * The height is 44 pixels, and the size of the text is 16 pixels. Safari on iOS
 * makes the page larger when the text of a field is below 16 pixels. Refer to
 * paragraph 5.4 of `docs/architecture.md`.
 */
export function Input({ className, ...props }: ComponentProps<"input">) {
	return (
		<input
			className={cn(
				"flex h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}
