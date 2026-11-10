import { useState } from "react";
import { useI18n } from "../i18n/I18n.tsx";
import { startGoogleSignIn } from "../lib/api.ts";
import { googleSignInBody, withOAuthQuery } from "../lib/auth.ts";
import { cn } from "../lib/cn.ts";
import { Button } from "./ui/button.tsx";

/**
 * The button of the sign-in with Google, the only provider. The public page
 * and the page of the access both show it.
 *
 * The button follows the dark theme of the rules of Google: the fill, the
 * stroke, the text and the mark "G" of Google. The rules of Google forbid a
 * mark of one colour, thus the mark keeps its four colours. The mark is the
 * official file, cut to the letter, in `public/google-g.png`. The PNG holds
 * the fill of the button, thus it needs no transparency.
 *
 * The state is a `useState` and not a `useMutation`. The build writes the
 * public page with `renderToStaticMarkup`, and that render holds no client of
 * TanStack Query.
 *
 * `error` is the code that Better Auth adds to the address of `/login`. The
 * button then shows the same message as for an error of the request.
 */
export function GoogleButton({ error }: { error?: string }) {
	const { t: text, locale } = useI18n();
	const [state, setState] = useState<"idle" | "pending" | "failed">("idle");

	function start() {
		setState("pending");
		// On `/login`, the address can hold the signed query of an
		// authorisation of the MCP server. The server then goes on with it.
		const body = withOAuthQuery(
			googleSignInBody(window.location.origin, locale),
			window.location.search,
		);
		startGoogleSignIn(body).then(
			// The state stays `pending`: the page opens Google, and a second
			// press must not start a second request.
			(url) => window.location.assign(url),
			() => setState("failed"),
		);
	}

	return (
		<>
			<Button
				variant="outline"
				type="button"
				disabled={state === "pending"}
				onClick={start}
				className={cn(
					"h-10 rounded-[4px] border-google-stroke bg-google-fill px-3 text-google-text",
					"hover:bg-google-fill hover:brightness-110",
				)}
			>
				<img
					src="/google-g.png"
					alt=""
					width={20}
					height={20}
					className="size-5"
				/>
				{text.signInWithGoogle}
			</Button>

			{(error !== undefined || state === "failed") && (
				<p role="alert" className="text-destructive text-sm">
					{text.signInError}
				</p>
			)}
		</>
	);
}
