---
name: package-security-check
description: Check whether a package is secure before installing or adding it as a dependency. Use this skill EVERY time you are about to install a package or add a dependency — e.g. npm install, npm i, yarn add, pnpm add, pip install, adding entries to package.json or requirements.txt — or whenever the user asks whether a package is safe, secure, trustworthy, vulnerable, or asks for a security check/score of a package. Trigger even if the user doesn't mention security, because installing any third-party package should be preceded by this check.
---

# Package Security Check

Before installing any third-party package, verify it has no known vulnerabilities and a reasonable security health score. If it's clean, proceed with the installation. If not, STOP and show the user a warning, then let them decide.

## Workflow

1. **Run the check** before executing any install command:

   ```bash
   python3 scripts/check_package.py <package-name> [version] [--ecosystem npm]
   ```

   - If the user specified a version (e.g. `lodash@4.17.20`), pass it. Otherwise the script checks the latest version.
   - Ecosystem defaults to `npm`. Also supports `PyPI`, `Go`, `Maven`, `NuGet`, `RubyGems`, `crates.io`.
   - When installing multiple packages, check each one.

2. **Act on the exit code:**

   - **Exit 0 (SECURE)** — proceed with the installation without asking. Briefly mention the check passed, e.g. "✓ express@4.19.2 — no known vulnerabilities, Scorecard 7.6/10. Installing…"
   - **Exit 1 (WARNING)** — do NOT install yet. Show the user a clear warning and ask whether to proceed, pick a different version, or choose an alternative package. See the warning format below.
   - **Exit 2 (ERROR)** — the check itself failed (network, package not found). Tell the user the check could not be completed and ask whether to proceed unverified. Never silently install after a failed check.

3. **If the user explicitly says to skip the check or install anyway**, respect that — this skill informs, it doesn't block.

## What the script checks

- **Known vulnerabilities** via OSV.dev — authoritative CVE/GHSA data for the exact version. Any hit triggers a warning.
- **OpenSSF Scorecard** via deps.dev — a 0–10 health heuristic (code review, maintenance, branch protection, etc.). Scores below 4.0 trigger a warning. This is a signal, not proof of insecurity — say so when warning about score alone.
- A missing Scorecard (no public GitHub repo, or repo not scanned) is common and NOT by itself a reason to warn.

## Warning format

When the verdict is WARNING, present it like this before asking how to proceed:

```
⚠️ Security warning: <package>@<version>

Known vulnerabilities:
- GHSA-xxxx [HIGH] Prototype pollution in ...
  (fixed in <version>, if the script output mentions one)

OpenSSF Scorecard: 2.9/10 (low — weak maintenance/review signals)

Options:
1. Install a patched version (recommended if one exists)
2. Pick an alternative package
3. Install anyway
```

When a vulnerability is fixed in a newer version, recommend installing that version as the default suggestion.

## Notes & edge cases

- Scoped npm packages work as-is (`@nestjs/core`) — the script handles URL-encoding.
- For version *ranges* in package.json, check the version that would actually resolve (run `npm view <pkg> version` to find it if unsure).
- This check covers known vulnerabilities and project health. It does NOT detect zero-day malware or typosquatting — if a package name looks like a misspelling of a popular package (e.g. `expresss`, `lodahs`), flag that to the user separately.
- The APIs used (api.osv.dev, api.deps.dev) are free and require no authentication. If the environment blocks these domains, report exit code 2 behavior.