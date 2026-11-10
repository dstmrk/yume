import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { AdminUser } from "../shared/api.ts";
import type { AccountTier } from "../shared/tier.ts";
import { AppTitle } from "./components/board/AppTitle.tsx";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { Button, buttonVariants } from "./components/ui/button.tsx";
import { Input } from "./components/ui/input.tsx";
import { Switch } from "./components/ui/switch.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/ui/table.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import type { Messages } from "./i18n/messages.ts";
import {
	adminSummary,
	dayOf,
	filterUsers,
	pageOf,
	type TierFilter,
} from "./lib/admin.ts";
import { fetchAdminUsers, setUnlimited } from "./lib/api.ts";
import { formatDate, formatPoints } from "./lib/format.ts";

/** The buttons of the filter of the level, in this order. */
const TIER_FILTERS: readonly TierFilter[] = [
	"all",
	"free",
	"supporter",
	"unlimited",
];

/**
 * The page of the administrator: the users of the instance and their level.
 *
 * The route `/admin` of `router.tsx` sends each other user to the dashboard,
 * and the server gives the status 404 to each route of the data. The page
 * shows no account and no balance of a user. The logic of the filters and of
 * the pages is in `lib/admin.ts`. Paragraph 4.8 of `docs/architecture.md`
 * gives the rules.
 */
export function AdminPage() {
	const { t: text, intl } = useI18n();
	const [query, setQuery] = useState("");
	const [tier, setTier] = useState<TierFilter>("all");
	const [page, setPage] = useState(1);
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
	const shown = pageOf(filterUsers(users.data.users, query, tier), page);

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

			<section className="flex flex-col gap-3">
				{/* A change of a filter goes back to the first page. */}
				<Input
					type="search"
					aria-label={text.adminSearch}
					placeholder={text.adminSearch}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
				<div className="grid grid-cols-4 gap-2">
					{TIER_FILTERS.map((value) => (
						<Button
							key={value}
							type="button"
							variant={tier === value ? "default" : "outline"}
							aria-pressed={tier === value}
							className="px-2"
							onClick={() => {
								setTier(value);
								setPage(1);
							}}
						>
							{value === "all" ? text.adminAll : tierName(value, text)}
						</Button>
					))}
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{text.adminEmail}</TableHead>
							<TableHead className="hidden md:table-cell">
								{text.adminJoined}
							</TableHead>
							<TableHead>{text.adminTier}</TableHead>
							<TableHead>{text.tierUnlimited}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{shown.items.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="text-muted-foreground">
									{text.adminNoMatch}
								</TableCell>
							</TableRow>
						) : (
							shown.items.map((user) => <UserRow key={user.id} user={user} />)
						)}
					</TableBody>
				</Table>

				<div className="flex items-center justify-between gap-3">
					<Button
						type="button"
						variant="outline"
						aria-label={text.adminPrevious}
						disabled={shown.page <= 1}
						onClick={() => setPage(shown.page - 1)}
					>
						‹
					</Button>
					<span className="text-board-muted text-sm">
						{formatPoints(shown.page, intl)} / {formatPoints(shown.pages, intl)}
					</span>
					<Button
						type="button"
						variant="outline"
						aria-label={text.adminNext}
						disabled={shown.page >= shown.pages}
						onClick={() => setPage(shown.page + 1)}
					>
						›
					</Button>
				</div>
			</section>

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
 * One row of the table. The switch writes the flag `unlimited` only: the
 * payment writes the end of the supporter account.
 */
function UserRow({ user }: { user: AdminUser }) {
	const { t: text, intl } = useI18n();
	const queryClient = useQueryClient();
	const write = useMutation({
		mutationFn: (unlimited: boolean) => setUnlimited(user.id, unlimited),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
	});

	return (
		<TableRow>
			<TableCell>{user.email}</TableCell>
			<TableCell className="hidden text-muted-foreground md:table-cell">
				{formatDate(dayOf(user.createdAt), intl)}
			</TableCell>
			<TableCell>
				{tierName(user.tier, text)}
				{user.tier === "supporter" && user.supporterUntil !== null && (
					<span className="text-muted-foreground">
						{" "}
						{text.adminSupporterUntil}{" "}
						{formatDate(dayOf(user.supporterUntil), intl)}
					</span>
				)}
			</TableCell>
			<TableCell>
				<Switch
					aria-label={`${text.tierUnlimited}: ${user.email}`}
					checked={user.unlimited}
					disabled={write.isPending}
					onCheckedChange={(checked) => write.mutate(checked)}
				/>
				{write.isError && (
					<p className="text-muted-foreground text-xs">
						{text.adminUpdateError}
					</p>
				)}
			</TableCell>
		</TableRow>
	);
}
