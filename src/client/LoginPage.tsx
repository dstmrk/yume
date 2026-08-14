import { useNavigate, useRouter } from "@tanstack/react-router";
import { AccessForm } from "./components/AccessForm.tsx";
import { AppTitle } from "./components/board/AppTitle.tsx";

/**
 * The page of the access. It holds the sign-in and the sign-up.
 *
 * After the access the router examines the session again, thus the route
 * `/dashboard` finds the new session and shows the dashboard.
 */
export function LoginPage() {
	const navigate = useNavigate();
	const router = useRouter();

	return (
		<>
			<AppTitle />
			<AccessForm
				onAccess={async () => {
					await router.invalidate();
					await navigate({ to: "/dashboard" });
				}}
			/>
		</>
	);
}
