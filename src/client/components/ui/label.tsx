import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * The label of shadcn/ui, with the tokens of the theme.
 *
 * The field `htmlFor` is necessary. Biome cannot follow the properties through
 * a component, thus the type makes the connection to the control mechanical.
 */
export function Label({
	className,
	...props
}: ComponentProps<"label"> & { htmlFor: string }) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the type of this component makes `htmlFor` necessary. The rule examines one file and cannot see the value of the point of use.
		<label
			className={cn("font-medium text-foreground text-sm", className)}
			{...props}
		/>
	);
}
