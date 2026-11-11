import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SUPPORTER_PRICE_CENTS } from "../../shared/tier.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { fetchMe, openPortal, startCheckout } from "../lib/api.ts";
import { formatDate, formatEuros } from "../lib/format.ts";
import {
	activationPoll,
	supporterErrorOf,
	supporterView,
} from "../lib/supporter.ts";
import { Button } from "./ui/button.tsx";

/** The id of the section. The messages of the limits link to it. */
const SECTION_ID = "supporter";

/**
 * The section of the supporter account: the price and the checkout, or the
 * state of the subscription and the customer portal. Paragraph 4.6.1 of
 * `docs/architecture.md`.
 *
 * The section shows nothing on an instance with no payment. After the return
 * from Stripe it reads `GET /api/me` again until the webhook arrives. The
 * panel is a standard surface, because it holds buttons.
 *
 * `returned` is true when the address holds `?checkout=done`.
 */
export function SupporterPanel(props: { returned: boolean }) {
	const { t: text, intl, locale } = useI18n();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [returnedAt] = useState(() => Date.now());
	const me = useQuery({
		queryKey: ["me"],
		queryFn: fetchMe,
		refetchInterval: (query) =>
			activationPoll(
				supporterView(query.state.data, props.returned),
				Date.now() - returnedAt,
			),
	});
	const view = supporterView(me.data, props.returned);

	// The webhook arrived: the address loses the parameter. A reload then
	// shows no activation.
	const activated = me.data !== undefined && view.kind !== "activating";
	useEffect(() => {
		if (props.returned && activated) {
			void navigate({ to: "/dashboard", search: {}, replace: true });
		}
	}, [props.returned, activated, navigate]);

	// The two requests open a page of Stripe. After the answer the button
	// stays disabled: the browser leaves the page.
	const open = useMutation({
		mutationFn: (target: "checkout" | "portal") =>
			target === "checkout" ? startCheckout(locale) : openPortal(locale),
		onSuccess: ({ url }) => window.location.assign(url),
		// A subscription that exists makes the state of the page old.
		onError: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
	});
	const busy = open.isPending || open.isSuccess;

	if (view.kind === "hidden") {
		return null;
	}

	const manage = (
		<Button
			variant="outline"
			type="button"
			className="self-start"
			disabled={busy}
			onClick={() => open.mutate("portal")}
		>
			{busy ? text.supporter.opening : text.supporter.manage}
		</Button>
	);

	return (
		<section
			id={SECTION_ID}
			className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4"
		>
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.supporter.title}
			</h2>

			{view.kind === "offer" && (
				<>
					<p className="text-sm">{text.supporter.offer}</p>
					<p className="text-sm">
						<span className="font-bold">
							{formatEuros(SUPPORTER_PRICE_CENTS, intl)}
						</span>{" "}
						{text.supporter.perYear}
					</p>
					<Button
						type="button"
						className="self-start"
						disabled={busy}
						onClick={() => open.mutate("checkout")}
					>
						{busy ? text.supporter.opening : text.supporter.buy}
					</Button>
					<p className="text-muted-foreground text-xs">
						{text.supporter.renewal} {text.supporter.withdrawal}{" "}
						<Link to="/tos" className="underline underline-offset-2">
							{text.supporter.terms}
						</Link>
					</p>
				</>
			)}

			{view.kind === "activating" && (
				<p className="text-sm">{text.supporter.activating}</p>
			)}

			{(view.kind === "renews" || view.kind === "ends") && (
				<>
					<p className="text-sm">
						{view.kind === "renews"
							? text.supporter.renews
							: text.supporter.ends}{" "}
						{formatDate(view.day, intl)}
					</p>
					{manage}
				</>
			)}

			{view.kind === "payment_failed" && (
				<>
					<p className="text-destructive text-sm">
						{text.supporter.paymentFailed}
					</p>
					{manage}
				</>
			)}

			{open.isError && (
				<p className="text-destructive text-sm">
					{supporterErrorOf(open.error) === "already"
						? text.supporter.already
						: text.supporter.unavailable}
				</p>
			)}
		</section>
	);
}

/**
 * The link from a message of the limits to the section. It shows only with
 * the offer: on an instance with no payment the user cannot buy.
 */
export function SupporterLink() {
	const { t: text } = useI18n();
	const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
	if (supporterView(me.data, false).kind !== "offer") {
		return null;
	}
	return (
		<a href={`#${SECTION_ID}`} className="underline underline-offset-2">
			{text.supporter.link}
		</a>
	);
}
