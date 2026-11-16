import { useMutation, useQueryClient } from "@tanstack/react-query";
import { COUNTRIES, type Country } from "../../shared/catalogue.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { setCountry } from "../lib/api.ts";
import { countryOptions } from "../lib/country.ts";
import { Button } from "./ui/button.tsx";

/**
 * The choice of the country, after the first sign-in.
 *
 * The transfer rules depend on the country, thus the dashboard shows no other
 * surface before this choice. The country does not change. Paragraph 3.3.2 of
 * `docs/architecture.md` gives the rules.
 */
export function CountryStep() {
	const { t: text, intl } = useI18n();
	const queryClient = useQueryClient();
	const save = useMutation({
		mutationFn: (country: Country) => setCountry(country),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
	});

	return (
		<section className="flex flex-col gap-4">
			<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{text.countryTitle}
			</h2>
			<p className="text-board-muted text-sm">{text.countryBody}</p>
			<div className="flex flex-col gap-2">
				{countryOptions(COUNTRIES, intl).map((option) => (
					<Button
						key={option.country}
						type="button"
						variant="outline"
						disabled={save.isPending}
						onClick={() => save.mutate(option.country)}
					>
						{option.name}
					</Button>
				))}
			</div>
			{save.isError && (
				<p className="text-destructive text-sm">{text.countryError}</p>
			)}
		</section>
	);
}
