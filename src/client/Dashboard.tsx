import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { AccountRow } from "../shared/api.ts";
import type { PotentialMiles } from "../shared/potential.ts";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { NewAccountForm } from "./components/NewAccountForm.tsx";
import { NewBalanceForm } from "./components/NewBalanceForm.tsx";
import { Button } from "./components/ui/button.tsx";
import { fetchAccounts, fetchCatalogue, fetchPotential } from "./lib/api.ts";
import { cardsToShow } from "./lib/cards.ts";
import { formatDate, formatPoints } from "./lib/format.ts";
import type { GroupedRoute } from "./lib/routes.ts";
import { groupRoutes } from "./lib/routes.ts";
import { byValueDesc } from "./lib/sort.ts";
import { text } from "./text.ts";

export function Dashboard() {
	const [expanded, setExpanded] = useState(false);
	const catalogue = useQuery({
		queryKey: ["catalogue"],
		queryFn: fetchCatalogue,
	});
	const accounts = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
	const potential = useQuery({
		queryKey: ["potential"],
		queryFn: fetchPotential,
	});

	if (catalogue.isPending || accounts.isPending || potential.isPending) {
		return <p className="text-board-muted text-sm">{text.loading}</p>;
	}

	if (catalogue.isError || accounts.isError || potential.isError) {
		return <p className="text-board-muted text-sm">{text.loadError}</p>;
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
	const { cards, hidden } = cardsToShow(potential.data.potential, expanded);
	const allAccounts = [...accounts.data.accounts].sort(
		byValueDesc((account) => account.points),
	);

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-3">
				<header>
					<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
						{text.potentialTitle}
					</h2>
					<p className="mt-1 text-board-muted text-xs">
						{text.potentialWarning}
					</p>
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
				{allAccounts.length === 0 ? (
					<p className="text-board-muted text-sm">{text.noAccounts}</p>
				) : (
					<ul className="flex flex-col gap-4">
						{allAccounts.map((account) => (
							<li key={account.accountId} className="flex flex-col gap-2">
								<div className="flex items-center justify-between gap-3">
									<span className="min-w-0 text-sm">
										<span className="block break-words">
											{name(account.programId)}
										</span>
										{account.nickname !== null && (
											<span className="block text-board-muted text-xs">
												{account.nickname}
											</span>
										)}
									</span>
									{account.points === null ? (
										<span className="shrink-0 text-board-muted text-xs">
											{text.noBalance}
										</span>
									) : (
										<span className="flex shrink-0 flex-col items-end gap-1">
											<SplitFlapNumber
												value={account.points}
												variant="balance"
											/>
											{account.observedAt !== null && (
												<span className="text-board-muted text-xs">
													{text.observedOn} {formatDate(account.observedAt)}
												</span>
											)}
										</span>
									)}
								</div>
								<NewBalanceForm accountId={account.accountId} />
							</li>
						))}
					</ul>
				)}
			</BoardPanel>

			<NewAccountForm programs={catalogue.data.programs} />
		</div>
	);
}

function CurrencyCard({
	row,
	title,
	holdings,
	name,
}: {
	row: PotentialMiles;
	title: string;
	holdings: AccountRow[];
	name: (programId: string) => string;
}) {
	return (
		<BoardPanel title={title}>
			<div className="flex items-center justify-between gap-3">
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
