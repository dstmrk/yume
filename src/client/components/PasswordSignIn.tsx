import { useId, useState } from "react";
import { useI18n } from "../i18n/I18n.tsx";
import { signInWithPassword } from "../lib/api.ts";
import { passwordSignInBody, withOAuthQuery } from "../lib/auth.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

/**
 * The sign-in with a password, for the account of the reviewers of Anthropic.
 * No person makes such an account: the administrator writes it. Paragraph
 * 4.1.1 of `docs/architecture.md` gives the decision.
 *
 * The page of the access shows a link, and the link opens this form. The form
 * stays on `/login`, thus the address keeps the signed query of an
 * authorisation of the MCP server.
 */
export function PasswordSignIn() {
	const { t: text, locale } = useI18n();
	const fieldId = useId();
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [state, setState] = useState<"idle" | "pending" | "failed">("idle");

	if (!open) {
		return (
			// A text link, as the links of `SiteFooter`: the button of `ui/`
			// gives no variant of a link.
			<button
				type="button"
				className="self-start text-board-muted text-xs underline underline-offset-2 hover:text-board-text"
				onClick={() => setOpen(true)}
			>
				{text.passwordSignInLink}
			</button>
		);
	}

	return (
		<form
			className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				setState("pending");
				const body = withOAuthQuery(
					passwordSignInBody(window.location.origin, locale, email, password),
					window.location.search,
				);
				signInWithPassword(body).then(
					// The state stays `pending`: the page opens the next page.
					(url) => window.location.assign(url),
					() => setState("failed"),
				);
			}}
		>
			<p className="text-board-muted text-xs">{text.passwordSignInNote}</p>
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-email`}>{text.emailLabel}</Label>
				<Input
					id={`${fieldId}-email`}
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-password`}>{text.passwordLabel}</Label>
				<Input
					id={`${fieldId}-password`}
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
			</div>
			<Button type="submit" disabled={state === "pending"}>
				{text.signIn}
			</Button>
			{state === "failed" && (
				<p role="alert" className="text-destructive text-sm">
					{text.passwordSignInError}
				</p>
			)}
		</form>
	);
}
