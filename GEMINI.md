# Repository Rules and Workflow Guidelines

## Mandatory Git Branching & PR Workflow

Never create Pull Requests directly into `main`. The repository follows a strict multi-tier promotion pipeline:

1. **Feature / Fix Branches** (`feat/*`, `fix/*`):
   - Must ALWAYS raise Pull Requests targeting `dev`.
2. **Dev to Staging**:
   - Changes verified on `dev` are promoted to `staging` via a Pull Request (`dev` -> `staging`).
3. **Staging to Main (Production)**:
   - **ONLY the `staging` branch is authorized to raise a Pull Request into `main`** (`staging` -> `main`).
   - Direct PRs from feature branches, bugfix branches, or `dev` into `main` are strictly forbidden.
