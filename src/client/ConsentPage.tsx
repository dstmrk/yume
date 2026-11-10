import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppTitle } from "./components/board/AppTitle.tsx";
import { Button } from "./components/ui/button.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { fetchOAuthClientName, sendConsent } from "./lib/api.ts";
import {
	clientLabel,
	consentBody,
	consentRequestOf,
	scopeTexts,
} from "./lib/consent.ts";

/**
 * The page `/consent`: the authorisation of an assistant on the MCP server.
 *
 * The authorisation server opens this page after the sign-in, with a signed
 * query. The page shows the client, the host that receives the code and the
 * permissions. The answer opens the address of the client. Paragraph 4.7.2 of
 * `docs/architecture.md` gives the flow.
 *
 * The page reads `window.location.search` and not the search of the router:
 * the signature covers the parameters exactly as the server wrote them.
 *
 * The panel is a standard surface, not a surface of the board. Refer to
 * paragraph 5 of `docs/architecture.md`.
 */
export function ConsentPage() {
	const { t: text } = useI18n();
	const [request] = useState(() => consentRequestOf(window.location.search));
	const [state, setState] = useState<"idle" | "pending" | "failed">("idle");
	const client = useQuery({
		queryKey: ["oauth-client", request?.clientId],
		queryFn: () => fetchOAuthClientName(request?.clientId ?? ""),
		enabled: request !== undefined,
	});

	if (request === undefined) {
		return (
			<>
				<AppTitle />
				<p role="alert" className="text-destructive text-sm">
					{text.consent.invalid}
				</p>
			</>
		);
	}

	function answer(accept: boolean) {
		if (request === undefined) {
			return;
		}
		setState("pending");
		sendConsent(consentBody(request, accept)).then(
			// The state stays `pending`: the page opens the client, and a second
			// press must not send a second answer.
			(url) => window.location.assign(url),
			() => setState("failed"),
		);
	}

	return (
		<>
			<AppTitle />
			<div className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4">
				<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.consent.title}
				</h2>
				<p className="text-sm">
					<strong>{clientLabel(client.data, request.clientId)}</strong>{" "}
					{text.consent.lead}
				</p>

				<div className="flex flex-col gap-1 text-sm">
					<p>{text.consent.permissions}</p>
					<ul className="list-disc pl-5">
						{scopeTexts(request.scopes, text.consent.scopes).map((scope) => (
							<li key={scope}>{scope}</li>
						))}
					</ul>
				</div>

				<p className="text-board-muted text-xs">
					{text.consent.redirect}{" "}
					<span className="font-board">{request.redirectHost}</span>
				</p>
				{request.loopback && <p className="text-xs">{text.consent.loopback}</p>}

				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						disabled={state === "pending"}
						onClick={() => answer(true)}
					>
						{text.consent.accept}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={state === "pending"}
						onClick={() => answer(false)}
					>
						{text.consent.deny}
					</Button>
				</div>

				{state === "failed" && (
					<p role="alert" className="text-destructive text-sm">
						{text.consent.error}
					</p>
				)}
			</div>
		</>
	);
}
