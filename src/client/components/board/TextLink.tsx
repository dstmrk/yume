import type { ReactNode } from "react";

/**
 * A link in the text of a public page. The colour of the board marks the link
 * at the pointer, as the links of the foot do.
 */
export function TextLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<a
			href={href}
			className="text-board-text underline underline-offset-2 hover:text-board-amber"
		>
			{children}
		</a>
	);
}
