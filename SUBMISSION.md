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

## Why this belongs on WebMCP — not any ordinary web app

SafeGuard's subject *is* WebMCP's consent surface. Each of the four attacks is a
corruption of a WebMCP primitive, so the vulnerability cannot even be stated
outside WebMCP:

- **The consent prompt** — WebMCP is the first web API that turns a
  page-authored `description` into a *browser-mediated consent dialog*. A
  normal web page has no such dialog (the human just clicks), so there is no
  prompt to lie. That prompt is the attack surface here.
- **`readOnlyHint`** — a WebMCP annotation meant to reassure ("no changes");
  the read-only lie shows that a field promising safety can itself be used to
  attack.
- **Runtime tool registration** — WebMCP tools can be re-registered, which is
  exactly what makes tool substitution possible.

It is also the challenge's own thesis: *an app that is better when a person and
their agent use it together*. WebMCP splits a single action into a person
(consent) and an agent (execution). SafeGuard is about the trust gap that split
creates — and the mandate is a concrete proposal for closing it: the person
grants bounded authority up-front (Intent), the agent acts inside it (Effect),
and a standing check sits between them (Authority).

The finding is a contribution to the standard, not just a toy. It argues the
consent prompt should not rest on a human-authored `description` alone, and that
runtime effect-checking belongs in the browser/agent layer — a design signal
WebMCP's spec and implementers can act on.

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

There is deliberately no backend. WebMCP tools live in the page
(`document.modelContext.registerTool`), and an agent calls their in-page
`execute()` directly — the standard has no server round-trip. State and the
mandate stay in the browser so the capability boundary is the whole, readable
subject. This is a security demonstration, not a production app: in-memory state
and client-side enforcement are an intentional trade-off.

## Demo

Live URL: <https://webmcp-safeguard.netlify.app>

The header button **"▶ Run full demo"** plays the whole break-then-fix story in
under a minute.

## License

MIT — see `LICENSE`.
