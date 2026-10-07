import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AuthenticationPanel from "@/components/AuthenticationPanel";
import { AUTHENTICATED_HOME } from "@/lib/auth-navigation";

export const metadata = { title: "Sign in ? ContentForge AI" };

export default async function AuthenticationPage() {
  const { userId } = await auth();
  if (userId) redirect(AUTHENTICATED_HOME);
  return <AuthenticationPanel mode="sign-in" />;
}
