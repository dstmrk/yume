import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { SplitFlapWord } from "./components/board/SplitFlapWord.tsx";
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
 */
const SCREENSHOT = {
	src: "/screenshot-dashboard.png",
	width: 780,
	height: 1010,
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
 * The board of the example is the first surface, and the blocks arrive one
 * after the other. Thus the page has the rhythm of a board that turns its
 * flaps.
 *
 * The masthead and the board hold the centre. Each block of text holds the
 * left: a paragraph at the centre gives a different start to each line, and the
 * eye then finds no start. The page holds four blocks, because a search engine
 * and an assistant read this page and no other page of the site. Paragraph
 * 5.5.3 of `docs/architecture.md` gives the reason.
 *
 * The link of the access holds `buttonVariants` of `components/ui/button.tsx`.
 * A navigation needs an `a` element, and the `Link` of the router gives it.
 * Thus the link has the appearance of the standard button.
 */
export function HomePage() {
	return (
		<div className="flex flex-col items-center gap-8 text-center">
			<Rise index={0} className="flex flex-col items-center gap-3">
				<h1>
					<SplitFlapWord word={text.appName} size="lg" />
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

			<div className="flex w-full flex-col gap-7 text-left">
				<Block
					index={2}
					title={text.homeQuestionTitle}
					body={text.homeQuestion}
				/>
				<Block
					index={3}
					title={text.homeCurrencyTitle}
					body={text.homeCurrency}
				/>
				<Block
					index={4}
					title={text.homeCalculationTitle}
					body={text.homeCalculation}
				/>
				<Block index={5} title={text.homeScopeTitle} body={text.homeScope} />
			</div>

			<Rise index={6} className="flex w-full flex-col items-center gap-2">
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

			<Rise index={7} className="flex w-full flex-col items-center gap-2">
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
 * One block of text of the page: a title of the board and one paragraph.
 *
 * The elements are a `section` and an `h2`, not a list of definitions. A block
 * holds a paragraph and not one sentence, and the title is the question that a
 * person writes in a search engine. Paragraph 5.5.3 of `docs/architecture.md`
 * gives the reason.
 */
function Block({
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
			<section>
				<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{title}
				</h2>
				<p className="mt-2 text-board-text text-sm leading-relaxed">{body}</p>
			</section>
		</Rise>
	);
}
