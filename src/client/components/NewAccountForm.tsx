import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { Currency, Program } from "../../shared/catalogue.ts";
import { useI18n } from "../i18n/I18n.tsx";
import {
	isTooManyAccounts,
	matchesProgram,
	newAccountBody,
	programAirlinesLine,
	searchNamesOf,
	sortPrograms,
} from "../lib/account.ts";
import { airlinesOf } from "../lib/airlines.ts";
import { createAccount } from "../lib/api.ts";
import { readOptionalPoints } from "../lib/balance.ts";
import { isSupporterRequired } from "../lib/errors.ts";
import { ProgramName } from "./board/ProgramLogo.tsx";
import { Button } from "./ui/button.tsx";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "./ui/command.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.tsx";

/**
 * The form of a new account.
 *
 * A user can hold two accounts of one programme. The minimum quantity of a
 * transfer applies to one account, thus two accounts of 400 points give 0.
 * Refer to rule 3 of paragraph 3.5 of `docs/architecture.md`. Therefore the
 * list holds each programme, also a programme of an account that exists.
 *
 * The form is a standard form of shadcn/ui, not a surface of the board. Refer
 * to paragraph 5 of `docs/architecture.md`.
 */
export function NewAccountForm({
	programs,
	currencies,
	defaultOpen = false,
}: {
	programs: readonly Program[];
	currencies: readonly Currency[];
	/** The dashboard of a user with no account opens the form immediately. */
	defaultOpen?: boolean;
}) {
	const { t: text } = useI18n();
	const [open, setOpen] = useState(defaultOpen);

	if (!open) {
		return (
			<Button variant="outline" type="button" onClick={() => setOpen(true)}>
				{text.addAccount}
			</Button>
		);
	}

	return (
		<Fields
			programs={programs}
			currencies={currencies}
			onClose={() => setOpen(false)}
		/>
	);
}

function Fields({
	programs,
	currencies,
	onClose,
}: {
	programs: readonly Program[];
	currencies: readonly Currency[];
	onClose: () => void;
}) {
	const { t: text, intl } = useI18n();
	const fieldId = useId();
	const [programId, setProgramId] = useState("");
	const [points, setPoints] = useState("");
	const [invalid, setInvalid] = useState(false);

	const queryClient = useQueryClient();
	const save = useMutation({
		// One request makes the account and its first balance in one
		// transaction. Thus an error writes no row, and "Salva" again makes one
		// account.
		mutationFn: (balance: number | null) =>
			createAccount(newAccountBody(programId, balance, new Date())),
		onSuccess: async () => {
			// The new account changes the list and also the potential: a new
			// balance of a source gives new miles.
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["potential"] });
			onClose();
		},
	});

	const options = sortPrograms(programs, currencies, intl);
	const searchNames = searchNamesOf(options, currencies);
	const selected = options.find((program) => program.id === programId);

	return (
		<form
			className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				const balance = readOptionalPoints(points, intl);
				setInvalid(!balance.ok);
				if (balance.ok) {
					save.mutate(balance.points);
				}
			}}
		>
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.newAccountTitle}
			</h2>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-program`}>{text.programLabel}</Label>
				<ProgramPicker
					id={`${fieldId}-program`}
					options={options}
					searchNames={searchNames}
					selected={selected}
					onSelect={setProgramId}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-points`}>{text.firstBalanceLabel}</Label>
				<Input
					id={`${fieldId}-points`}
					value={points}
					// The keyboard of the telephone shows the digits, but the field
					// stays a text: the user can write the separator of the thousands.
					inputMode="numeric"
					autoComplete="off"
					aria-invalid={invalid}
					onChange={(event) => setPoints(event.target.value)}
				/>
			</div>

			{invalid && (
				<p className="text-destructive text-sm">{text.pointsError}</p>
			)}
			{save.isError && (
				<p className="text-destructive text-sm">
					{isTooManyAccounts(save.error)
						? text.tooManyAccountsError
						: isSupporterRequired(save.error)
							? text.freeAccountLimitError
							: text.saveError}
				</p>
			)}

			<div className="flex gap-2">
				<Button type="submit" disabled={programId === "" || save.isPending}>
					{save.isPending ? text.saving : text.save}
				</Button>
				<Button
					variant="outline"
					type="button"
					disabled={save.isPending}
					onClick={onClose}
				>
					{text.cancel}
				</Button>
			</div>
		</form>
	);
}

/**
 * The combobox of the programmes: a button that opens a list with a search.
 *
 * The search reads the name and the airlines of each programme, thus "ITA"
 * gives Miles & More. Refer to `matchesProgram`.
 */
function ProgramPicker({
	id,
	options,
	searchNames,
	selected,
	onSelect,
}: {
	id: string;
	options: readonly Program[];
	searchNames: ReadonlyMap<string, readonly string[]>;
	selected: Program | undefined;
	onSelect: (programId: string) => void;
}) {
	const { t: text } = useI18n();
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					variant="outline"
					type="button"
					role="combobox"
					aria-expanded={open}
					className="h-11 w-full justify-start px-3 font-normal text-base"
				>
					{selected ? (
						<ProgramName programId={selected.id}>{selected.name}</ProgramName>
					) : (
						<span className="text-muted-foreground">
							{text.programPlaceholder}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command
					filter={(value, search) => {
						const names = searchNames.get(value);
						return names && matchesProgram(search, names) ? 1 : 0;
					}}
				>
					<CommandInput placeholder={text.programSearch} />
					<CommandList>
						<CommandEmpty>{text.programNotFound}</CommandEmpty>
						{options.map((program) => {
							const line = programAirlinesLine(airlinesOf(program.id));
							return (
								<CommandItem
									key={program.id}
									value={program.id}
									onSelect={() => {
										onSelect(program.id);
										setOpen(false);
									}}
								>
									<span className="flex min-w-0 flex-col">
										<ProgramName programId={program.id}>
											{program.name}
										</ProgramName>
										{line && (
											<span className="text-muted-foreground text-sm">
												{line}
											</span>
										)}
									</span>
								</CommandItem>
							);
						})}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
