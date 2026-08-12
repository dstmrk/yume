import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * It joins the classes of Tailwind CSS and keeps the last class of a property.
 *
 * A component of `components/ui/` writes its default classes. The point of use
 * writes the classes of the theme. Without this function the two sets stay
 * together, and the result depends on the order of the classes in the CSS file.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
