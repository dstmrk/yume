import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { InvitationRow } from "../../shared/api.ts";
import { createInvitation, fetchInvitations } from "../lib/api.ts";
import { formatMoment } from "../lib/format.ts";
import { inviteLink } from "../lib/invite.ts";
import { text } from "../text.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

/**
 * The invitations of the user.
 *
 * Each user has two invitations and each code is valid for 24 hours. An
 * invitation that a person used holds its slot forever. Paragraph 4 of
 * `docs/architecture.md` gives the rules.
 *
 * The panel is a standard surface of shadcn/ui, not a surface of the board:
 * the board shows the values of the points.
 */
export function InvitePanel() {
	const queryClient = useQueryClient();
	const invitations = useQuery({
		queryKey: ["invitations"],
		queryFn: fetchInvitations,
	});
	const write = useMutation({
		mutationFn: createInvitation,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["invitations"] }),
	});

	if (invitations.isPending || invitations.isError) {
		return null;
	}

	const left = invitations.data.left;

	return (
		<section className="flex flex-col gap-3">
			<header>
				<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.invitesTitle}
				</h2>
				<p className="mt-1 text-board-muted text-xs">{text.invitesBody}</p>
			</header>

			{invitations.data.invitations.length > 0 && (
				<ul className="flex flex-col gap-3">
					{invitations.data.invitations.map((row) => (
						<li key={row.code}>
							<Invitation row={row} />
						</li>
					))}
				</ul>
			)}

			{write.isError && (
				<p className="text-destructive text-sm">{text.saveError}</p>
			)}

			{left === 0 ? (
				<p className="text-board-muted text-sm">{text.invitesNoneLeft}</p>
			) : (
				<Button
					type="button"
					variant="outline"
					className="self-start"
					disabled={write.isPending}
					onClick={() => write.mutate()}
				>
					{write.isPending ? text.saving : text.newInvite}
				</Button>
			)}
		</section>
	);
}

/**
 * One invitation. A code that is valid shows the link, and no other code does:
 * the sign-up refuses a code that a person used and a code that expired.
 */
function Invitation({ row }: { row: InvitationRow }) {
	if (row.state !== "valid") {
		return (
			<p className="flex items-baseline justify-between gap-3 text-sm">
				<span className="font-board text-board-muted">{row.code}</span>
				<span className="shrink-0 text-board-muted text-xs">
					{row.state === "used"
						? text.inviteUsedState
						: text.inviteExpiredState}
				</span>
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
			<LinkField code={row.code} />
			<p className="text-board-muted text-xs">
				{text.inviteValidUntil} {formatMoment(row.expiresAt)}
			</p>
		</div>
	);
}

/**
 * The link of an invitation, with the button that copies it.
 *
 * The field is not active: the person sends the link and writes nothing. The
 * clipboard of the browser is not available on a page with no TLS, thus the
 * field always shows the full link and the person can select it.
 */
function LinkField({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	const link = inviteLink(window.location.origin, code);

	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={`invite-${code}`}>{text.inviteLinkLabel}</Label>
			<div className="flex gap-2">
				<Input id={`invite-${code}`} value={link} readOnly />
				<Button
					type="button"
					variant="outline"
					className="shrink-0"
					onClick={async () => {
						await navigator.clipboard?.writeText(link);
						setCopied(true);
					}}
				>
					{copied ? text.copied : text.copy}
				</Button>
			</div>
		</div>
	);
}
