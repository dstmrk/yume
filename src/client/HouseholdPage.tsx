import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import type {
	AccountRow,
	HouseholdMember,
	HouseholdResponse,
} from "../shared/api.ts";
import type { Currency, Program } from "../shared/catalogue.ts";
import type { HouseholdPotential } from "../shared/household.ts";
import { AppTitle } from "./components/board/AppTitle.tsx";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { ProgramName } from "./components/board/ProgramLogo.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { Confirm } from "./components/Confirm.tsx";
import { NewAccountForm } from "./components/NewAccountForm.tsx";
import { NewBalanceForm } from "./components/NewBalanceForm.tsx";
import { SupporterLink } from "./components/SupporterPanel.tsx";
import { Button, buttonVariants } from "./components/ui/button.tsx";
import { Input } from "./components/ui/input.tsx";
import { Label } from "./components/ui/label.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import {
	addManualMember,
	answerInvitation,
	cancelHouseholdInvite,
	createHousehold,
	deleteHousehold,
	deleteMemberAccount,
	fetchCatalogue,
	fetchHousehold,
	fetchMe,
	inviteToHousehold,
	removeHouseholdMember,
} from "./lib/api.ts";
import { formatDate, formatPoints } from "./lib/format.ts";
import {
	canCreateHousehold,
	householdCards,
	householdErrorKey,
} from "./lib/household.ts";

/**
 * The page of the household. Paragraph 4.10 of `docs/architecture.md` gives
 * the decisions.
 *
 * The page shows real values of the members, thus it gives the warning that a
 * transfer of points is permanent. A card shows a total only for a currency
 * with a pool: two people cannot spend their miles in one booking without it.
 */
export function HouseholdPage() {
	const { t: text } = useI18n();
	const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
	const household = useQuery({
		queryKey: ["household"],
		queryFn: fetchHousehold,
	});
	const catalogue = useQuery({
		queryKey: ["catalogue"],
		queryFn: fetchCatalogue,
	});

	const back = (
		<Link to="/dashboard" className={buttonVariants({ variant: "outline" })}>
			{text.dashboardLink}
		</Link>
	);

	if (me.isPending || household.isPending || catalogue.isPending) {
		return (
			<>
				<AppTitle />
				<p className="text-board-muted text-sm">{text.loading}</p>
			</>
		);
	}
	if (me.isError || household.isError || catalogue.isError) {
		return (
			<>
				<AppTitle />
				<p className="text-board-muted text-sm">{text.loadError}</p>
			</>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<AppTitle />
			<section className="flex flex-col gap-2">
				<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.household.title}
				</h2>
				<p className="text-board-muted text-sm">{text.household.intro}</p>
			</section>

			{me.data.country === null ? (
				<p className="text-board-muted text-sm">
					{text.household.countryFirst}
				</p>
			) : household.data.household === null ? (
				<NoHousehold
					invitations={household.data.invitations}
					canCreate={canCreateHousehold(me.data)}
				/>
			) : (
				<Household
					value={household.data.household}
					programs={catalogue.data.programs}
					currencies={catalogue.data.currencies}
				/>
			)}
			{back}
		</div>
	);
}

/** The message of an error of a request of the household. */
function ErrorLine({ error }: { error: unknown }) {
	const { t: text } = useI18n();
	const key = householdErrorKey(error);
	return (
		<p className="text-destructive text-sm">
			{text.household.errors[key]}
			{key === "supporterRequired" && (
				<>
					{" "}
					<SupporterLink />
				</>
			)}
		</p>
	);
}

/** A request of the household, that loads the household again after it. */
function useHouseholdAction<T>(action: (input: T) => Promise<unknown>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: action,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["household"] }),
	});
}

/** A user with no household: the invitations, and the button to make one. */
function NoHousehold({
	invitations,
	canCreate,
}: {
	invitations: HouseholdResponse["invitations"];
	canCreate: boolean;
}) {
	const { t: text } = useI18n();
	const answer = useHouseholdAction(
		(input: { householdId: string; accept: boolean }) =>
			answerInvitation(input.householdId, input.accept),
	);
	const create = useHouseholdAction(() => createHousehold());

	return (
		<>
			{invitations.map((invitation) => (
				<div
					key={invitation.householdId}
					className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4"
				>
					<p className="text-sm">
						{text.household.invitationFrom} {invitation.ownerEmail}
					</p>
					<p className="text-muted-foreground text-sm">
						{text.household.acceptNote}
					</p>
					<div className="flex gap-2">
						<Button
							type="button"
							disabled={answer.isPending}
							onClick={() =>
								answer.mutate({
									householdId: invitation.householdId,
									accept: true,
								})
							}
						>
							{text.household.accept}
						</Button>
						<Button
							variant="outline"
							type="button"
							disabled={answer.isPending}
							onClick={() =>
								answer.mutate({
									householdId: invitation.householdId,
									accept: false,
								})
							}
						>
							{text.household.refuse}
						</Button>
					</div>
				</div>
			))}
			{answer.isError && <ErrorLine error={answer.error} />}

			<div className="flex flex-col gap-2">
				<Button
					type="button"
					disabled={!canCreate || create.isPending}
					onClick={() => create.mutate(undefined)}
				>
					{text.household.create}
				</Button>
				{!canCreate && (
					<p className="text-board-muted text-sm">
						{text.supportersOnly} <SupporterLink />
					</p>
				)}
				{create.isError && <ErrorLine error={create.error} />}
			</div>
		</>
	);
}

type HouseholdValue = NonNullable<HouseholdResponse["household"]>;

function Household({
	value,
	programs,
	currencies,
}: {
	value: HouseholdValue;
	programs: readonly Program[];
	currencies: readonly Currency[];
}) {
	const { t: text } = useI18n();
	const names = new Map(programs.map((program) => [program.id, program.name]));
	const currencyNames = new Map(
		currencies.map((currency) => [currency.id, currency.name]),
	);
	const memberName = (member: HouseholdMember) =>
		member.name ?? text.household.owner;
	const membersById = new Map(value.members.map((m) => [m.id, m]));
	const cards = householdCards(value.potential);

	return (
		<>
			<section className="flex flex-col gap-3">
				<header>
					<p className="text-board-muted text-xs">{text.potentialWarning}</p>
				</header>
				{cards.length === 0 ? (
					<p className="text-board-muted text-sm">
						{text.household.noPotential}
					</p>
				) : (
					cards.map((row) => (
						<HouseholdCard
							key={row.currencyId}
							row={row}
							title={currencyNames.get(row.currencyId) ?? row.currencyId}
							nameOf={(memberId) => {
								const member = membersById.get(memberId);
								return member === undefined ? "" : memberName(member);
							}}
						/>
					))
				)}
			</section>

			{value.owner && !value.canManage && (
				<p className="text-board-muted text-sm">
					{text.household.readOnly} <SupporterLink />
				</p>
			)}

			<BoardPanel title={text.household.membersTitle}>
				<ul className="flex flex-col gap-5">
					{value.members.map((member) => (
						<MemberRow
							key={member.id}
							member={member}
							name={memberName(member)}
							household={value}
							programName={(id) => names.get(id) ?? id}
							programs={programs}
							currencies={currencies}
						/>
					))}
				</ul>
			</BoardPanel>

			{value.owner && (
				<>
					{value.invites.length > 0 && <PendingInvites value={value} />}
					{value.canManage && (
						<>
							<InviteForm />
							<ManualMemberForm />
						</>
					)}
					<Confirm
						label={text.household.remove}
						question={text.household.removeQuestion}
						action={deleteHousehold}
						queryKeys={[["household"]]}
					/>
				</>
			)}
		</>
	);
}

/**
 * The card of one currency. A currency with a pool shows the total on the
 * flaps. A currency with no pool shows no total: the line says that each
 * person spends the own miles.
 */
function HouseholdCard({
	row,
	title,
	nameOf,
}: {
	row: HouseholdPotential;
	title: string;
	nameOf: (memberId: string) => string;
}) {
	const { t: text, intl } = useI18n();
	return (
		<BoardPanel
			title={title}
			note={row.pooled ? undefined : text.household.notPooled}
		>
			{row.total !== null && (
				<div className="flex flex-col items-start gap-1">
					<span className="text-board-muted text-xs">
						{text.household.pooledLabel}
					</span>
					<SplitFlapNumber value={row.total} variant="potential" />
				</div>
			)}
			<ul
				className={
					row.total === null
						? "flex flex-col gap-1"
						: "mt-3 flex flex-col gap-1 border-board-line border-t pt-3"
				}
			>
				{row.members
					.filter((member) => member.potential.total > 0)
					.map((member) => (
						<li
							key={member.memberId}
							className="flex items-center justify-between gap-3 text-sm"
						>
							<span className="text-board-muted">
								{nameOf(member.memberId)}
							</span>
							<span className="shrink-0 tabular-nums">
								{formatPoints(member.potential.total, intl)}
							</span>
						</li>
					))}
			</ul>
		</BoardPanel>
	);
}

/** One person of the household, with the accounts and the actions. */
function MemberRow({
	member,
	name,
	household,
	programName,
	programs,
	currencies,
}: {
	member: HouseholdMember;
	name: string;
	household: HouseholdValue;
	programName: (programId: string) => string;
	programs: readonly Program[];
	currencies: readonly Currency[];
}) {
	const { t: text } = useI18n();
	const manual = member.kind === "manual";
	const tags = [
		member.self ? text.household.you : null,
		manual ? text.household.manual : null,
	].filter((tag) => tag !== null);

	// The owner writes the accounts of a manual member. A member of Yume
	// writes the own accounts on the dashboard.
	const editable = manual && household.owner;
	const removable = household.owner ? !member.owner : member.self;

	return (
		<li className="flex flex-col gap-2">
			<p className="text-sm">
				{name}
				{tags.length > 0 && (
					<span className="text-board-muted"> · {tags.join(" · ")}</span>
				)}
			</p>
			{member.accounts.length > 0 && (
				<ul className="flex flex-col gap-3 pl-3">
					{member.accounts.map((account) => (
						<AccountLine
							key={account.accountId}
							account={account}
							name={programName(account.programId)}
							editable={editable}
						/>
					))}
				</ul>
			)}
			{editable && household.canManage && (
				<NewAccountForm
					programs={programs}
					currencies={currencies}
					accountProgramIds={member.accounts.map((a) => a.programId)}
					memberId={member.id}
				/>
			)}
			{removable && (
				<Confirm
					label={
						member.self ? text.household.leave : text.household.removeMember
					}
					question={
						member.self
							? text.household.leaveQuestion
							: manual
								? text.household.removeManualQuestion
								: text.household.removeMemberQuestion
					}
					action={() => removeHouseholdMember(member.id)}
					queryKeys={[["household"]]}
				/>
			)}
		</li>
	);
}

function AccountLine({
	account,
	name,
	editable,
}: {
	account: AccountRow;
	name: string;
	editable: boolean;
}) {
	const { t: text, intl } = useI18n();
	return (
		<li className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-3">
				<ProgramName programId={account.programId} className="text-sm">
					{name}
				</ProgramName>
				{account.points === null ? (
					<span className="shrink-0 text-board-muted text-xs">
						{text.noBalance}
					</span>
				) : (
					<span className="flex shrink-0 flex-col items-end gap-1">
						<SplitFlapNumber value={account.points} variant="balance" />
						{account.observedAt !== null && (
							<span className="text-board-muted text-xs">
								{text.observedOn} {formatDate(account.observedAt, intl)}
							</span>
						)}
					</span>
				)}
			</div>
			{editable && (
				<div className="flex flex-wrap gap-2">
					<NewBalanceForm
						accountId={account.accountId}
						lots={account.lots}
						member
					/>
					<Confirm
						label={text.removeAccount}
						question={text.removeAccountQuestion}
						action={() => deleteMemberAccount(account.accountId)}
						queryKeys={[["household"]]}
					/>
				</div>
			)}
		</li>
	);
}

function PendingInvites({ value }: { value: HouseholdValue }) {
	const { t: text } = useI18n();
	const cancel = useHouseholdAction((email: string) =>
		cancelHouseholdInvite(email),
	);
	return (
		<BoardPanel title={text.household.pendingTitle}>
			<ul className="flex flex-col gap-2">
				{value.invites.map((invite) => (
					<li
						key={invite.email}
						className="flex items-center justify-between gap-3 text-sm"
					>
						<span className="min-w-0 break-all">
							{invite.name} · {invite.email}
						</span>
						<Button
							variant="outline"
							type="button"
							disabled={cancel.isPending}
							onClick={() => cancel.mutate(invite.email)}
						>
							{text.household.cancelInvite}
						</Button>
					</li>
				))}
			</ul>
			{cancel.isError && <ErrorLine error={cancel.error} />}
		</BoardPanel>
	);
}

function InviteForm() {
	const { t: text } = useI18n();
	const fieldId = useId();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const send = useHouseholdAction(() => inviteToHousehold(email, name));
	return (
		<form
			className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				send.mutate(undefined, {
					onSuccess: () => {
						setEmail("");
						setName("");
					},
				});
			}}
		>
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.household.inviteTitle}
			</h2>
			<p className="text-muted-foreground text-sm">
				{text.household.inviteNote}
			</p>
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-name`}>{text.household.nameLabel}</Label>
				<Input
					id={`${fieldId}-name`}
					value={name}
					autoComplete="off"
					maxLength={40}
					onChange={(event) => setName(event.target.value)}
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-email`}>{text.household.emailLabel}</Label>
				<Input
					id={`${fieldId}-email`}
					type="email"
					value={email}
					autoComplete="off"
					onChange={(event) => setEmail(event.target.value)}
				/>
			</div>
			{send.isError && <ErrorLine error={send.error} />}
			<Button
				type="submit"
				className="self-start"
				disabled={email.trim() === "" || name.trim() === "" || send.isPending}
			>
				{text.household.invite}
			</Button>
		</form>
	);
}

function ManualMemberForm() {
	const { t: text } = useI18n();
	const fieldId = useId();
	const [name, setName] = useState("");
	const add = useHouseholdAction(() => addManualMember(name));
	return (
		<form
			className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				add.mutate(undefined, { onSuccess: () => setName("") });
			}}
		>
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.household.manualTitle}
			</h2>
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${fieldId}-name`}>{text.household.nameLabel}</Label>
				<Input
					id={`${fieldId}-name`}
					value={name}
					autoComplete="off"
					maxLength={40}
					onChange={(event) => setName(event.target.value)}
				/>
			</div>
			{add.isError && <ErrorLine error={add.error} />}
			<Button
				type="submit"
				className="self-start"
				disabled={name.trim() === "" || add.isPending}
			>
				{text.household.addManual}
			</Button>
		</form>
	);
}
