import { AppTitle } from "./components/board/AppTitle.tsx";
import { GoogleSignIn } from "./components/GoogleSignIn.tsx";

/**
 * The page of the access: the sign-in with Google. The first sign-in also
 * makes the account, thus the page holds no form of the sign-up.
 *
 * After the page of Google, Better Auth opens the dashboard, or this page with
 * the parameter `error`. The route reads that parameter and gives it here.
 */
export function LoginPage({ error }: { error?: string }) {
	return (
		<>
			<AppTitle />
			<GoogleSignIn error={error} />
		</>
	);
}
