import { useQuery } from "@tanstack/react-query";
import type { AccountRow } from "../shared/api.ts";
import type { PotentialMiles } from "../shared/potential.ts";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { FlapNumber } from "./components/board/FlapNumber.tsx";
import { fetchAccounts, fetchCatalogue, fetchPotential } from "./lib/api.ts";
import { formatDate, formatPoints } from "./lib/format.ts";
import { groupRoutes } from "./lib/routes.ts";
import { text } from "./text.ts";

export function Dashboard() {
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

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-3">
				<header>
					<h2 className="font-board text-board-muted text-xs uppercase tracking-widest">
						{text.potentialTitle}
					</h2>
					<p className="mt-1 text-board-muted text-xs">
						{text.potentialWarning}
					</p>
				</header>

				{potential.data.potential.map((row) => (
					<CurrencyCard
						key={row.currencyId}
						row={row}
						title={currencyNames.get(row.currencyId) ?? row.currencyId}
						holdings={accounts.data.accounts.filter(
							(account) =>
								currencyOf.get(account.programId) === row.currencyId &&
								account.points !== null,
						)}
						name={name}
					/>
				))}
			</section>

			<BoardPanel title={text.accountsTitle}>
				{accounts.data.accounts.length === 0 ? (
					<p className="text-board-muted text-sm">{text.noAccounts}</p>
				) : (
					<ul className="flex flex-col gap-2">
						{accounts.data.accounts.map((account) => (
							<li
								key={account.accountId}
								className="flex items-center justify-between gap-3"
							>
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
										<FlapNumber value={account.points} />
										{account.observedAt !== null && (
											<span className="text-board-muted text-xs">
												{text.observedOn} {formatDate(account.observedAt)}
											</span>
										)}
									</span>
								)}
							</li>
						))}
					</ul>
				)}
			</BoardPanel>
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
				<FlapNumber value={row.total} variant="total" />
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
					{groupRoutes(row.routes).map((route) => (
						<li
							key={`${route.fromProgramId}>${route.toProgramId}`}
							className="flex items-baseline justify-between gap-3 text-sm"
						>
							<span className="min-w-0 break-words text-board-muted">
								{name(route.fromProgramId)} {text.via} {name(route.toProgramId)}
							</span>
							<span className="shrink-0 text-board-amber tabular-nums">
								+{formatPoints(route.points)}
							</span>
						</li>
					))}
				</ul>
			)}
		</BoardPanel>
	);
}
