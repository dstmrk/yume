import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * The select of shadcn/ui above Radix UI, with the tokens of the theme.
 *
 * Radix gives the keyboard, the focus and the roles of ARIA. The catalogue
 * grows to 19 programmes, thus the list needs a limit of the height and its own
 * area of movement.
 *
 * The icons are inside this file. The project holds no library of icons, and
 * these two shapes are the only shapes that the select needs.
 */
export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			className={cn(
				"flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 [&>span]:truncate data-[placeholder]:text-muted-foreground",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDown />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

export function SelectContent({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				position="popper"
				sideOffset={4}
				className={cn(
					"relative z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
					className,
				)}
				{...props}
			>
				<SelectPrimitive.Viewport className="p-1">
					{children}
				</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

export function SelectItem({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			className={cn(
				"relative flex min-h-11 w-full cursor-default select-none items-center gap-2 rounded-sm py-2 pr-2 pl-8 text-base outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<span className="absolute left-2 flex size-4 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<Check />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function ChevronDown() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="size-4 shrink-0 opacity-60"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	);
}

function Check() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="size-4"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}
