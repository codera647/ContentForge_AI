# Clerk workspaces and Google Calendar

## Database and sign-in

Configure the variables in `.env.example`, then run:

```sh
npm run db:generate
npm run db:migrate
```

Use Clerk keys from the same instance. Development and production Clerk instances have separate users, social connections, and webhook endpoints. Sign-in and sign-up use catch-all routes so verification and OAuth steps resolve correctly; successful authentication opens `/dashboard`.

The authenticated layout provisions a PostgreSQL `User` from Clerk's verified primary email before rendering the workspace. Login and webhook delivery share an idempotent resolver that prevents duplicate users and ignores older profile updates. Each user starts with an empty workspace. APIs resolve the authenticated identity on the server and scope brands, content, schedules, usage, and calendar connections to that user.

The layout and APIs share a request-scoped resolver. Existing active workspaces load directly from PostgreSQL without an extra Clerk profile request; first-time users still require a matching server-fetched Clerk profile with a verified primary email. Profile updates are synchronized by the lifecycle webhook.

### Workspace unavailable after sign-in

The workspace error screen is reached after session verification. Its support code identifies the failed operation without exposing credentials. The same code appears in runtime logs next to `[workspace] Provisioning failed`:

| Support code | Check |
| --- | --- |
| `workspace_database_read_P1000` | PostgreSQL credentials in Vercel's Production `DATABASE_URL`. |
| `workspace_database_read_P1001` | PostgreSQL connectivity, hostname, and active Neon project. |
| `workspace_database_read_P2021` / `P2022` | Apply migrations to the database used by the deployment. |
| `workspace_clerk_profile_http_401` / `http_403` | Deployed Clerk secret key and any `CLERK_API_URL` override. Public-key session verification does not replace the secret key used for profiles. |
| `workspace_clerk_profile_http_404` | The authenticated user must belong to the Clerk instance used by the deployed backend. |
| `workspace_clerk_profile_ENOTFOUND` / `UND_ERR_CONNECT_TIMEOUT` | DNS or outbound connectivity from the deployed runtime to Clerk. |
| `workspace_database_write_*` | The error code from account provisioning; identity conflicts remain explicit public errors. |

A successful local database/profile check does not establish that Vercel uses the same configuration. `DATABASE_URL` must be set for the deployment environment, and migrations must target that database. No workspace is created from browser-supplied profile data.

### Blank sign-in screen after signup

Clerk's sign-in component does not render for an already authenticated user in single-session mode. If the browser is signed in but the server rejects its session, dashboard protection redirects to sign-in and can leave only the page heading visible. The auth pages now redirect server-authenticated users directly to the dashboard. For browser-only authentication they verify the dashboard API, refresh the session token once on 401, and show an actionable retry message if verification still fails.

Use these values in both local and Vercel environments, then restart/redeploy:

```text
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

These are application paths, not `http://localhost:3000`. Configure the matching sign-in/sign-up paths and `/dashboard` home path in Clerk Dashboard. Both Clerk keys must belong to the same instance; replacing the publishable key requires a rebuild because Next.js embeds public variables in browser assets. For a persistent server/client mismatch, inspect Clerk's `x-clerk-auth-reason` and Vercel runtime logs to distinguish an expired/invalid token, missing session cookie, or incorrect deployed configuration. The proxy logs `[auth] Protected page rejected` with just the application section and reason code; the auth panel also logs the reason as plain text and displays it as a support code after a rejected session. Neither logs tokens or credentials. A development-key warning alone does not identify the rejection reason. A cookie-free terminal request returning `dev-browser-missing` also does not diagnose a signed-in browser; collect the code from the failing browser request.

### Server rejection with `unexpected-error`

In the installed Clerk SDK, `unexpected-error` means a session-verification exception did not match one of its named token errors. A failed network request while obtaining signing keys can produce this result. The code alone does not prove the underlying exception; do not infer a missing cookie or a mismatched key pair from it.

This app supports Clerk's networkless verification through `CLERK_JWT_KEY`:

1. In the same Clerk instance as the publishable and secret keys, open **API Keys → Show JWT public key → PEM Public Key**.
2. Add the full PEM, including `BEGIN PUBLIC KEY` and `END PUBLIC KEY`, as **CLERK_JWT_KEY** in Vercel's environment variables for the deployment environment being tested. Actual multiline values and escaped `\n` values are both supported. Do not put the secret key in this variable.
3. Deploy the updated code and retry opening `/dashboard`.

The proxy passes this public key to Clerk's middleware, which still verifies the token's signature, expiry, and claims. With the variable omitted, the SDK keeps its usual remote signing-key lookup. If Clerk rotates the instance's signing key, update this value; automatic remote rotation is not available when pinning a PEM key. The secret key is still required for profile provisioning, webhooks, and Google OAuth token retrieval.

For this local workspace, `.clerk/session-jwt-public-key.pem` contains a public signing key fetched from Clerk's authenticated Backend API and matched against the publishable key's Frontend API JWKS. The file and local `.env` are ignored by Git; Vercel will need the environment variable separately. This local check does not prove Vercel's network connectivity. If `unexpected-error` continues after configuring the public key and redeploying, inspect the failing deployment's server logs rather than weakening authentication.

See [Clerk middleware options](https://clerk.com/docs/reference/nextjs/clerk-middleware) and [Clerk token verification](https://clerk.com/docs/reference/backend/verify-token).

## Clerk lifecycle webhook

In Clerk Dashboard, add a webhook endpoint at `https://YOUR_APP_HOST/api/webhooks/clerk` and subscribe to `user.created`, `user.updated`, and `user.deleted`. Copy its signing secret into the server environment as `CLERK_WEBHOOK_SIGNING_SECRET`, then restart/redeploy the app. For local testing, use a public tunnel to the local server and register its HTTPS URL.

Signatures are verified before accessing the database. Creation and profile updates are idempotent; deletion deactivates the database account and pauses Google sync while preserving its content. Database failures return a retryable response. Login provisioning works before the webhook is configured, but account deletion and updates outside the app require this webhook.

See [Clerk's database synchronization guide](https://clerk.com/docs/guides/development/webhooks/syncing).

## Google Calendar consent

Basic Google sign-in in a Clerk development instance can use Clerk's shared credentials without your own Google Cloud project. Calendar synchronization needs your own Google OAuth application and Calendar API configuration. This setup is independent of dashboard access.

1. Create a Google Cloud project and enable **Google Calendar API** under APIs & Services.
2. Configure the Google Auth Platform consent screen/audience. During testing, add your Google account as a test user and configure the `https://www.googleapis.com/auth/calendar.events` permission.
3. Create an OAuth client ID with application type **Web application**.
4. In Clerk Dashboard's Google social connection, turn on **Use custom credentials**. Copy its authorized redirect URI into the OAuth client's authorized redirect URIs in Google Cloud, then enter the client ID and client secret in Clerk. Use Clerk's URI rather than inventing an application callback URL.
5. Save the connection and choose **Connect Google Calendar** in this app. Approve the calendar permission for the user.

See [Clerk's Google connection instructions](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google) and [Google's OAuth credentials guide](https://developers.google.com/workspace/guides/create-credentials). Production Clerk Google sign-in also requires custom credentials.

Google sign-in must use your custom Google OAuth credentials in Clerk, with Google Calendar API enabled in that Google Cloud project. Configure the OAuth consent screen and permitted test users as required by your Google project's publishing status. This app requests `https://www.googleapis.com/auth/calendar.events` when the user chooses **Connect Google Calendar** in Calendar or Settings. Existing Google users reauthorize; other users link a Google account through Clerk. Google sign-in alone does not grant calendar access.

OAuth credentials and refresh/access tokens remain in Clerk. The app retrieves the user's current access token server-side and stores only the external account ID, calendar preference, and event references. No separate Google client secret is required in the application environment.

## Scheduling and sync behavior

Save or generate content, then schedule it from the library, editor, or monthly calendar. Dates and times are interpreted in the browser's local timezone and stored as UTC instants. The dashboard and library reflect the saved schedules; cancelling the last pending schedule returns scheduled content to Draft.

When connected, creating, rescheduling, editing, or cancelling scheduled content updates the user's primary Google calendar. Each schedule creates one 15-minute transparent event containing the title and saved content. Deterministic event IDs and per-schedule database locks make retries idempotent and serialize concurrent external writes. Existing scheduled content is picked up when connecting. Sync runs in batches of five; choose **Sync pending** until the pending count reaches zero.

Google outages do not undo a saved local schedule. Failed changes retain their event identity and an error for retry. Reconnect if permission is revoked, then use **Sync pending**. Pausing sync leaves existing Google events intact; reconnecting applies pending edits and cancellations. Deleting content first removes its tracked Google events; if cleanup fails, content stays archived so the deletion can be retried after reconnecting.

Synchronization runs from ContentForge to Google Calendar. Google-side edits and unrelated Google events are not imported. Scheduling does not publish content to social networks, and there is no background publishing worker.

## Verification

```sh
npm test
npm run lint
npm run build
```

An optional integration suite provisions two temporary database identities and tests concurrent provisioning, isolation, scheduling, and Google event references/locks with real PostgreSQL. Google OAuth/API responses are simulated, and the suite removes its own records afterward:

```powershell
$env:RUN_DB_INTEGRATION = '1'
npm.cmd test -- tests/pipeline.integration.test.ts
Remove-Item Env:RUN_DB_INTEGRATION
```

Finally, sign up with a new Clerk user, create a brand and content, connect Google Calendar, and verify creation, time edits, content edits, and cancellation in both calendars. This final check requires interactive Google consent for that user.
