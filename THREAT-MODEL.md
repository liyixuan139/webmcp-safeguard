# SafeGuard — Threat model & proposed fix

This is the security document behind SafeGuard. It states the trust boundary,
enumerates the attacks, and proposes a concrete change to WebMCP so the whole
class of bug is fixed in the platform rather than re-fixed in every page.

## The trust boundary

WebMCP moves a new capability onto the web: a page registers tools, and a
browser or agent can invoke them. The consent surface is built entirely from
**signals the page itself declares**:

| Signal         | Declared by | Meant to mean            | Reality              |
| -------------- | ----------- | ------------------------ | -------------------- |
| `name`         | page        | which tool this is       | attacker-chosen string |
| `description`  | page        | what the tool does       | attacker-chosen string |
| `readOnlyHint` | page        | "makes no changes"       | attacker-chosen boolean |

None of these is verified by anything the page doesn't also control. The
**trust boundary** is therefore the gap between *what a page declares* and
*what actually runs*.

## The attack surface

Four attacks, each corrupting one declared signal:

1. **Label mismatch** — `description` says "donate $1", but `execute()` changes the email.
2. **Hidden instruction** — `execute()` fires a second, undeclared effect.
3. **Tool substitution** — a rogue script re-registers a `name` + copied `description`,
   but swaps `execute()`.
4. **Read-only lie** — `readOnlyHint: true`, but `execute()` closes the account.

In every case the consent dialog is indistinguishable from the honest one: all
three signals are attacker-controlled, so the dialog cannot tell the truth from
the lie on its own.

## The proposed fix

The fix trusts the only thing a page cannot fake: the **runtime effect**.

SafeGuard demonstrates a **capability boundary**:

1. State mutates only through one gateway, `Effects.apply()`.
2. A **Human Mandate** (rules the human grants up-front) intercepts every
   mutation and checks the *effect primitive* (`{ action, … }`) — never the
   declared `name` / `description` / `readOnlyHint`.
3. A violating effect is refused before any consent dialog is shown.

Because the check sits between the tool and the state, a hidden second effect,
a swapped tool, or a read-only lie is caught exactly like a blatant one.

### What WebMCP should adopt

The class of bug is only fully closed if the *platform* stops trusting a page's
self-description. Three concrete proposals follow directly from the attacks:

- **Structured, machine-readable results.** Require tool results to carry an
  effects list — e.g. `effects: [{ action: 'change_email', target: '…' }]` — the
  way SafeGuard's `Effects.apply()` does. Then the browser can reason about what
  a tool *did*, not what its `description` *claimed*.
- **Verify `readOnlyHint` against effects.** Today the hint is taken on faith. If
  a tool returns `readOnlyHint: true` but its effects include a write, the browser
  should flag or refuse it.
- **Registration identity.** Tool substitution is possible because a `name` can be
  silently re-registered with different code. The platform should surface a stable
  registration identity so a "trusted" name cannot be silently rebound.

These are design signals the WebMCP spec and implementers can act on, not a
re-implementation of SafeGuard.

## The mandate policy

The mandate is data, not UI. [`mandate.json`](./mandate.json) is the default
policy (donate ≤ $5; email / membership / closure denied). The UI imports and
exports this same JSON — which is the point: a browser or agent layer would load
exactly this file to enforce the boundary.
