import { auth } from "@/auth";
import LoginPage from "./LoginPage";

export default async function Login() {
    const session = await auth();
    return <LoginPage session={session} />;
}
