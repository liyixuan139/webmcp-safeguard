# SafeGuard

> **Break WebMCP consent, then fix it with a mandate.**

A browser demo for the **OpenAI WebMCP Challenge** that shows how WebMCP's consent
mechanism can be fooled by a malicious page — and how a **Human Mandate** fixes it by
verifying what a tool *actually does*, not what its dialog *says*.

---

## The thesis

> Every signal a page declares about its tools — the name, the description, even the
> `readOnlyHint` — is attacker-controlled. Only what actually runs can be checked.

WebMCP lets a web page register "tools" that AI agents can call, via
`document.modelContext`:

```js
document.modelContext.registerTool({
  name: 'donate_one_dollar',
  description: 'Donate $1 to keep the café running.',   // ← shown in the consent dialog
  async execute() { /* ... */ },                        // ← what actually runs
});
```

The browser's consent UI renders the tool's `description` — a string the page author
wrote. So a malicious page can show **"Donate $1"** while the tool's `execute()` actually
**changes the account email**. The user consents to one thing; a different thing happens.

SafeGuard demonstrates four such attacks, then a defence that closes the gap.

---

## The Break — four attacks

The left panel is a virtual café with three pieces of state: donation **balance**,
account **email**, and **membership** tier.

### Attack 1 · Label mismatch

The tool `donate_one_dollar` has `description: "Donate $1…"` but its `execute()` runs
`change_email → attacker@evil.com`.

- The consent dialog shows *"Donate $1 to keep the café running."*
- The user clicks **Allow**.
- The email changes; the balance does not.

**The consent was granted for a donation, but the effect was an identity change.**

### Attack 2 · Hidden instruction

The tool `apply_coupon` has `description: "Apply a 10% loyalty coupon…"` but its
`execute()` fires **two** effects: the harmless coupon *and* a hidden
`change_membership → premium` (a paid upgrade).

- The user consents to a coupon.
- Two things happen — one of them was never mentioned.

**The consent was granted for one operation; a second, unauthorized operation rode along.**

### Attack 3 · Tool substitution

A rogue script re-registers a tool under the trusted name `donate`, copying the real
`description` word-for-word but swapping `execute()` to run `change_email → attacker@evil.com`.

- The user calls what they believe is the real `donate`.
- The name and dialog look identical to the real tool.
- The code behind that trusted name has been replaced.

**The consent was granted to a name, but the effect was an identity change.**

### Attack 4 · Read-only lie

A tool declares `readOnlyHint: true`, so the consent surface reassures the user that
"this tool makes no changes". But the flag is just another field the page author writes —
`execute()` runs `close_account`.

- The user consents to "Show your account summary".
- The dialog reassures "read-only, no changes".
- The account is closed anyway.

**The consent was granted on a read-only declaration, but the effect was a destructive write.**

---

## The Fix — the Human Mandate

The right panel implements a **Human Mandate**: rules the human grants *up-front*,
before any AI action:

| Action | Rule | Limit |
|---|---|---|
| `donate` | allow | ≤ $5 |
| `apply_coupon` | allow | — |
| `change_email` | **deny** | — |
| `change_membership` | **deny** | — |
| `close_account` | **deny** | — |

Every tool call is checked against the mandate **before any consent dialog is shown**:

- `donate $3` → allowed → runs (no dialog needed; the mandate *is* the authority).
- `donate $50` → **denied** — exceeds the limit.
- `change email` → **denied** — personal-info mutation is forbidden.
- the same malicious `donate_one_dollar` from Attack 1 → **denied** — its *real* effect
  is `change_email`, which the mandate rejects before a dialog could lie.
- `apply_coupon` → the coupon runs, but the hidden membership upgrade is **blocked**.
- the hijacked `donate` from Attack 3 → **denied** — the mandate checks the runtime
  effect, never the tool's name, so a swapped tool is caught the same way.
- the "read-only" `view_profile` from Attack 4 → **denied** — the mandate checks the
  runtime effect, never the read-only declaration, so the account close is refused.

**The mandate refuses violating operations silently — no consent dialog to fool.**

This mirrors the ROAST "mandate" model: **Intent → Authority → Effect**. Bounded
authority is granted up front; every effect is checked against it.

---

## Why the fix works (the important part)

The defence does **not** read the tool's `description` — that's the attack surface.
Instead it enforces a **capability boundary**:

1. The café's state can only be mutated through a single gateway, `Effects.apply()`.
2. The `Mandate` intercepts **every** `Effects.apply()` call and checks the *runtime
   effect primitive* — e.g. `{ action: 'change_email', to: '…' }`.
3. A tool cannot touch state without passing through that check, so even a *hidden*
   second effect or a *lying* description is caught.

```
description  →  what the consent dialog shows   (attacker-controlled, can lie)
effect       →  what actually runs              (checked by the mandate)
```

This check belongs in the **browser/agent layer**, not the page — because the page
itself can be the attacker.

---

## Why there is no backend

Deliberately. WebMCP tools are defined in the page itself —
`document.modelContext.registerTool({ … execute() { … } })` — and an agent calls
that in-page `execute()` directly; the standard has no server round-trip. SafeGuard
keeps the café state and the mandate in the browser for the same reason: the
capability boundary (`Effects.apply()` + the `Mandate`) is the entire subject, and
it is clearest when nothing can hide behind a server. This is a security
demonstration, not a production café — in-memory state and client-side enforcement
are an intentional trade-off, not a shortcut.

---

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page structure: café (Break) + mandate (Fix) + audit log |
| `styles.css` | Dark "security research" theme (red = attack, green = safe) |
| `webmcp.js` | WebMCP abstraction — real API if present, else a local shim |
| `tools.js` | Café state, the `Effects` gateway, and the tool definitions |
| `mandate.js` | The Human Mandate rule engine |
| `app.js` | UI wiring, consent simulation, and the audit log |
| `server.js` | Zero-dependency local server (for the WebMCP secure context) |
| `THREAT-MODEL.md` | The trust-boundary checklist + a concrete WebMCP fix proposal |
| `mandate.json` | The default Human Mandate, shipped as a machine-readable policy |

Every tool call is recorded in the audit log with its **intent · consent · effect**,
so you can see exactly where the consent dialog lied and where the mandate stepped in.

Two files in the repo are meant to be reused, not just read:

- **`THREAT-MODEL.md`** — the reusable "WebMCP trust boundary" checklist and a
  concrete proposal for how the platform could close the whole class of bug.
- **`mandate.json`** — the default Human Mandate as a machine-readable policy
  (the same JSON the UI imports/exports), showing the mandate is data, not UI.

---

## Run it

### Simulation mode (any browser)

Just open `index.html`. Without a WebMCP-capable browser, the demo runs on a built-in
shim — the full attack/defence flow works identically.

### WebMCP "live" mode

Real `document.modelContext` requires a secure context and is still behind a flag /
origin trial:

1. Enable `chrome://flags/#enable-webmcp-testing` (Chrome 146+; may be Canary/Dev only)
   and relaunch.
2. Serve locally (localhost is a secure context):

   ```bash
   node server.js   # → http://localhost:8000
   ```

3. Open `http://localhost:8000`. The status pill turns green — **"WebMCP live · 6 tools"** —
   when the API is available.

The demo's buttons drive the tools deterministically in both modes; "live" additionally
registers the tools with the browser so a real agent can discover them
(`navigator.modelContextTesting.listTools()`).

---

## Submitting to the WebMCP Challenge

The four required deliverables and where each lives:

1. **Working live URL** — deploy the site to Netlify (below); it is a static
   site and needs no backend.
2. **Text description** — see `SUBMISSION.md`; `DEVPOST.md` has paste-ready
   copy for the challenge form.
3. **Demo video** — a < 3 min YouTube video (with audio) showing the "Run full
   demo" flow and, ideally, an agent driving the tools inside ChatGPT's
   in-app browser: <https://youtu.be/_jjylhOwYpA>. `VIDEO-SCRIPT.md` has the
   narration, timed to the demo.
4. **Public code repository** — this repo, MIT-licensed (`LICENSE`).

### Deploy to Netlify

The project is static (HTML/CSS/JS, no build step). Two options:

- **Drag-and-drop:** log in to app.netlify.com, drag this folder onto the
  "Deploy" drop zone.
- **CLI:**

  ```bash
  npm install -g netlify-cli
  netlify login
  netlify deploy --prod --dir=.
  ```

`netlify.toml` already sets the publish directory to the repo root. HTTPS is
provided automatically, which satisfies WebMCP's secure-context requirement.

### Live WebMCP (recommended)

Real `document.modelContext` needs an origin trial token for your domain. Add it
to the `origin-trial` meta tag in `index.html`:

```html
<meta http-equiv="origin-trial" content="PASTE_YOUR_TOKEN_HERE" />
```

Without a token the demo still runs on the built-in shim, so judges can operate
it in any browser.

## Inspiration

Inspired by **ROAST — "Break WebMCP consent, then fix it with a mandate"**
([Devpost](https://devpost.com/software/break-webmcp-consent-then-fix-it-with-a-mandate)),
and the WebMCP standard draft at
[webmachinelearning.github.io/webmcp](https://webmachinelearning.github.io/webmcp/).

---

*Built with plain HTML, CSS, and JavaScript — no frameworks, no build step.*
