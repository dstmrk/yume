import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { addSnapshot } from "../lib/api.ts";
import { parsePoints, todayIso } from "../lib/balance.ts";
import { text } from "../text.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

/**
 * The form of a new balance of one account.
 *
 * The database keeps a snapshot at a date. It keeps no record of the changes,
 * thus this form always adds a row. Refer to paragraph 3.2 of
 * `docs/architecture.md`.
 */
export function NewBalanceForm({ accountId }: { accountId: string }) {
	const [open, setOpen] = useState(false);

	if (!open) {
		return (
			<Button
				variant="outline"
				type="button"
				className="self-start"
				onClick={() => setOpen(true)}
			>
				{text.updateBalance}
			</Button>
		);
	}

	return <Fields accountId={accountId} onClose={() => setOpen(false)} />;
}

function Fields({
	accountId,
	onClose,
}: {
	accountId: string;
	onClose: () => void;
}) {
	const fieldId = useId();
	const [points, setPoints] = useState("");
	const [observedAt, setObservedAt] = useState(() => todayIso(new Date()));
	const [invalid, setInvalid] = useState(false);

	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: (value: number) =>
			addSnapshot(accountId, { points: value, observedAt }),
		onSuccess: async () => {
			// A new balance changes the list and also the potential of each
			// currency that the account can reach.
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["potential"] });
			onClose();
		},
	});

	return (
		<form
			className="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
			onSubmit={(event) => {
				event.preventDefault();
				const value = parsePoints(points);
				setInvalid(value === null);
				if (value !== null) {
					save.mutate(value);
				}
			}}
		>
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-points`}>{text.pointsLabel}</Label>
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
				<Label htmlFor={`${fieldId}-date`}>{text.dateLabel}</Label>
				<Input
					id={`${fieldId}-date`}
					type="date"
					value={observedAt}
					onChange={(event) => setObservedAt(event.target.value)}
				/>
			</div>

			{invalid && (
				<p className="text-destructive text-sm">{text.pointsError}</p>
			)}
			{save.isError && (
				<p className="text-destructive text-sm">{text.saveError}</p>
			)}

			<div className="flex gap-2">
				<Button type="submit" disabled={save.isPending}>
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
