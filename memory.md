# jdadzok_server (Synqulan Server)

## Project concept
NestJS + Prisma backend for the jdadzok / Synqulan social media application.

## Current state
- Branch `main` is diverged from `origin/main` (ahead 1, behind 5) with unresolved merge conflicts in `.gitignore`. Pull has not been done.
- Staged leftovers: `src/main/(explore)/ngo/ngoVerification/dto/public/fonts/*` (Font Awesome files staged under a wrong path, deleted on disk). Not malware, but should be unstaged.

## Security incident (2026-10-10)
Fake "auth" loader malware was found staged (not committed): `eval()` of a remote script from a base64 `AUTH_API_KEY` env var in `src/main.ts`, `node api.js &&` prefixed to npm `start`/`build`/`dev`, obfuscated `api.js` and `public/fonts/fa-solid-700.fml`, a `.vscode/tasks.json` task running the payload on `folderOpen`, and a staged `.env`.
- Removed: restored `package.json` and `src/main.ts` to HEAD, unstaged the payload files. Copies are in `~/quarantine/jdadzok_server-20261010/` (outside the repo).
- If `npm start/build/dev` or the VS Code folder-open task ran on this machine, treat secrets and tokens reachable from it as compromised and rotate them.

## Conventions and gotchas
- Never run `node api.js` or any `*.fml` file. `AUTH_API_KEY` is not a real env var of this project.
- `npm run security:check` runs `scripts/check-supply-chain-malware.sh`.

## Last updated
2026-10-10: malware scan and cleanup.
