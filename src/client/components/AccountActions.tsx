import { useI18n } from "../i18n/I18n.tsx";
import { deleteAccount, deleteSnapshot } from "../lib/api.ts";
import { Confirm } from "./Confirm.tsx";

/**
 * A removal changes the list of the accounts, and also the potential of each
 * currency that the account can reach.
 */
const AFTER_REMOVAL = [["accounts"], ["potential"]] as const;

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
	const { t: text } = useI18n();
	return (
		<div className="flex flex-wrap gap-2">
			{snapshotId !== null && (
				<Confirm
					label={text.removeBalance}
					question={text.removeBalanceQuestion}
					action={() => deleteSnapshot(accountId, snapshotId)}
					queryKeys={AFTER_REMOVAL}
				/>
			)}
			<Confirm
				label={text.removeAccount}
				question={text.removeAccountQuestion}
				action={() => deleteAccount(accountId)}
				queryKeys={AFTER_REMOVAL}
			/>
		</div>
	);
}
