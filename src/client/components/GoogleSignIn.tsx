import { useMutation } from "@tanstack/react-query";
import { useI18n } from "../i18n/I18n.tsx";
import { startGoogleSignIn } from "../lib/api.ts";
import { googleSignInBody } from "../lib/auth.ts";
import { cn } from "../lib/cn.ts";
import { Button } from "./ui/button.tsx";

/**
 * The sign-in with Google, the only provider. The first sign-in makes the
 * account. Paragraph 4.1 of `docs/architecture.md` gives the decision.
 *
 * The button follows the dark theme of the rules of Google: the fill, the
 * stroke, the text and the mark "G" of Google. The mark is the official file,
 * cut to the letter, in `public/google-g.png`. The PNG holds the fill of the
 * button, thus it needs no transparency.
 *
 * The panel is a standard surface, not a surface of the board. Refer to
 * paragraph 5 of `docs/architecture.md`.
 */
export function GoogleSignIn({ error }: { error?: string }) {
	const { t: text, locale } = useI18n();
	const start = useMutation({
		mutationFn: () =>
			startGoogleSignIn(googleSignInBody(window.location.origin, locale)),
		onSuccess: (url) => window.location.assign(url),
	});

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4">
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.signInTitle}
			</h2>

			<Button
				variant="outline"
				type="button"
				disabled={start.isPending || start.isSuccess}
				onClick={() => start.mutate()}
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

			<p className="text-board-muted text-xs">{text.signInNote}</p>

			{(error !== undefined || start.isError) && (
				<p role="alert" className="text-destructive text-sm">
					{text.signInError}
				</p>
			)}
		</div>
	);
}
