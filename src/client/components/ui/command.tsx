import { Command as CommandPrimitive } from "cmdk";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * The command list of shadcn/ui above cmdk, with the tokens of the theme.
 *
 * cmdk gives the field of the search, the keyboard and the roles of ARIA. The
 * combobox of shadcn/ui puts this list in a popover.
 *
 * The icons are inside this file. The project holds no library of icons.
 */
export function Command({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			className={cn(
				"flex w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export function CommandInput({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div className="flex items-center gap-2 border-border border-b px-3">
			<Search />
			<CommandPrimitive.Input
				className={cn(
					"flex h-11 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

export function CommandList({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			className={cn(
				"max-h-72 overflow-y-auto overflow-x-hidden p-1",
				className,
			)}
			{...props}
		/>
	);
}

export function CommandEmpty({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			className={cn(
				"py-6 text-center text-muted-foreground text-sm",
				className,
			)}
			{...props}
		/>
	);
}

export function CommandItem({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			className={cn(
				"relative flex min-h-11 w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-base outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

function Search() {
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
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
	);
}
