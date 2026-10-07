# Clerk workspaces and Google Calendar

## Database and sign-in

Configure the variables in `.env.example`, then run:

```sh
npm run db:generate
npm run db:migrate
```

Use Clerk keys from the same instance. Development and production Clerk instances have separate users, social connections, and webhook endpoints. Sign-in and sign-up use catch-all routes so verification and OAuth steps resolve correctly; successful authentication opens `/dashboard`.

The authenticated layout provisions a PostgreSQL `User` from Clerk's verified primary email before rendering the workspace. Login and webhook delivery share an idempotent resolver that prevents duplicate users and ignores older profile updates. Each user starts with an empty workspace. APIs resolve the authenticated identity on the server and scope brands, content, schedules, usage, and calendar connections to that user.

## Clerk lifecycle webhook

In Clerk Dashboard, add a webhook endpoint at `https://YOUR_APP_HOST/api/webhooks/clerk` and subscribe to `user.created`, `user.updated`, and `user.deleted`. Copy its signing secret into the server environment as `CLERK_WEBHOOK_SIGNING_SECRET`, then restart/redeploy the app. For local testing, use a public tunnel to the local server and register its HTTPS URL.

Signatures are verified before accessing the database. Creation and profile updates are idempotent; deletion deactivates the database account and pauses Google sync while preserving its content. Database failures return a retryable response. Login provisioning works before the webhook is configured, but account deletion and updates outside the app require this webhook.

See [Clerk's database synchronization guide](https://clerk.com/docs/guides/development/webhooks/syncing).

## Google Calendar consent

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
