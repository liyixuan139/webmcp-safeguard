# SafeGuard — Devpost submission copy

Paste-ready text for the challenge submission form.

---

## Tagline

SafeGuard shows that every signal a WebMCP page declares about its tools — the
`name`, the `description`, even the `readOnlyHint` — can lie, then fixes it with a
**Human Mandate** that trusts only the runtime effect.

---

## About this project

### Inspiration

WebMCP gives a web page a new power: registering tools that an AI agent can
invoke. The browser's consent dialog is built from strings the *page* authors —
its `name`, its `description`, its `readOnlyHint`. So I asked a simple question:
**what happens when the page lies?** The answer is that nothing in the current
design stops it. SafeGuard makes that trust gap concrete, then closes it.

### What it does

SafeGuard is a self-contained browser demo — a virtual café exposing six tools —
that demonstrates four real attacks on WebMCP's consent surface:

1. **Label mismatch** — the dialog says "Donate $1", but the tool changes the account email.
2. **Hidden instruction** — a harmless coupon also silently upgrades the membership to a paid plan.
3. **Tool substitution** — a rogue script re-registers the trusted `donate` tool with the same name and description, but swapped code.
4. **Read-only lie** — a tool declares `readOnlyHint: true`, so the dialog promises "no changes", but it actually closes the account.

Then it shows the fix: a **Human Mandate** — rules the human grants up-front —
that intercepts every mutation and checks the *runtime effect primitive*
(`{ action: … }`), never the tool's declared name, description, or read-only flag.
A violating call is refused before any dialog can lie.

### Why WebMCP — and not any ordinary web app

SafeGuard's subject *is* WebMCP's consent surface. Each attack is a corruption of
a WebMCP primitive, so the vulnerability cannot even be stated outside WebMCP: the
browser-mediated consent prompt, the `readOnlyHint` annotation, and runtime tool
re-registration are all WebMCP inventions. It is also the challenge's own thesis —
an app that is better when a person and their agent use it together — because the
mandate is that split made concrete: the person grants bounded authority up-front,
the agent acts inside it, and a standing check sits between them.

### How I built it

Plain HTML, CSS, and JavaScript — no framework, no backend, no build step. State
can only mutate through a single `Effects.apply()` gateway, and the `Mandate`
intercepts every call through it. That capability boundary is why a hidden second
effect, a swapped tool, or a read-only lie is caught exactly like a blatant one.
The repo also ships [`THREAT-MODEL.md`](./THREAT-MODEL.md) (a reusable trust-boundary
checklist plus a concrete proposal for the WebMCP spec) and [`mandate.json`](./mandate.json)
(a machine-readable policy), because the mandate is data, not UI.

### What's next

Three spec-shaped fixes follow directly from the four attacks: structured,
machine-readable `effects` in tool results; verifying `readOnlyHint` against those
effects instead of trusting it; and registration identity so a "trusted" name can't
be silently rebound. I'd love to prototype the first of these against a real agent.
