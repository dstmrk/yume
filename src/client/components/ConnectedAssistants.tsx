import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../i18n/I18n.tsx";
import { fetchConnections, revokeConnection } from "../lib/api.ts";
import { connectionLabel } from "../lib/connections.ts";
import { Confirm } from "./Confirm.tsx";

/**
 * The assistants that the user authorised on the MCP server, for example
 * Claude, each with a button to revoke the access. Issue #97 and paragraph
 * 4.7.2 of `docs/architecture.md`.
 *
 * The section shows nothing while it loads, after an error, or with no
 * assistant: most users connect no assistant. The panel is a standard
 * surface, not a surface of the board, because it holds a form.
 */
export function ConnectedAssistants() {
	const { t: text, intl } = useI18n();
	const connections = useQuery({
		queryKey: ["connections"],
		queryFn: fetchConnections,
	});

	const list = connections.data?.connections ?? [];
	if (list.length === 0) {
		return null;
	}

	return (
		<section className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4">
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.connectionsTitle}
			</h2>
			<ul className="flex flex-col gap-4">
				{list.map((connection) => {
					const label = connectionLabel(connection, intl);
					return (
						<li key={connection.clientId} className="flex flex-col gap-2">
							<div className="flex flex-col">
								<span className="text-sm">{label.title}</span>
								<span className="text-board-muted text-xs">{label.detail}</span>
							</div>
							{/* The row holds the button at the width of its text, as the
							    buttons of the accounts. */}
							<div className="flex">
								<Confirm
									label={text.revokeConnection}
									question={text.revokeConnectionQuestion}
									action={() => revokeConnection(connection.clientId)}
									queryKeys={[["connections"]]}
								/>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
