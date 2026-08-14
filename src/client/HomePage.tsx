import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { buttonVariants } from "./components/ui/button.tsx";
import { cn } from "./lib/cn.ts";
import { text } from "./text.ts";

/**
 * The value of the board of the example.
 *
 * The number is an example, and the page says it. The page shows no ratio and
 * no name of a programme: a ratio needs a source, and the catalogue of
 * `src/server/db/seed/` is the only source. Refer to the rule 5 of the data in
 * `CLAUDE.md`.
 */
const EXAMPLE_POINTS = 128_400;

/**
 * The image of the dashboard. The file is in `public/`, thus Vite copies it
 * and the server supplies it from `dist/`.
 *
 * The image comes from the application, not from a program of design: a
 * browser opens the dashboard with balances of an example and gives the
 * picture. The cards hold the calculation of the real catalogue.
 */
const SCREENSHOT = {
	src: "/screenshot-dashboard.png",
	width: 780,
	height: 1108,
};

/**
 * The public page of the application. A visitor with no session reads it.
 *
 * Yume gives an account only with an invitation, thus this page sells nothing.
 * It gives the context that the form of the access does not give: what Yume
 * calculates, and the two limits of that calculation. Refer to paragraph 5.5.1
 * of `docs/architecture.md`.
 *
 * The text is at the centre, and the board of the example is the first
 * surface. The blocks arrive one after the other, thus the page has the rhythm
 * of a board that turns its flaps.
 *
 * The link of the access holds `buttonVariants` of `components/ui/button.tsx`.
 * A navigation needs an `a` element, and the `Link` of the router gives it.
 * Thus the link has the appearance of the standard button.
 */
export function HomePage() {
	return (
		<div className="flex flex-col items-center gap-8 text-center">
			<Rise index={0} className="flex flex-col items-center gap-3">
				<h1 className="font-board text-[33px] text-board-amber tracking-widest">
					{text.appName.toUpperCase()}
				</h1>
				<p className="text-board-text text-sm">{text.homeTagline}</p>
			</Rise>

			<Rise index={1} className="flex flex-col items-center gap-2">
				<p className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.potentialTitle}
				</p>
				<SplitFlapNumber value={EXAMPLE_POINTS} />
				<p className="text-board-muted text-xs">{text.homeExample}</p>
			</Rise>

			<dl className="flex w-full flex-col gap-5">
				<Point index={2} title={text.homeHowTitle} body={text.homeHow} />
				<Point index={3} title={text.homeLimitsTitle} body={text.homeLimits} />
				<Point index={4} title={text.homeScopeTitle} body={text.homeScope} />
			</dl>

			<Rise index={5} className="flex w-full flex-col items-center gap-2">
				<p className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.homeScreenshotTitle}
				</p>
				{/* The size is the size of the file. Thus the page keeps the space of
				    the image before the load, and the text below does not move. */}
				<img
					src={SCREENSHOT.src}
					alt={text.homeScreenshotAlt}
					width={SCREENSHOT.width}
					height={SCREENSHOT.height}
					className="h-auto w-full rounded-lg border border-board-line"
				/>
			</Rise>

			<Rise index={6} className="flex w-full flex-col items-center gap-2">
				<Link to="/login" className={cn(buttonVariants(), "w-full")}>
					{text.signIn}
				</Link>
				<p className="text-board-muted text-xs">{text.inviteOnly}</p>
			</Rise>
		</div>
	);
}

/**
 * One block of the page. It arrives at the place `index`.
 *
 * The variable of the delay is in the style, because the value is a number of
 * the component. The rules of the animation are in `styles/theme.css`.
 */
function Rise({
	index,
	className,
	children,
}: {
	index: number;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn("board-rise", className)}
			style={{ "--rise-index": index } as CSSProperties}
		>
			{children}
		</div>
	);
}

/** One short point of the page: a title of the board and one sentence. */
function Point({
	index,
	title,
	body,
}: {
	index: number;
	title: string;
	body: string;
}) {
	return (
		<Rise index={index}>
			<dt className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{title}
			</dt>
			<dd className="mt-1 text-sm">{body}</dd>
		</Rise>
	);
}
