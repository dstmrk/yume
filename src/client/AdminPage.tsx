import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { AdminUser } from "../shared/api.ts";
import type { AccountTier } from "../shared/tier.ts";
import { AppTitle } from "./components/board/AppTitle.tsx";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { Button, buttonVariants } from "./components/ui/button.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import type { Messages } from "./i18n/messages.ts";
import { adminSummary, dayOf } from "./lib/admin.ts";
import { fetchAdminUsers, setUnlimited } from "./lib/api.ts";
import { formatDate, formatPoints } from "./lib/format.ts";

/**
 * The page of the administrator: the users of the instance and their level.
 *
 * The route `/admin` of `router.tsx` sends each other user to the dashboard,
 * and the server gives the status 404 to each route of the data. The page
 * shows no balance of a user. Paragraph 4.8 of `docs/architecture.md` gives
 * the rules.
 */
export function AdminPage() {
	const { t: text } = useI18n();
	const users = useQuery({
		queryKey: ["admin", "users"],
		queryFn: fetchAdminUsers,
	});

	if (users.isPending || users.isError) {
		return (
			<>
				<AppTitle />
				<p className="text-board-muted text-sm">
					{users.isPending ? text.loading : text.loadError}
				</p>
			</>
		);
	}

	const summary = adminSummary(users.data.users, new Date());

	return (
		<div className="flex flex-col gap-6">
			<AppTitle />

			<BoardPanel title={text.adminTitle}>
				<dl className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<dt className="font-board text-[11px] text-board-muted uppercase tracking-widest">
							{text.adminTotal}
						</dt>
						<dd>
							<SplitFlapNumber value={summary.total} variant="balance" />
						</dd>
					</div>
					<div className="flex flex-col gap-2">
						<dt className="font-board text-[11px] text-board-muted uppercase tracking-widest">
							{text.adminRecent}
						</dt>
						<dd>
							<SplitFlapNumber value={summary.recent} variant="balance" />
						</dd>
					</div>
				</dl>
			</BoardPanel>

			<ul className="flex flex-col gap-4">
				{users.data.users.map((user) => (
					<UserItem key={user.id} user={user} />
				))}
			</ul>

			<Link to="/dashboard" className={buttonVariants({ variant: "outline" })}>
				{text.adminBack}
			</Link>
		</div>
	);
}

/** The name of a level in the language of the page. */
function tierName(tier: AccountTier, text: Messages): string {
	switch (tier) {
		case "free":
			return text.tierFree;
		case "supporter":
			return text.tierSupporter;
		case "unlimited":
			return text.tierUnlimited;
	}
}

/**
 * One user: the address, the date of the first sign-in, the level and the
 * quantity of accounts. The button writes the flag `unlimited` only: the
 * payment writes the end of the supporter account.
 */
function UserItem({ user }: { user: AdminUser }) {
	const { t: text, intl } = useI18n();
	const queryClient = useQueryClient();
	const write = useMutation({
		mutationFn: (unlimited: boolean) => setUnlimited(user.id, unlimited),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
	});

	return (
		<li className="flex flex-col gap-2 rounded-lg border border-board-line bg-board-panel px-4 py-3">
			<span className="break-all text-board-text text-sm">{user.email}</span>
			<span className="text-board-muted text-xs">
				{text.adminJoined} {formatDate(dayOf(user.createdAt), intl)} ·{" "}
				{text.adminAccounts} {formatPoints(user.accounts, intl)}
			</span>
			<span className="text-board-text text-xs">
				{tierName(user.tier, text)}
				{user.tier === "supporter" && user.supporterUntil !== null && (
					<>
						{" "}
						{text.adminSupporterUntil}{" "}
						{formatDate(dayOf(user.supporterUntil), intl)}
					</>
				)}
			</span>
			<Button
				type="button"
				variant="outline"
				disabled={write.isPending}
				onClick={() => write.mutate(!user.unlimited)}
			>
				{user.unlimited ? text.adminRevokeUnlimited : text.adminGrantUnlimited}
			</Button>
			{write.isError && (
				<p className="text-board-muted text-xs">{text.adminUpdateError}</p>
			)}
		</li>
	);
}
