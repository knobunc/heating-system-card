# Heating System Card

Custom Home Assistant Lovelace card displaying a hydronic heating system as a reactive SVG diagram. Single JavaScript file, no build step, no framework.

## Key files

- `heating-system-card.js` — the card (HTMLElement + shadow DOM, inline SVG)
- `test.html` — browser test harness that stubs the HA API
- `Makefile` — dev commands (node install, syntax check, dev server)

## Development commands

```
make test       # Syntax-check heating-system-card.js (installs node locally if needed)
make serve      # Start dev server at http://localhost:8080/test.html
make stop       # Stop dev server
make clean      # Remove local node install
```

Always run `make test` before committing.

## Workflow

- Do not push directly to main.
- Create a feature branch, commit there, and open a PR via `gh pr create`.
- PRs should have a short title and a summary with bullet points.
- After merge, delete the feature branch.

## Releases

Create releases with `gh release create` using a semver tag (e.g. `v1.2.0`). Attach `heating-system-card.js` as a release asset for HACS:

```
gh release create v1.2.0 heating-system-card.js --generate-notes
```

## Code style

- Plain JS, no TypeScript, no build step, no framework.
- Single color constant `HEAT = '#f5a623'` — all other colors come from CSS custom properties (`--hsc-*` variables inheriting from HA theme).
- Dynamic SVG updates use `element.style.fill` / `element.style.stroke`, not `setAttribute`, to avoid CSS specificity issues.
- No comments unless explaining a non-obvious "why".
- No abstractions beyond what the task requires.

## Testing

- `make test` runs `node -c` syntax checking.
- Visual testing: open `test.html` in a browser. The harness stubs the HA API including `callWS` for history. Use the control panel to toggle states and verify the SVG reacts correctly.
- The editor (`HeatingSystemCardEditor`) uses a `_rendered` flag to avoid rebuilding DOM on every `set hass()` call — only entity picker `.hass` is updated after the initial render.
