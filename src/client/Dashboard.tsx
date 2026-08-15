import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { AccountRow, FavoritesResponse } from "../shared/api.ts";
import type { PotentialMiles } from "../shared/potential.ts";
import { AccountActions } from "./components/AccountActions.tsx";
import { AppTitle } from "./components/board/AppTitle.tsx";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { FavoriteHeart } from "./components/board/FavoriteHeart.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { InvitePanel } from "./components/InvitePanel.tsx";
import { NewAccountForm } from "./components/NewAccountForm.tsx";
import { NewBalanceForm } from "./components/NewBalanceForm.tsx";
import { Button } from "./components/ui/button.tsx";
import {
	fetchAccounts,
	fetchCatalogue,
	fetchFavorites,
	fetchPotential,
	setFavorite,
	signOut,
} from "./lib/api.ts";
import { cardsToShow } from "./lib/cards.ts";
import { toggleFavorite } from "./lib/favorites.ts";
import { formatDate, formatPoints } from "./lib/format.ts";
import type { GroupedRoute } from "./lib/routes.ts";
import { groupRoutes } from "./lib/routes.ts";
import { byValueDesc } from "./lib/sort.ts";
import { text } from "./text.ts";

export function Dashboard() {
	const [expanded, setExpanded] = useState(false);
	const queryClient = useQueryClient();
	const catalogue = useQuery({
		queryKey: ["catalogue"],
		queryFn: fetchCatalogue,
	});
	const accounts = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
	const potential = useQuery({
		queryKey: ["potential"],
		queryFn: fetchPotential,
	});
	const favorites = useQuery({
		queryKey: ["favorites"],
		queryFn: fetchFavorites,
	});

	/**
	 * The mark of a currency, with the answer before the request.
	 *
	 * The cache holds the new state at the tap. Thus the heart and the sequence
	 * of the cards change immediately, and no card waits for the server. An
	 * error puts back the state of before.
	 */
	const mark = useMutation({
		mutationFn: (input: { currencyId: string; favorite: boolean }) =>
			setFavorite(input.currencyId, input.favorite),
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: ["favorites"] });
			const before = queryClient.getQueryData<FavoritesResponse>(["favorites"]);
			queryClient.setQueryData<FavoritesResponse>(["favorites"], (old) => ({
				currencyIds: toggleFavorite(
					old?.currencyIds ?? [],
					input.currencyId,
					input.favorite,
				),
			}));
			return { before };
		},
		onError: (_error, _input, context) => {
			queryClient.setQueryData(["favorites"], context?.before);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
	});

	// The masthead is present in each state of the page. Therefore the title
	// does not arrive after the data.
	if (
		catalogue.isPending ||
		accounts.isPending ||
		potential.isPending ||
		favorites.isPending
	) {
		return (
			<>
				<AppTitle />
				<p className="text-board-muted text-sm">{text.loading}</p>
			</>
		);
	}

	if (
		catalogue.isError ||
		accounts.isError ||
		potential.isError ||
		favorites.isError
	) {
		return (
			<>
				<AppTitle />
				<p className="text-board-muted text-sm">{text.loadError}</p>
			</>
		);
	}

	const names = new Map(
		catalogue.data.programs.map((program) => [program.id, program.name]),
	);
	const currencyOf = new Map(
		catalogue.data.programs.map((program) => [program.id, program.currencyId]),
	);
	const currencyNames = new Map(
		catalogue.data.currencies.map((currency) => [currency.id, currency.name]),
	);

	const name = (programId: string) => names.get(programId) ?? programId;

	// Each list goes from the largest value to the smallest one.
	const allAccounts = [...accounts.data.accounts].sort(
		byValueDesc((account) => account.points),
	);

	// The first access. The user has no account, thus the list of the cards and
	// the panel of the accounts are both empty. That page shows two empty
	// surfaces and it puts the only button of the page after them.
	//
	// The quantity of the accounts is the signal of this state. Therefore the
	// database keeps no flag of the onboarding, and the block goes away with
	// the first account.
	if (allAccounts.length === 0) {
		return (
			<div className="flex flex-col gap-6">
				<AppTitle />

				<section className="flex flex-col gap-2">
					<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
						{text.startTitle}
					</h2>
					{/* The block shows no value of the user, thus it gives no warning
					    of the transfer. Refer to paragraph 5.5.1 of
					    `docs/architecture.md`. */}
					<p className="text-board-muted text-sm">{text.startBody}</p>
				</section>

				<NewAccountForm
					programs={catalogue.data.programs}
					currencies={catalogue.data.currencies}
					defaultOpen
				/>
				<SignOutButton />
			</div>
		);
	}

	const marked = new Set(favorites.data.currencyIds);
	const { cards, hidden } = cardsToShow(
		potential.data.potential,
		expanded,
		marked,
	);

	return (
		<div className="flex flex-col gap-6">
			<AppTitle />

			<section className="flex flex-col gap-3">
				{/* The header holds the warning only. Each card already gives the
				    label of the potential miles above its board, thus a title of the
				    section repeats that same label. */}
				<header>
					<p className="text-board-muted text-xs">{text.potentialWarning}</p>
				</header>

				{cards.length === 0 ? (
					<p className="text-board-muted text-sm">{text.noPotential}</p>
				) : (
					cards.map((row) => (
						<CurrencyCard
							key={row.currencyId}
							row={row}
							title={currencyNames.get(row.currencyId) ?? row.currencyId}
							holdings={allAccounts.filter(
								(account) =>
									currencyOf.get(account.programId) === row.currencyId &&
									account.points !== null,
							)}
							name={name}
							favorite={marked.has(row.currencyId)}
							onToggleFavorite={() =>
								mark.mutate({
									currencyId: row.currencyId,
									favorite: !marked.has(row.currencyId),
								})
							}
						/>
					))
				)}

				{(hidden > 0 || expanded) && (
					<Button
						type="button"
						variant="outline"
						onClick={() => setExpanded(!expanded)}
					>
						{expanded ? text.showLess : `${text.showOthers} ${hidden}`}
					</Button>
				)}
			</section>

			<BoardPanel title={text.accountsTitle}>
				<ul className="flex flex-col gap-4">
					{allAccounts.map((account) => (
						<li key={account.accountId} className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-3">
								<span className="min-w-0 break-words text-sm">
									{name(account.programId)}
								</span>
								{account.points === null ? (
									<span className="shrink-0 text-board-muted text-xs">
										{text.noBalance}
									</span>
								) : (
									<span className="flex shrink-0 flex-col items-end gap-1">
										<SplitFlapNumber value={account.points} variant="balance" />
										{account.observedAt !== null && (
											<span className="text-board-muted text-xs">
												{text.observedOn} {formatDate(account.observedAt)}
											</span>
										)}
									</span>
								)}
							</div>
							<NewBalanceForm accountId={account.accountId} />
							<AccountActions
								accountId={account.accountId}
								snapshotId={account.snapshotId}
							/>
						</li>
					))}
				</ul>
			</BoardPanel>

			<NewAccountForm
				programs={catalogue.data.programs}
				currencies={catalogue.data.currencies}
			/>
			<InvitePanel />
			<SignOutButton />
		</div>
	);
}

/**
 * The button of the sign-out.
 *
 * After the sign-out the router examines the session again. The route
 * `/dashboard` then finds no session and it sends the user to `/login`.
 */
function SignOutButton() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const leave = useMutation({
		mutationFn: signOut,
		onSuccess: async () => {
			// The data of the user stays in the cache of the query. A second user
			// on the same telephone must not read it.
			queryClient.clear();
			await router.invalidate();
		},
	});

	return (
		<Button
			variant="outline"
			type="button"
			disabled={leave.isPending}
			onClick={() => leave.mutate()}
		>
			{text.signOut}
		</Button>
	);
}

/**
 * The card of one currency.
 *
 * The heart of the header marks the currency, and not a programme. Six
 * programmes use Avios, thus one card holds one mark. Refer to the rule 2 of
 * the data in `CLAUDE.md`.
 */
function CurrencyCard({
	row,
	title,
	holdings,
	name,
	favorite,
	onToggleFavorite,
}: {
	row: PotentialMiles;
	title: string;
	holdings: AccountRow[];
	name: (programId: string) => string;
	favorite: boolean;
	onToggleFavorite: () => void;
}) {
	return (
		<BoardPanel
			title={title}
			action={<FavoriteHeart favorite={favorite} onToggle={onToggleFavorite} />}
		>
			{/* The label is above the board. Then the board holds the full width of
			    the card, and a value of seven digits enters one line. Refer to
			    paragraph 5.0 of `docs/architecture.md`. */}
			<div className="flex flex-col items-start gap-1">
				<span className="text-board-muted text-xs">{text.potentialTitle}</span>
				<SplitFlapNumber value={row.total} variant="potential" />
			</div>

			{holdings.length > 0 && (
				<ul className="mt-3 flex flex-col gap-1 border-board-line border-t pt-3">
					{holdings.map((account) => (
						<li
							key={account.accountId}
							className="flex items-baseline justify-between gap-3 text-sm"
						>
							<span className="min-w-0 break-words text-board-muted">
								{name(account.programId)}
							</span>
							<span className="shrink-0 tabular-nums">
								{formatPoints(account.points ?? 0)}
							</span>
						</li>
					))}
				</ul>
			)}

			{row.routes.length > 0 && (
				<ul className="mt-3 flex flex-col gap-1 border-board-line border-t pt-3">
					{groupRoutes(row.routes)
						.sort(byValueDesc((route) => route.points))
						.map((route) => (
							<RouteRow key={route.fromProgramId} route={route} name={name} />
						))}
				</ul>
			)}
		</BoardPanel>
	);
}

/**
 * One source of a card, with the points that it can send.
 *
 * The line names no programme of the target currency. Two programmes can give
 * the same result, and then one name is a choice without a reason. The button
 * opens the list of the programmes with the result of each one. A transfer is
 * permanent, thus the user must read the programme that accepts the balance.
 */
function RouteRow({
	route,
	name,
}: {
	route: GroupedRoute;
	name: (programId: string) => string;
}) {
	const [open, setOpen] = useState(false);
	const panelId = `routes-${route.fromProgramId}`;

	return (
		<li className="flex flex-col text-sm">
			<div className="flex items-baseline justify-between gap-3">
				<span className="flex min-w-0 items-center gap-1">
					<span className="min-w-0 break-words text-board-muted">
						{name(route.fromProgramId)}
					</span>
					<button
						type="button"
						aria-expanded={open}
						aria-controls={panelId}
						aria-label={text.routeDetail}
						onClick={() => setOpen(!open)}
						className="-my-3 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center"
					>
						<span
							aria-hidden="true"
							className="flex h-5 w-5 items-center justify-center rounded-full border border-board-line font-board text-[11px] text-board-muted"
						>
							i
						</span>
					</button>
				</span>
				<span className="shrink-0 text-board-amber tabular-nums">
					+{formatPoints(route.points)}
				</span>
			</div>

			{open && (
				<ul id={panelId} className="mt-1 flex flex-col gap-1 pl-3">
					{[...route.options]
						.sort(byValueDesc((option) => option.points))
						.map((option) => (
							<li
								key={option.toProgramId}
								className="flex items-baseline justify-between gap-3 text-board-muted text-xs"
							>
								<span className="min-w-0 break-words">
									{name(option.toProgramId)}
								</span>
								<span className="shrink-0 tabular-nums">
									{formatPoints(option.points)}
								</span>
							</li>
						))}
				</ul>
			)}
		</li>
	);
}
