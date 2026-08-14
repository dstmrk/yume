import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { Currency, Program } from "../../shared/catalogue.ts";
import { sortPrograms, toCreateAccountBody } from "../lib/account.ts";
import { addSnapshot, createAccount } from "../lib/api.ts";
import {
	readOptionalPoints,
	toAddSnapshotBody,
	todayIso,
} from "../lib/balance.ts";
import { text } from "../text.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select.tsx";

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
}: {
	programs: readonly Program[];
	currencies: readonly Currency[];
}) {
	const [open, setOpen] = useState(false);

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
	const fieldId = useId();
	const [programId, setProgramId] = useState("");
	const [points, setPoints] = useState("");
	const [nickname, setNickname] = useState("");
	const [membershipRef, setMembershipRef] = useState("");
	const [invalid, setInvalid] = useState(false);

	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: async (balance: number | null) => {
			const account = await createAccount(
				toCreateAccountBody({ programId, nickname, membershipRef }),
			);
			if (balance !== null) {
				await addSnapshot(
					account.id,
					toAddSnapshotBody({
						points: balance,
						observedAt: todayIso(new Date()),
						note: "",
					}),
				);
			}
		},
		// The two requests are not one transaction. If the second one fails, the
		// account exists with no balance. Therefore the lists refresh also after
		// an error: then the user reads that account and adds the balance again.
		onSettled: async () => {
			// The new account changes the list and also the potential: a new
			// balance of a source gives new miles.
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["potential"] });
		},
		onSuccess: onClose,
	});

	const options = sortPrograms(programs, currencies);

	return (
		<form
			className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				const balance = readOptionalPoints(points);
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
				<Select value={programId || undefined} onValueChange={setProgramId}>
					<SelectTrigger id={`${fieldId}-program`}>
						<SelectValue placeholder={text.programPlaceholder} />
					</SelectTrigger>
					<SelectContent>
						{options.map((program) => (
							<SelectItem key={program.id} value={program.id}>
								{program.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-nickname`}>{text.nicknameLabel}</Label>
				<Input
					id={`${fieldId}-nickname`}
					value={nickname}
					maxLength={60}
					autoComplete="off"
					onChange={(event) => setNickname(event.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-membership`}>{text.membershipLabel}</Label>
				<Input
					id={`${fieldId}-membership`}
					value={membershipRef}
					maxLength={60}
					autoComplete="off"
					onChange={(event) => setMembershipRef(event.target.value)}
				/>
			</div>

			{invalid && (
				<p className="text-destructive text-sm">{text.pointsError}</p>
			)}
			{save.isError && (
				<p className="text-destructive text-sm">{text.saveError}</p>
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
