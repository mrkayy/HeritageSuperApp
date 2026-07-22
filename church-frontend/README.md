# HOF Church Ng — Frontend

React app mirroring the backend's module isolation, one feature folder
per ministry/ops area.

## Structure
```
src/
  App.tsx, routes.tsx     <- ONLY files allowed to import more than one feature
  shared/
    auth/                 <- AuthContext, apiClient (attaches SSO token to every call)
    components/           <- ProtectedRoute, shared UI
  features/
    auth/                 <- the one login screen (LoginPage)
    membership/            <- example ministry feature
    <your-feature>/         <- add freely
```

## The single sign-on model
- `features/auth/LoginPage.tsx` is the only login UI in the app.
- `shared/auth/AuthContext.tsx` holds the logged-in user; every feature
  reads it via `useAuth()`.
- `shared/auth/apiClient.ts` attaches the token to every request and
  redirects to `/login` on a 401 — handled once, not per feature.
- Wrap any protected page in `<ProtectedRoute>` (optionally
  `role="finance_admin"` etc.) — no feature writes its own auth check.

## Adding a new ministry/ops feature
1. `mkdir src/features/<name>`, add `api.ts` + a page component
2. In `routes.tsx`, lazy-import it and add a `<Route>` wrapped in `<ProtectedRoute>`

That's it — nothing inside any other feature folder changes.

## Enforcement
`.eslintrc.cjs` uses `eslint-plugin-boundaries` to fail the build if a
feature imports from another feature folder instead of `shared/`.

## Run locally
```
npm install
npm run dev
```
Assumes the backend is running on `:8080` (see `vite.config.ts` proxy).
