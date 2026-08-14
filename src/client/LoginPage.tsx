import { useNavigate, useRouter } from "@tanstack/react-router";
import { AccessForm } from "./components/AccessForm.tsx";
import { AppTitle } from "./components/board/AppTitle.tsx";

/**
 * The page of the access. It holds the sign-in and the sign-up.
 *
 * After the access the router examines the session again, thus the route
 * `/dashboard` finds the new session and shows the dashboard.
 *
 * The route `/signup` gives the code of the link. Then the page opens the form
 * of the sign-up.
 */
export function LoginPage({ code }: { code?: string }) {
	const navigate = useNavigate();
	const router = useRouter();

	return (
		<>
			<AppTitle />
			<AccessForm
				code={code}
				onAccess={async () => {
					await router.invalidate();
					await navigate({ to: "/dashboard" });
				}}
			/>
		</>
	);
}
