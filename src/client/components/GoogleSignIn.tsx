import { useI18n } from "../i18n/I18n.tsx";
import { GoogleButton } from "./GoogleButton.tsx";

/**
 * The panel of the page of the access. The first sign-in makes the account.
 * Paragraph 4.1 of `docs/architecture.md` gives the decision.
 *
 * The public page holds the same button with no panel. This page stays for
 * two cases: an error on the page of Google, and `/dashboard` with no session.
 *
 * The panel is a standard surface, not a surface of the board. Refer to
 * paragraph 5 of `docs/architecture.md`.
 */
export function GoogleSignIn({ error }: { error?: string }) {
	const { t: text } = useI18n();
	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4">
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.signInTitle}
			</h2>
			<GoogleButton error={error} />
			<p className="text-board-muted text-xs">{text.signInNote}</p>
		</div>
	);
}
