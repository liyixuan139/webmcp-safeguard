# SafeGuard — Demo video script

Target: **under 3 minutes** (shoot for ~2:00). Record the live site, click
"▶ Run full demo", and narrate over it. Times are approximate; the demo itself
runs in ~25 seconds, so you have room to pause and point.

---

## 0:00 — Hook (10s)

**[VISUAL]** Title / hero on screen: "Every signal a page declares *can lie*."

**[SAY]**
> WebMCP lets a web page register tools that an AI agent can call. The consent
> dialog is built from strings the page itself writes. So — what happens when the
> page lies? I built SafeGuard to find out.

---

## 0:10 — The boundary (10s)

**[VISUAL]** Scroll to the trust-boundary checklist.

**[SAY]**
> Three signals power that consent dialog: the tool's name, its description, and
> its read-only hint. All three are attacker-controlled. The only thing that can't
> be faked is what actually runs.

---

## 0:20 — The Break (40s)

**[VISUAL]** Click "▶ Run full demo". Watch the four consent dialogs auto-approve.

**[SAY]** (let the dialogs play, point as they appear)
> Here's attack one. The dialog says "Donate one dollar" — but look at the email.
> It changed. The consent was for a donation; the effect was an identity change.
>
> Attack two: a harmless coupon that also quietly upgrades the membership to a
> paid plan. Two effects, one consent.
>
> Attack three: a swapped tool. The name and description are identical — only the
> code changed. The dialog is indistinguishable from the real thing.
>
> And attack four: the read-only lie. The tool promises "no changes," and the
> account gets closed anyway.

---

## 1:00 — The Fix (35s)

**[VISUAL]** The demo runs phase two — no dialogs, just the mandate enforcing.

**[SAY]**
> Now the same café, with a Human Mandate: rules the human grants up-front.
> Donate three dollars — in scope, it just runs. Donate fifty — refused. Change
> the email — refused. And the exact same malicious tools from before? Now their
> *runtime effect* is checked before any dialog can lie — so they're all refused.
>
> The key idea: state can only change through one gateway, and the mandate checks
> the effect primitive — never the description.

---

## 1:35 — The artifact (20s)

**[VISUAL]** Point at the mandate editor, click "Export JSON"; switch to the repo and open `THREAT-MODEL.md` / `mandate.json`.

**[SAY]**
> The mandate is data, not UI — you can export it as JSON. And this threat model
> turns the demo into a concrete proposal: WebMCP should have structured effects
> in tool results, verify `readOnlyHint` against them, and give tools a stable
> registration identity.

---

## 1:55 — Outro (5s)

**[SAY]**
> A consent dialog that renders a page's own words is a dialog that can lie.
> SafeGuard shows the lie — and a mandate that makes it honest.
