import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { Program } from "../../shared/catalogue.ts";
import { sortPrograms, toCreateAccountBody } from "../lib/account.ts";
import { createAccount } from "../lib/api.ts";
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
export function NewAccountForm({ programs }: { programs: readonly Program[] }) {
	const [open, setOpen] = useState(false);

	if (!open) {
		return (
			<Button variant="outline" type="button" onClick={() => setOpen(true)}>
				{text.addAccount}
			</Button>
		);
	}

	return <Fields programs={programs} onClose={() => setOpen(false)} />;
}

function Fields({
	programs,
	onClose,
}: {
	programs: readonly Program[];
	onClose: () => void;
}) {
	const fieldId = useId();
	const [programId, setProgramId] = useState("");
	const [nickname, setNickname] = useState("");
	const [membershipRef, setMembershipRef] = useState("");

	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: () =>
			createAccount(
				toCreateAccountBody({ programId, nickname, membershipRef }),
			),
		onSuccess: async () => {
			// The new account changes the list and also the potential: a new
			// balance of a source gives new miles.
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["potential"] });
			onClose();
		},
	});

	const options = sortPrograms(programs);

	return (
		<form
			className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				save.mutate();
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
