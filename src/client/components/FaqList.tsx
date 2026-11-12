import type { FaqItem } from "../lib/jsonLd.ts";
import { SectionTitle } from "./board/SectionTitle.tsx";

/**
 * The questions of a page. Each answer opens with the fact: an assistant cites
 * the paragraph that answers, not the paragraph that introduces. The structured
 * data of the page gives the same items.
 */
export function FaqList({
	title,
	items,
}: {
	title: string;
	items: readonly FaqItem[];
}) {
	return (
		<section>
			<SectionTitle>{title}</SectionTitle>
			<dl className="mt-4 flex flex-col gap-5">
				{items.map((item) => (
					<div key={item.question}>
						<dt className="font-medium text-board-text text-sm">
							{item.question}
						</dt>
						<dd className="mt-1 text-board-muted text-sm leading-relaxed">
							{item.answer}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
