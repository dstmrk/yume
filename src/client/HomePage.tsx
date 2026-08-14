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
 *
 * The picture starts at the first card. The header of the dashboard holds the
 * warning of the transfer, and this page does not give that warning.
 *
 * The size is the size of a telephone: the browser holds a screen of 390 by
 * 760 pixels. Thus the picture enters the frame of `PhoneFrame` and it keeps
 * the proportion of the screen.
 */
const SCREENSHOT = {
	src: "/screenshot-dashboard.png",
	width: 780,
	height: 1520,
};

/**
 * The public page of the application. A visitor with no session reads it.
 *
 * Yume gives an account only with an invitation, thus this page sells nothing.
 * It gives the context that the form of the access does not give: what Yume
 * calculates, and that the value is a calculation and not a balance. Refer to
 * paragraph 5.5.1 of `docs/architecture.md`.
 *
 * The page does not say that a transfer of points is permanent. Yume moves no
 * point, and this page shows the balance of no person. The dashboard gives
 * that warning, because a person reads a real value there and then decides.
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
				<Point index={3} title={text.homeValueTitle} body={text.homeValue} />
				<Point index={4} title={text.homeScopeTitle} body={text.homeScope} />
			</dl>

			<Rise index={5} className="flex w-full flex-col items-center gap-2">
				<p className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.homeScreenshotTitle}
				</p>
				<PhoneFrame />
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

/**
 * The picture of the dashboard, in the frame of a telephone.
 *
 * The frame is code, not a part of the file of the picture. Thus the frame
 * stays sharp on each screen, it holds the colours of the theme, and a new
 * picture needs no program of design.
 *
 * The band of the top holds the camera, and the band of the base holds the bar
 * of the system. A telephone gives that space to the system, thus the
 * application writes nothing there. The picture holds the content only, and
 * the two bands keep the picture and the system apart.
 *
 * The frame is a decoration: it holds no text. The picture gives the
 * description to a screen reader.
 */
function PhoneFrame() {
	return (
		<div className="w-full max-w-[280px] rounded-[2rem] border border-board-control bg-board-panel p-2.5">
			<div className="overflow-hidden rounded-[1.6rem] bg-board-bg">
				<div className="flex h-11 items-center justify-center">
					<span className="h-6 w-[32%] rounded-full bg-board-line" />
				</div>
				{/* The size is the size of the file. Thus the page keeps the space of
				    the image before the load, and the button below does not move. */}
				<img
					src={SCREENSHOT.src}
					alt={text.homeScreenshotAlt}
					width={SCREENSHOT.width}
					height={SCREENSHOT.height}
					className="block h-auto w-full"
				/>
				<div className="flex h-6 items-center justify-center">
					<span className="h-1 w-[36%] rounded-full bg-board-line" />
				</div>
			</div>
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
