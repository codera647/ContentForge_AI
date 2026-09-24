export const SIGN_IN_URL = "/sign-in";
export const SIGN_UP_URL = "/sign-up";
export const AUTHENTICATED_HOME = "/dashboard";

export const PROTECTED_APP_PATHS = [
  "/dashboard",
  "/create",
  "/brands",
  "/library",
  "/calendar",
  "/settings",
] as const;

export function isProtectedAppPath(pathname: string) {
  return PROTECTED_APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
