import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "../i18n/I18n.tsx";
import { Button } from "./ui/button.tsx";

/**
 * A button that asks a question before it does the action.
 *
 * A removal is permanent, thus the action runs only after the confirmation.
 * `queryKeys` names the queries that the action changes: they load again
 * after a success.
 */
export function Confirm({
	label,
	question,
	action,
	queryKeys,
}: {
	label: string;
	question: string;
	action: () => Promise<void>;
	queryKeys: readonly (readonly string[])[];
}) {
	const { t: text } = useI18n();
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const remove = useMutation({
		mutationFn: action,
		onSuccess: async () => {
			// The state changes before the queries. A removal takes away this
			// component, thus a change of the state after the refresh arrives at
			// a component that is not present.
			setOpen(false);
			for (const queryKey of queryKeys) {
				await queryClient.invalidateQueries({ queryKey });
			}
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
