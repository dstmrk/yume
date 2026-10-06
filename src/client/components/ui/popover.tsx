import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * The popover of shadcn/ui above Radix UI, with the tokens of the theme.
 *
 * Radix gives the focus, the key Escape and the position next to the trigger.
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
	className,
	align = "start",
	sideOffset = 4,
	...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}
