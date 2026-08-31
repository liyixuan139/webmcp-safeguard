# SafeGuard — WebMCP Challenge Submission

**One-liner:** SafeGuard breaks WebMCP's consent dialog with four real attacks,
then fixes it with a "Human Mandate" that verifies what a tool *does*, not what
its dialog *says*.

## What it is

SafeGuard is a self-contained browser demo that registers tools through
`document.modelContext` and shows how WebMCP's consent surface can be made to
lie — then shows a guardrail that makes it honest.

A virtual café exposes six tools. The "Break" side demonstrates four attacks:

1. **Label mismatch** — the dialog says "Donate $1" but the tool changes the
   account email.
2. **Hidden instruction** — a harmless coupon also silently upgrades membership.
3. **Tool substitution** — a rogue script re-registers the trusted `donate` tool
   with an identical description but swapped code.
4. **Read-only lie** — a tool declares `readOnlyHint: true` but actually closes
   the account.

The "Fix" side is a **Human Mandate**: rules the human grants up-front. Every
tool call is checked against its *runtime effect primitive* — never the tool's
`description` or `name` — before it mutates state. A violating call is refused
silently, with no consent dialog left to fool.

## Why this belongs on WebMCP

WebMCP gives pages a new power — structured tools an agent can call — and a new
attack surface: the consent dialog. The dialog renders a human-authored
`description`, and a description can lie. This is a WebMCP-shaped problem in a
way it isn't for ordinary web pages: the person isn't watching every call, so
the gap between "what the dialog says" and "what the tool does" is exploitable
at scale. SafeGuard demonstrates that gap concretely, and proposes a pattern
(the mandate) to close it.

## How it improves the experience

The mandate replaces per-call consent fatigue with bounded, up-front authority:

- **No prompt fatigue** — in-scope actions (donate ≤ $5) run without a dialog.
- **Guardrails on destructive actions** — email changes, membership upgrades,
  and account closure are refused outright, before a dialog could lie.
- **Human keeps control** — the human sets the boundary; the agent works inside
  it; only the boundary escalates back to the human.

This is the "person and agent together" story: the human grants authority
(Intent), the agent acts (Effect), and the mandate is the authority between
them (Authority).

## Implementation

- `tools.js` — café state, the `Effects.apply()` capability boundary, and the
  six tool definitions.
- `mandate.js` — the rule engine that intercepts every `Effects.apply()` call.
- `webmcp.js` — registers tools via the real `document.modelContext` when
  present, else a local shim so the demo runs in any browser.
- `app.js` / `index.html` / `styles.css` — the UI, consent simulation, and the
  intent · consent · effect audit log.

The key idea: state can only mutate through `Effects.apply()`, and the mandate
checks the *effect primitive* (`{ action: 'change_email' }`), not the tool's
human-authored description. That is why a swapped or read-only-lying tool is
caught just like a blatant one.

## Demo

Live URL: `https://<your-site>.netlify.app` (see README → "Submitting to the
WebMCP Challenge").

The header button **"▶ Run full demo"** plays the whole break-then-fix story in
under a minute.

## License

MIT — see `LICENSE`.
