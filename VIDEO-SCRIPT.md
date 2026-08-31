# SafeGuard — Demo video production script

Runtime target: ~1:40 narration + ~25s of live demo = **~2:05**, comfortably under
the 3-minute limit.

This is a *production* script, not a spoken script: the narration below is the
exact text fed to the text-to-speech engine, and the shot sheet maps each beat to
what is on screen so the edit can be synced. Voice: English (en-US).

---

## Narration (TTS source)

> Every time a website registers a tool that an AI agent can call, the browser
> shows a consent prompt, built from strings the page itself wrote: the tool's
> name, its description, and a read-only hint. So I asked — what happens when the
> page lies?
>
> I built SafeGuard to find out. This café exposes six tools, and I've turned four
> of them malicious.
>
> Attack one: the dialog says "Donate one dollar" — but watch the email. It
> changed. You consented to a donation; you got an identity change.
>
> Attack two: a harmless coupon that also quietly upgrades the membership to a paid
> plan. Two effects, one consent.
>
> Attack three: a swapped tool. The name and description are identical — only the
> code changed. The dialog is indistinguishable from the real thing.
>
> Attack four: the read-only lie. The tool promises "no changes," and the account
> gets closed anyway.
>
> Now the same café, with a Human Mandate: rules a person grants up front. Donate
> three dollars? In scope — it just runs. Donate fifty? Refused. Change the email?
> Refused. And those same malicious tools from before — now their runtime effect is
> checked before any dialog can lie.
>
> The key idea: state can only change through one gateway, and the mandate checks
> the effect primitive — never the description. The mandate is data, not UI: you can
> export it as JSON. And the threat model turns the demo into a concrete proposal
> for the spec.
>
> A consent dialog that renders a page's own words is a dialog that can lie.
> SafeGuard shows the lie — and a mandate that makes it honest.

---

## Shot sheet

| Beat | Narration cue | On screen |
|---|---|---|
| 1 | "Every time a website registers…" | Hero: "Every signal a page declares *can lie*." |
| 2 | "…what happens when the page lies?" | Scroll to the trust-boundary checklist |
| 3 | "This café exposes six tools…" | Café state cards + four attack buttons |
| 4 | "Attack one…" | Click **Donate $1** → dialog auto-approves → email changes |
| 5 | "Attack two…" | Click **Apply coupon** → coupon + hidden premium upgrade |
| 6 | "Attack three…" | Click **Donate (swapped)** → identical dialog → email changes |
| 7 | "Attack four…" | Click **View summary** → 🔒 read-only badge → account closes |
| 8 | "Now the same café, with a Human Mandate…" | The Fix panel + mandate rules |
| 9 | "…runtime effect is checked…" | Defence buttons light up green/red (all blocked) |
| 10 | "The mandate is data, not UI…" | Click **Export JSON**; show `mandate.json` |
| 11 | "…a concrete proposal for the spec." | Open `THREAT-MODEL.md` |
| 12 | "A consent dialog that renders…" | Back to hero / title card |

---

## Production notes

- **Screen capture** — record the live site at 1080p (OBS). Click **"▶ Run full
  demo"** once; the demo auto-runs the four attacks then the seven defences. The
  narration is ~1:40, so let the demo play and cut the narration to it (or pause
  the demo and let the edit cover it).
- **Voice** — AI text-to-speech, English (en-US). A draft narration is generated
  offline via the Windows `Microsoft Zira` voice (`build/narration.wav`); swap to a
  higher-fidelity AI voice (ElevenLabs / edge-tts) once available — the text stays
  identical.
- **Assembly** — `ffmpeg` muxes narration + screen + captions; a 3-second title
  card opens, and the closing line lands on the hero.
