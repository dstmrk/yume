import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { type ProgramLogo as Logo, logoOf } from "../../lib/logos.ts";

/**
 * The box of a logo. Each logo fills the same box, thus a list of programmes
 * holds one column of logos. Paragraph 5.7 of `docs/architecture.md` gives
 * the rules.
 */
const logoBox = cva("inline-flex shrink-0 items-center justify-center", {
	variants: {
		size: {
			sm: "size-5",
			lg: "size-8",
		},
	},
	defaultVariants: {
		size: "sm",
	},
});

/**
 * The logo of one programme, in the colour of the text.
 *
 * The logo is not visible to a screen reader. The name of the programme is
 * next to the logo, or in an element that is not visible.
 */
export function ProgramLogo({
	programId,
	size,
}: {
	programId: string;
	size?: VariantProps<typeof logoBox>["size"];
}) {
	const logo = logoOf(programId);
	if (logo === null) {
		return null;
	}

	return <LogoMark logo={logo} size={size} />;
}

/**
 * One logo, in the colour of the text. The public page uses it for the logo of
 * an airline, which is not the logo of a programme.
 */
export function LogoMark({
	logo,
	size,
}: {
	logo: Logo;
	size?: VariantProps<typeof logoBox>["size"];
}) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
			className={cn(logoBox({ size }), "fill-current")}
		>
			<path d={logo.path} />
		</svg>
	);
}

/**
 * The name of a programme with its logo at the left.
 *
 * Each list of the dashboard uses this element. Thus each list holds the same
 * box and the same space between the logo and the name.
 */
export function ProgramName({
	programId,
	className,
	children,
}: {
	programId: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<span className={cn("flex min-w-0 items-center gap-2", className)}>
			<ProgramLogo programId={programId} />
			<span className="min-w-0 break-words">{children}</span>
		</span>
	);
}
