/* =============================================================
   mandate.js — the Human Mandate engine ("The Fix")
   ============================================================= */

/* The mandate is a set of rules granted up-front by the human. It
   evaluates every effect primitive BEFORE it mutates state, so a
   violating operation is refused without any consent dialog.

   Model (from ROAST): Intent → Authority → Effect.
   - The human grants bounded authority in advance.
   - Each effect is checked against that authority.
   - No per-call consent dialog is needed for in-scope actions, and a
     violating action is refused before a dialog could ever lie. */

const Mandate = (() => {
  let active = false;
  let rules = [];

  function activate() { active = true; }
  function deactivate() { active = false; }
  function isActive() { return active; }

  // Evaluate one effect against the rules. Deny rules win; then allow
  // rules; anything not explicitly allowed is denied (default-deny).
  function evaluate(effect) {
    for (const r of rules) {
      if (r.action === effect.action && r.mode === 'deny') {
        return { allowed: false, reason: `forbidden by mandate: “${effect.action}”` };
      }
    }
    for (const r of rules) {
      if (r.action === effect.action && r.mode === 'allow') {
        if (r.limit != null && effect.amount > r.limit) {
          return {
            allowed: false,
            reason: `exceeds mandate limit: $${effect.amount} > $${r.limit}`,
          };
        }
        return { allowed: true, reason: 'within mandate' };
      }
    }
    return { allowed: false, reason: `not authorized by mandate: “${effect.action}”` };
  }

  function addRule(rule) { rules.push(rule); }
  function removeRule(index) { rules.splice(index, 1); }
  function getRules() { return rules.slice(); }
  function setRules(next) { rules = next.slice(); }

  return { activate, deactivate, isActive, evaluate, addRule, removeRule, getRules, setRules };
})();
