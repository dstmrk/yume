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
 * picture. The cards hold the calculation of the real catalogue. A frame of a
 * telephone holds that picture, because the dashboard is a surface of a
 * telephone.
 *
 * The picture starts at the masthead, thus it holds also the warning of the
 * transfer. The page itself gives no such warning: the warning in the picture
 * is a part of the dashboard, and this page shows the balance of no person.
 *
 * The background of the file is transparent. Therefore the picture holds no
 * border and no radius: a rectangle of a border cuts the round corners of the
 * frame.
 */
const SCREENSHOT = {
	src: "/screenshot-dashboard.png",
	width: 768,
	height: 1590,
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
 * **The order of the page is the product, then the detail.** The masthead
 * gives the name and the access. Then the title says what Yume calculates, the
 * board of the example shows that value, and three blocks give the three rules
 * of the calculation. The detail of the catalogue — the six programmes of
 * Avios, the quantity of the programmes, the source of each ratio — is in the
 * questions at the end. A visitor reads what Yume does before it reads which
 * airlines use one currency. Paragraph 5.5.3 of `docs/architecture.md` gives
 * the reason.
 *
 * The `h1` is the question of the person, not the name of the application. The
 * name is on the flaps of the masthead: a search engine and an assistant read
 * the `h1` as the subject of the page, and the name alone gives no subject.
 *
 * The access is in the masthead and at the end. A visitor who arrives with the
 * decision already made finds the link with no movement of the page.
 *
 * Each block of text holds the left: a paragraph at the centre gives a
 * different start to each line, and the eye then finds no start. The masthead,
 * the title and the board hold the centre.
 *
 * The link of the access holds `buttonVariants` of `components/ui/button.tsx`.
 * Thus the link has the appearance of the standard button.
 *
 * This page holds no element of the router. The build writes the page with
 * `renderToStaticMarkup`, and each element of the router needs the context of
 * the router.
 */
export function HomePage() {
	return (
		<div className="flex flex-col gap-10">
			{/* The masthead. The name is at the left and the access is at the right,
			    as the two ends of a board. The element is an `a` and not a `Link` of
			    the router: refer to the note of the link at the end of the page. */}
			<Rise
				index={0}
				className="flex items-center justify-between gap-4 border-board-line border-b pb-4"
			>
				<span className="flex items-center">
					<SplitFlapWord word={text.appName} size="md" />
				</span>
				<a
					href="/login"
					className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
				>
					{text.signIn}
				</a>
			</Rise>

			<Rise index={1} className="flex flex-col items-center gap-4 text-center">
				<h1 className="font-board text-[22px] text-board-text uppercase leading-tight tracking-widest md:text-[33px]">
					{text.homeTitle}
				</h1>
				<p className="max-w-prose text-board-text text-sm leading-relaxed">
					{text.homeLead}
				</p>
			</Rise>

			<Rise index={2} className="flex flex-col items-center gap-2">
				<p className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.potentialTitle}
				</p>
				<SplitFlapNumber value={EXAMPLE_POINTS} />
				<p className="text-board-muted text-xs">{text.homeExample}</p>
			</Rise>

			{/* One column on a telephone, three columns above 768 pixels. The
			    breakpoint changes the container and no block: the elements are the
			    same on the two screens. Paragraph 5.4 of `docs/architecture.md`
			    gives the rule.

			    Each block holds two rows of the grid of the section, with
			    `grid-rows-subgrid`. Thus a title of two lines moves no paragraph:
			    the three paragraphs start at the same line, as the rows of a
			    board. */}
			<section className="flex flex-col gap-7 text-left md:grid md:grid-cols-3 md:grid-rows-[auto_auto] md:gap-x-8">
				<h2 className="sr-only">{text.homeWhatTitle}</h2>
				{text.homeWhat.map((block, index) => (
					<Rise
						key={block.title}
						index={3 + index}
						className="md:row-span-2 md:grid md:grid-rows-subgrid md:gap-2"
					>
						<h3 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
							{block.title}
						</h3>
						<p className="mt-2 text-board-text text-sm leading-relaxed md:mt-0">
							{block.body}
						</p>
					</Rise>
				))}
			</section>

			<Rise index={6} className="flex w-full flex-col items-center gap-2">
				<p className="font-board text-[11px] text-board-muted uppercase tracking-widest">
					{text.homeScreenshotTitle}
				</p>
				{/* The size is the size of the file. Thus the page keeps the space of
				    the image before the load, and the text below does not move.

				    The frame of the telephone is more than two times taller than it
				    is wide. Thus the width has a maximum on each screen: with the
				    full width of the column, the picture alone fills the screen of a
				    telephone. */}
				<img
					src={SCREENSHOT.src}
					alt={text.homeScreenshotAlt}
					width={SCREENSHOT.width}
					height={SCREENSHOT.height}
					className="h-auto w-full max-w-[280px]"
				/>
			</Rise>

			{/* The function that the application does not hold today. The mark and
			    the verb of the future both say it: a person who reads this block
			    must not look for that function in the dashboard. Paragraph 5.5.4 of
			    `docs/architecture.md` gives the rule. */}
			<Rise index={7}>
				<section className="rounded-lg border border-board-line border-dashed p-4">
					<div className="flex items-center gap-3">
						<span className="rounded-sm border border-board-amber px-2 py-0.5 font-board text-[11px] text-board-amber uppercase tracking-widest">
							{text.homeSoonBadge}
						</span>
						<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
							{text.homeSoonTitle}
						</h2>
					</div>
					<p className="mt-3 text-board-text text-sm leading-relaxed">
						{text.homeSoon}
					</p>
				</section>
			</Rise>

			{/* The detail of the catalogue. Each answer opens with the fact: an
			    assistant cites the paragraph that answers, not the paragraph that
			    introduces. The elements are a list of definitions, because each
			    item is one question and one answer. */}
			<Rise index={8}>
				<section>
					<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
						{text.homeFaqTitle}
					</h2>
					<dl className="mt-4 flex flex-col gap-5">
						{text.homeFaq.map((item) => (
							<div key={item.question}>
								<dt className="text-board-text text-sm font-medium">
									{item.question}
								</dt>
								<dd className="mt-1 text-board-muted text-sm leading-relaxed">
									{item.answer}
								</dd>
							</div>
						))}
					</dl>
				</section>
			</Rise>

			<Rise index={9} className="flex w-full flex-col items-center gap-2">
				{/* The element is an `a` and not a `Link` of the router. The build
				    writes this page with `renderToStaticMarkup`, and a `Link` needs
				    the context of the router: the page then holds no router and no
				    session. A visitor with no session reads this page one time and
				    then goes to the form, thus a load of the full page costs
				    nothing. Paragraph 5.5.3 of `docs/architecture.md` gives the
				    reason. */}
				<a href="/login" className={cn(buttonVariants(), "w-full md:max-w-xs")}>
					{text.signIn}
				</a>
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
