# Firebase Environment Secrets Design

## Goal

Keep Firebase API keys out of git while preserving local build functionality.

## Approach

- Gitignore `src/environments/environment.prod.ts` so it is never committed
- Commit `src/environments/environment.prod.ts.example` with placeholder values to document the required shape

## Files Changed

| File | Action |
|------|--------|
| `.gitignore` | Add `src/environments/environment.prod.ts` |
| `src/environments/environment.prod.ts.example` | Create with placeholder values |

## Non-Goals

- No generate script (local-only deploys don't need one)
- No CI/CD integration
