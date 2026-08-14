import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { AuthError, signIn, signUp } from "../lib/api.ts";
import { authMessage } from "../lib/auth.ts";
import { text } from "../text.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

/**
 * The form of the sign-in and the form of the sign-up.
 *
 * Registration is possible only with an invitation, thus the sign-up needs a
 * code. Paragraph 4 of `docs/architecture.md` gives the rule.
 *
 * The form is a standard form of shadcn/ui, not a surface of the board. Refer
 * to paragraph 5 of `docs/architecture.md`.
 *
 * The link of an invitation holds the code. That link opens the form of the
 * sign-up, and the person writes only the address and the password.
 */
export function AccessForm({
	onAccess,
	code,
}: {
	onAccess: () => void;
	/**
	 * The code of the link. A text opens the form of the sign-up, also an empty
	 * text. The value undefined opens the form of the sign-in.
	 */
	code?: string;
}) {
	const fieldId = useId();
	const [isNew, setIsNew] = useState(code !== undefined);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [inviteCode, setInviteCode] = useState(code ?? "");

	const send = useMutation({
		mutationFn: () =>
			isNew
				? signUp({ name, email, password, inviteCode })
				: signIn({ email, password }),
		onSuccess: onAccess,
	});

	const missing = isNew
		? name === "" || email === "" || password === "" || inviteCode === ""
		: email === "" || password === "";

	return (
		<form
			className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				send.mutate();
			}}
		>
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{isNew ? text.signUpTitle : text.signInTitle}
			</h2>

			{isNew && (
				<div className="flex flex-col gap-2">
					<Label htmlFor={`${fieldId}-name`}>{text.nameLabel}</Label>
					<Input
						id={`${fieldId}-name`}
						value={name}
						maxLength={60}
						autoComplete="name"
						onChange={(event) => setName(event.target.value)}
					/>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-email`}>{text.emailLabel}</Label>
				<Input
					id={`${fieldId}-email`}
					type="email"
					value={email}
					autoComplete="email"
					onChange={(event) => setEmail(event.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-password`}>{text.passwordLabel}</Label>
				<Input
					id={`${fieldId}-password`}
					type="password"
					value={password}
					autoComplete={isNew ? "new-password" : "current-password"}
					onChange={(event) => setPassword(event.target.value)}
				/>
			</div>

			{isNew && (
				<div className="flex flex-col gap-2">
					<Label htmlFor={`${fieldId}-invite`}>{text.inviteCodeLabel}</Label>
					<Input
						id={`${fieldId}-invite`}
						value={inviteCode}
						maxLength={40}
						autoComplete="off"
						onChange={(event) => setInviteCode(event.target.value)}
					/>
					<p className="text-board-muted text-xs">{text.inviteOnly}</p>
				</div>
			)}

			{send.isError && (
				<p className="text-destructive text-sm">
					{authMessage(
						send.error instanceof AuthError ? send.error.code : undefined,
					)}
				</p>
			)}

			<div className="flex flex-col gap-2">
				<Button type="submit" disabled={missing || send.isPending}>
					{send.isPending ? text.saving : isNew ? text.signUp : text.signIn}
				</Button>
				<Button
					variant="outline"
					type="button"
					disabled={send.isPending}
					onClick={() => {
						send.reset();
						setIsNew(!isNew);
					}}
				>
					{isNew ? text.toSignIn : text.toSignUp}
				</Button>
			</div>
		</form>
	);
}
