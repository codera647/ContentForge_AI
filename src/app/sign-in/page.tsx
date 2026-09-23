import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in · ContentForge AI" };

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-10">
      <div className="text-center">
        <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="mt-1 text-[14px] text-ink2">Sign in to your ContentForge workspace.</p>
      </div>
      <SignIn
        signUpUrl="/sign-up"
        appearance={{
          variables: {
            colorPrimary: "#C75B39",
            colorBackground: "#FBFAF7",
            colorForeground: "#20201E",
            colorMutedForeground: "#686761",
            borderRadius: "8px",
            fontFamily: "var(--font-dm-sans), sans-serif",
          },
          elements: {
            card: "border border-line shadow-none",
          },
        }}
      />
    </div>
  );
}
