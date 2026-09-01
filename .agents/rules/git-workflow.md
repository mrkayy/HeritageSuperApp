# Git Branching and Pull Request Workflow Rule

## Strict Branch Promotion Hierarchy

All Pull Requests and branch merges MUST follow this exact hierarchical flow:

```
[Feature / Fix Branch] ──(PR)──> [dev] ──(PR)──> [staging] ──(PR)──> [main]
```

### Mandatory Rules:

1. **NEVER create a Pull Request directly into `main` from a feature/bugfix branch or from `dev`**.
2. **Feature & Bugfix branches**: Always create Pull Requests targeting the `dev` branch.
3. **Promotion to Staging**: Once changes are verified on `dev`, raise a Pull Request from `dev` into `staging`.
4. **Promotion to Production (`main`)**: **ONLY the `staging` branch is permitted to raise a Pull Request into `main`**.
