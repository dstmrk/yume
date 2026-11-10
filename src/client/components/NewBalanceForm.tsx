import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { ExpiryLot } from "../../shared/api.ts";
import { useI18n } from "../i18n/I18n.tsx";
import type { Messages } from "../i18n/messages.ts";
import { addSnapshot } from "../lib/api.ts";
import { parsePoints, todayIso } from "../lib/balance.ts";
import { isSupporterRequired } from "../lib/errors.ts";
import {
	draftsOf,
	type LotDraft,
	type LotError,
	readLots,
} from "../lib/expiry.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

/**
 * The form of a new balance of one account.
 *
 * The database keeps a snapshot at a date. It keeps no record of the changes,
 * thus this form always adds a row. Refer to paragraph 3.2 of
 * `docs/architecture.md`.
 *
 * The form also holds the expiry lots of the new balance. The lots belong to
 * the snapshot, thus the form gives again the lots of the current balance, and
 * the user corrects them. Paragraph 3.2.1 of `docs/architecture.md` gives the
 * model.
 */
export function NewBalanceForm({
	accountId,
	lots,
}: {
	accountId: string;
	/** The expiry lots of the current balance. */
	lots: ExpiryLot[];
}) {
	const { t: text } = useI18n();
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

	return (
		<Fields accountId={accountId} lots={lots} onClose={() => setOpen(false)} />
	);
}

/** The message of each refusal of the expiry lots. */
function lotMessage(error: LotError, text: Messages): string {
	const messages: Record<LotError, string> = {
		incomplete: text.lotIncomplete,
		points: text.lotPoints,
		beforeDate: text.lotBeforeDate,
		duplicate: text.lotDuplicate,
		aboveBalance: text.lotAboveBalance,
	};
	return messages[error];
}

/** A row of the form with a key for React. The key stays when a row goes. */
type Row = LotDraft & { readonly key: number };

function Fields({
	accountId,
	lots,
	onClose,
}: {
	accountId: string;
	lots: ExpiryLot[];
	onClose: () => void;
}) {
	const { t: text, intl } = useI18n();
	const fieldId = useId();
	const [points, setPoints] = useState("");
	const [observedAt, setObservedAt] = useState(() => todayIso(new Date()));
	const [invalid, setInvalid] = useState(false);
	const [rows, setRows] = useState<Row[]>(() =>
		draftsOf(lots, todayIso(new Date()), intl).map((draft, key) => ({
			...draft,
			key,
		})),
	);
	const [nextKey, setNextKey] = useState(lots.length);
	const [lotError, setLotError] = useState<LotError | null>(null);

	const change = (key: number, field: keyof LotDraft, value: string) =>
		setRows(
			rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
		);

	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: (value: { points: number; lots: ExpiryLot[] }) =>
			addSnapshot(accountId, { ...value, observedAt }),
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
				const value = parsePoints(points, intl);
				setInvalid(value === null);
				if (value === null) {
					setLotError(null);
					return;
				}
				const read = readLots(rows, value, observedAt, intl);
				setLotError(read.ok ? null : read.error);
				if (read.ok) {
					save.mutate({ points: value, lots: read.lots });
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
					// Safari on iOS gives the theme of the system to a field of the
					// type `date`. That theme makes the box `content-box` after the
					// cascade, thus the padding and the border go outside the width of
					// 100 per cent. The field is then 26 pixels wider than the field of
					// the balance, and it goes outside the form. `appearance-none`
					// removes that theme, and the two fields hold the same size.
					className="appearance-none"
					// The current balance is the snapshot with the latest date, thus
					// a future date hides each later update.
					max={todayIso(new Date())}
					value={observedAt}
					onChange={(event) => setObservedAt(event.target.value)}
				/>
			</div>

			<fieldset className="flex flex-col gap-2">
				<legend className="mb-2 font-medium text-sm">{text.expiryTitle}</legend>
				{rows.map((row) => (
					<div key={row.key} className="grid grid-cols-2 gap-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor={`${fieldId}-lot-${row.key}-points`}>
								{text.expiryPointsLabel}
							</Label>
							<Input
								id={`${fieldId}-lot-${row.key}-points`}
								value={row.points}
								inputMode="numeric"
								autoComplete="off"
								onChange={(event) =>
									change(row.key, "points", event.target.value)
								}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor={`${fieldId}-lot-${row.key}-date`}>
								{text.expiryDateLabel}
							</Label>
							{/* `appearance-none`: the same reason as the date of the balance. */}
							<Input
								id={`${fieldId}-lot-${row.key}-date`}
								type="date"
								className="appearance-none"
								min={observedAt}
								value={row.expiresOn}
								onChange={(event) =>
									change(row.key, "expiresOn", event.target.value)
								}
							/>
						</div>
						<Button
							variant="outline"
							type="button"
							className="col-span-2 justify-self-start text-destructive"
							onClick={() =>
								setRows(rows.filter((other) => other.key !== row.key))
							}
						>
							{text.removeExpiry}
						</Button>
					</div>
				))}
				<Button
					variant="outline"
					type="button"
					className="self-start"
					onClick={() => {
						setRows([...rows, { key: nextKey, points: "", expiresOn: "" }]);
						setNextKey(nextKey + 1);
					}}
				>
					{text.addExpiry}
				</Button>
			</fieldset>

			{invalid && (
				<p className="text-destructive text-sm">{text.pointsError}</p>
			)}
			{lotError !== null && (
				<p className="text-destructive text-sm">{lotMessage(lotError, text)}</p>
			)}
			{save.isError && (
				<p className="text-destructive text-sm">
					{isSupporterRequired(save.error)
						? text.freeLotsError
						: text.saveError}
				</p>
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
