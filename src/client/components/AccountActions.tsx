import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteAccount, deleteSnapshot } from "../lib/api.ts";
import { text } from "../text.ts";
import { Button } from "./ui/button.tsx";

/**
 * The two removals of one account: the current balance and the account.
 *
 * A removal is permanent, therefore each action asks a question first. The
 * removal of the balance is the correction of a value that the user wrote in a
 * wrong way: the account then shows the balance before it.
 */
export function AccountActions({
	accountId,
	snapshotId,
}: {
	accountId: string;
	/** The most recent snapshot. It is null when the account has no balance. */
	snapshotId: string | null;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{snapshotId !== null && (
				<Confirm
					label={text.removeBalance}
					question={text.removeBalanceQuestion}
					action={() => deleteSnapshot(accountId, snapshotId)}
				/>
			)}
			<Confirm
				label={text.removeAccount}
				question={text.removeAccountQuestion}
				action={() => deleteAccount(accountId)}
			/>
		</div>
	);
}

/** A button that asks a question before it does the action. */
function Confirm({
	label,
	question,
	action,
}: {
	label: string;
	question: string;
	action: () => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const remove = useMutation({
		mutationFn: action,
		onSuccess: async () => {
			// The state changes before the queries. The removal of an account takes
			// away this component, thus a change of the state after the refresh
			// arrives at a component that is not present.
			setOpen(false);
			// A removal changes the list of the accounts, and also the potential of
			// each currency that the account can reach.
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["potential"] });
		},
	});

	if (!open) {
		return (
			<Button
				variant="outline"
				type="button"
				className="text-destructive"
				onClick={() => setOpen(true)}
			>
				{label}
			</Button>
		);
	}

	return (
		<div className="flex w-full flex-col gap-2 rounded-md border border-border bg-background p-3">
			<p className="text-sm">{question}</p>
			{remove.isError && (
				<p className="text-destructive text-sm">{text.removeError}</p>
			)}
			<div className="flex gap-2">
				<Button
					type="button"
					disabled={remove.isPending}
					onClick={() => remove.mutate()}
				>
					{text.confirm}
				</Button>
				<Button
					variant="outline"
					type="button"
					disabled={remove.isPending}
					onClick={() => setOpen(false)}
				>
					{text.cancel}
				</Button>
			</div>
		</div>
	);
}
