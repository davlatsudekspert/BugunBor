# API contracts for the mobile app

Each file is a real response from the app-facing API (`data` part), produced
by `app/api/v1/app-api.test.ts` from test data. The server test fails when a
response's keys or value types change; the app's tests parse the same files.

- Times are UTC in `YYYY-MM-DD HH:MM:SS` form (no zone mark), except
  `expiresAt` in login responses, which is ISO 8601.
- Money is whole so‘m (integers). Coordinates are degrees.
- Image fields (`photo`, `logo`, `cover`) are site-relative paths such as
  `/media/…` or `/photos/…`; the app prefixes the site address.
- Demo (sample) items have `isDemo: true` and are never claimable.

To change a contract on purpose: update the server, run
`UPDATE_CONTRACTS=1 npx vitest run app/api/v1/app-api.test.ts`, then update
the app's models and tests in the same commit.
