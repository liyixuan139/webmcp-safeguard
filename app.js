/* =============================================================
   app.js — UI wiring, consent simulation, and the audit log
   ============================================================= */

// --- Default mandate (matches the brief): donate ≤ $5, no personal
//     info changes, coupons allowed so the hidden instruction is caught.
const DEFAULT_RULES = [
  { action: 'donate', mode: 'allow', limit: 5 },
  { action: 'apply_coupon', mode: 'allow' },
  { action: 'change_email', mode: 'deny' },
  { action: 'change_membership', mode: 'deny' },
  { action: 'close_account', mode: 'deny' },
];

// --- Element helper -------------------------------------------
const $ = (sel) => document.querySelector(sel);

// --- Small utility ---------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolve the name a user believes they are calling. The substituted tool
// registers under a distinct key but reports the trusted name it spoofs,
// so the audit log shows the user's *intent* rather than the impostor's key.
const toolLabel = (toolName) => {
  const tool = webmcp.getTool(toolName);
  return (tool && tool.label) || toolName;
};

// --- Global error surface (surfaces runtime errors on-page) ----
// Useful for debugging: any uncaught error or rejected promise is
// shown directly in the audit log instead of only in the console.
window.addEventListener('error', (e) => {
  const msg = (e.error && (e.error.message || e.error.stack)) || e.message;
  console.error('[SafeGuard] error:', msg);
  showError(msg);
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason && (e.reason.message || e.reason.stack) || String(e.reason);
  console.error('[SafeGuard] unhandled rejection:', reason);
  showError(reason);
});

function showError(msg) {
  const tbody = document.querySelector('#log-body');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'row--deny';
  const td = document.createElement('td');
  td.colSpan = 5;
  td.textContent = `⚠ runtime error: ${msg}`;
  tr.appendChild(td);
  tbody.prepend(tr);
}

// --- Init -----------------------------------------------------
async function init() {
  Mandate.setRules(DEFAULT_RULES);
  renderRules();
  renderState();

  await webmcp.registerTools(TOOLS);
  renderStatus();
  console.info(`[app] registered ${TOOLS.length} tools in ${webmcp.mode} mode`);

  wireAttackButtons();
  wireDefendButtons();
  wireMandateForm();
  wireMandateIO();
  wireLogClear();
  wireDemoButton();
}

// --- Status pill ----------------------------------------------
function renderStatus() {
  const pill = $('#webmcp-status');
  const text = $('#webmcp-status-text');
  const modeEl = $('#mode-indicator');

  pill.classList.remove(
    'status-pill--unknown',
    'status-pill--live',
    'status-pill--sim',
    'status-pill--absent'
  );

  if (webmcp.isLive) {
    pill.classList.add('status-pill--live');
    text.textContent = `WebMCP live · ${TOOLS.length} tools`;
  } else {
    pill.classList.add('status-pill--sim');
    text.textContent = `WebMCP shim · ${TOOLS.length} tools`;
  }
  modeEl.textContent = webmcp.isLive
    ? (webmcp.testing ? 'Live API · test harness' : 'Live API')
    : 'Simulation';
  renderCapability();
}

// Describe exactly how tools are registered, for the footer. This is the one
// line that tells a visitor whether they're looking at the real WebMCP API or
// the local shim.
async function renderCapability() {
  const el = $('#webmcp-capability');
  if (!el) return;
  if (webmcp.isLive) {
    const tools = await webmcp.listBrowserTools();
    const names = Array.isArray(tools) && tools.length
      ? tools.map((t) => (t && t.name) || t).join(' · ')
      : `${TOOLS.length} tools`;
    el.textContent = `✓ WebMCP live — ${names} registered with document.modelContext`;
  } else {
    el.textContent = `WebMCP not detected — ${TOOLS.length} tools registered in a local shim (works in any browser)`;
  }
}

// --- Café state ------------------------------------------------
function renderState() {
  $('#balance').textContent = `$${State.balance.toFixed(2)}`;
  $('#email').textContent = State.email;
  $('#membership').textContent = State.membership;
  $('#account-status').textContent = State.accountStatus;
}

// Map effect actions to the state card they touch, for flash feedback.
const ACTION_TO_CARD = {
  donate: '#balance',
  change_email: '#email',
  change_membership: '#membership',
  close_account: '#account-status',
};

// Flash the relevant state card green (applied) or red (blocked).
function flashEffects(effects) {
  for (const e of effects || []) {
    const action = e.effect && e.effect.action;
    const sel = ACTION_TO_CARD[action];
    if (!sel) continue;
    const stat = document.querySelector(sel).closest('.cafe__stat');
    const cls = e.blocked ? 'flash--deny' : 'flash--ok';
    stat.classList.remove('flash--ok', 'flash--deny');
    void stat.offsetWidth; // force reflow so the animation restarts
    stat.classList.add(cls);
  }
}

// Update the per-panel "last verdict" badge.
function setLastVerdict(id, tone, text) {
  const el = document.getElementById(id);
  el.hidden = false;
  el.className = `last-verdict last-verdict--${tone}`;
  el.textContent = text;
}

// --- Consent dialog (the naive "break" path) -------------------
// The open dialog can be settled by the user (Allow/Deny) or
// programmatically via decideConsent() — the auto-demo uses that.
let consentSettle = null;

function showConsent(description, opts = {}) {
  return new Promise((resolve) => {
    const dialog = $('#consent-dialog');
    $('#consent-description').textContent = description;
    $('#consent-readonly').hidden = !opts.readOnly;
    dialog.hidden = false;

    const allowBtn = $('#consent-allow');
    const denyBtn = $('#consent-deny');

    const onAllow = () => settle(true);
    const onDeny = () => settle(false);
    const onKey = (e) => { if (e.key === 'Escape') settle(false); };

    allowBtn.addEventListener('click', onAllow);
    denyBtn.addEventListener('click', onDeny);
    document.addEventListener('keydown', onKey);

    // Focus the primary action so the dialog is keyboard-operable.
    allowBtn.focus();

    function settle(value) {
      dialog.hidden = true;
      allowBtn.removeEventListener('click', onAllow);
      denyBtn.removeEventListener('click', onDeny);
      document.removeEventListener('keydown', onKey);
      consentSettle = null;
      resolve(value);
    }

    consentSettle = settle;
  });
}

// Programmatically settle the open consent dialog (auto-demo path).
function decideConsent(value) {
  if (consentSettle) consentSettle(value);
}

// --- Invocation pipelines --------------------------------------

// Break path: naive consent. Show the tool's description, then run
// execute() regardless of what it actually does.
async function invokeNaive(toolName, args, opts = {}) {
  const tool = webmcp.getTool(toolName);
  const readOnly = !!(tool.annotations && tool.annotations.readOnlyHint);
  const consentText = readOnly ? `${tool.description} — read-only` : tool.description;

  // Show the consent dialog; in auto-demo mode, approve it after a
  // short delay so the viewer can read the (lying) description.
  const consentPromise = showConsent(tool.description, { readOnly });
  if (opts.autoAllow) {
    await sleep(opts.autoAllowDelay ?? 1200);
    decideConsent(true);
  }
  const allowed = await consentPromise;
  if (!allowed) {
    addLog({
      tone: 'deny',
      intent: toolLabel(toolName),
      consentShown: consentText,
      verdict: 'deny',
      effects: [{ blocked: true, summary: 'cancelled by user', reason: 'user denied consent' }],
    });
    setLastVerdict('break-verdict', 'deny', 'consent denied');
    return;
  }

  const result = await webmcp.executeTool(toolName, args);
  addLog({
    tone: 'break',
    intent: toolLabel(toolName),
    consentShown: tool.description,
    verdict: 'none',
    effects: result.effects,
  });
  renderState();
  flashEffects(result.effects);
  setLastVerdict('break-verdict', 'attack', '⚠ attack landed');
}

// Fix path: mandate enforcement. No consent dialog; each effect is
// checked against the mandate before it runs.
async function invokeMandated(toolName, args) {
  Mandate.activate();
  let result;
  try {
    result = await webmcp.executeTool(toolName, args);
  } finally {
    Mandate.deactivate();
  }

  const blocked = (result.effects || []).some((e) => e.blocked);
  addLog({
    tone: blocked ? 'deny' : 'allow',
    intent: toolLabel(toolName),
    consentShown: '(no consent dialog — mandate enforced)',
    verdict: blocked ? 'deny' : 'allow',
    effects: result.effects,
  });
  renderState();
  flashEffects(result.effects);
  setLastVerdict('defend-verdict', blocked ? 'deny' : 'allow', blocked ? 'deny' : 'allow');
}

// --- Log / test panel -----------------------------------------
let logCounter = 0;

function addLog({ tone, intent, consentShown, verdict, effects }) {
  logCounter += 1;
  const tbody = $('#log-body');
  const empty = tbody.querySelector('.log__empty');
  if (empty) empty.remove();

  const tr = document.createElement('tr');
  tr.className = `row--${tone}`;

  const tdIdx = document.createElement('td');
  tdIdx.textContent = logCounter;

  const tdIntent = document.createElement('td');
  tdIntent.innerHTML = `<span class="intent-tool">${escapeHtml(intent)}</span>`;

  const tdConsent = document.createElement('td');
  tdConsent.innerHTML = `<span class="consent-shown">${escapeHtml(consentShown)}</span>`;

  const tdVerdict = document.createElement('td');
  tdVerdict.appendChild(verdictChip(verdict));

  const tdEffect = document.createElement('td');
  tdEffect.appendChild(effectsList(effects));

  tr.append(tdIdx, tdIntent, tdConsent, tdVerdict, tdEffect);
  tbody.prepend(tr);
}

function verdictChip(verdict) {
  const span = document.createElement('span');
  if (verdict === 'allow') {
    span.className = 'chip chip--allow';
    span.textContent = 'allow';
  } else if (verdict === 'deny') {
    span.className = 'chip chip--deny';
    span.textContent = 'deny';
  } else {
    span.className = 'chip chip--none';
    span.textContent = 'no mandate';
  }
  return span;
}

function effectsList(effects) {
  const frag = document.createDocumentFragment();
  for (const e of effects || []) {
    const p = document.createElement('p');
    p.className = 'effect-line';

    if (e.blocked) {
      p.classList.add('effect-line--side');
      p.textContent = `✕ blocked: ${e.reason || 'blocked by mandate'}`;
    } else if (e.hidden) {
      p.classList.add('effect-line--hidden');
      p.textContent = `⚠ hidden side-effect: ${e.summary}`;
    } else if (e.swapped) {
      p.classList.add('effect-line--swapped');
      p.textContent = `⚠ swapped tool: ${e.summary}`;
    } else {
      p.textContent = `✓ ${e.summary}`;
    }
    frag.appendChild(p);
  }
  return frag;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// --- Mandate rule rendering -----------------------------------
function renderRules() {
  const ul = $('#mandate-rules');
  ul.innerHTML = '';
  const rules = Mandate.getRules();

  if (rules.length === 0) {
    const li = document.createElement('li');
    li.className = 'rule-list__empty';
    li.textContent = 'No rules yet. Add one below, or use the defaults.';
    ul.appendChild(li);
    return;
  }

  rules.forEach((rule, index) => {
    const li = document.createElement('li');
    li.className = 'rule';

    const mode = document.createElement('span');
    mode.className = `rule__mode rule__mode--${rule.mode}`;
    mode.textContent = rule.mode;

    const action = document.createElement('span');
    action.textContent = rule.action;

    const limit = document.createElement('span');
    limit.className = 'rule__limit';
    limit.textContent = rule.limit != null ? `≤ $${rule.limit}` : '';

    const remove = document.createElement('button');
    remove.className = 'rule__remove';
    remove.textContent = '×';
    remove.title = 'Remove rule';
    remove.addEventListener('click', () => {
      Mandate.removeRule(index);
      renderRules();
    });

    li.append(mode, action, limit, remove);
    ul.appendChild(li);
  });
}

// --- Button wiring --------------------------------------------
const ATTACK_HANDLERS = {
  'label-mismatch': () => invokeNaive('donate_one_dollar', {}),
  'hidden-instruction': () => invokeNaive('apply_coupon', {}),
  'tool-substitution': () => invokeNaive('donate_swapped', {}),
  'read-only-lie': () => invokeNaive('view_profile', {}),
};

const DEFEND_HANDLERS = {
  'donate-3': () => invokeMandated('donate', { amount: 3 }),
  'donate-50': () => invokeMandated('donate', { amount: 50 }),
  'change-email': () => invokeMandated('change_email', { email: 'new@example.com' }),
  'malicious-donate': () => invokeMandated('donate_one_dollar', {}),
  'hidden-coupon': () => invokeMandated('apply_coupon', {}),
  'swapped-donate': () => invokeMandated('donate_swapped', {}),
  'read-only-lie': () => invokeMandated('view_profile', {}),
};

function wireAttackButtons() {
  document.querySelectorAll('[data-attack]').forEach((btn) => {
    btn.addEventListener('click', () => ATTACK_HANDLERS[btn.dataset.attack]?.());
  });
}

function wireDefendButtons() {
  document.querySelectorAll('[data-defend]').forEach((btn) => {
    btn.addEventListener('click', () => DEFEND_HANDLERS[btn.dataset.defend]?.());
  });
}

function wireMandateForm() {
  $('#mandate-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const action = $('#rule-action').value;
    const mode = $('#rule-mode').value;
    const limitInput = $('#rule-limit');
    const limit = limitInput.value === '' ? undefined : Number(limitInput.value);

    Mandate.addRule({ action, mode, limit });
    limitInput.value = '';
    renderRules();
  });
}

// Export / import the mandate as a portable policy. This is the concrete
// artifact that could be shipped to the browser/agent layer — the point of the
// whole demo: the mandate is data, not UI.
function wireMandateIO() {
  $('#mandate-export').addEventListener('click', () => {
    const json = JSON.stringify(Mandate.getRules(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safeguard-mandate.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const fileInput = $('#mandate-import-file');
  $('#mandate-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rules = JSON.parse(reader.result);
        if (!Array.isArray(rules)) throw new Error('expected a JSON array of rules');
        Mandate.setRules(rules);
        renderRules();
      } catch (err) {
        showError(`mandate import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
}

function clearLog() {
  logCounter = 0;
  $('#log-body').innerHTML =
    '<tr class="log__empty"><td colspan="5">No tool calls yet. Trigger an attack or defence scenario above.</td></tr>';
}

function wireLogClear() {
  $('#log-clear').addEventListener('click', clearLog);
}

// --- One-click demo --------------------------------------------
function resetState() {
  State.balance = 0;
  State.email = 'user@example.com';
  State.membership = 'free';
  State.accountStatus = 'active';
  renderState();
}

async function runDemo() {
  const btn = $('#demo-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'Running demo…';

  // Clean slate for a repeatable recording.
  resetState();
  clearLog();

  // Phase 1 — the break: consent dialogs that lie, auto-approved.
  await invokeNaive('donate_one_dollar', {}, { autoAllow: true });
  await sleep(800);
  await invokeNaive('apply_coupon', {}, { autoAllow: true });
  await sleep(800);
  await invokeNaive('donate_swapped', {}, { autoAllow: true });
  await sleep(800);
  await invokeNaive('view_profile', {}, { autoAllow: true });
  await sleep(800);

  // Phase 2 — the fix: no dialogs; the mandate enforces each effect.
  await invokeMandated('donate', { amount: 3 });
  await sleep(650);
  await invokeMandated('donate', { amount: 50 });
  await sleep(650);
  await invokeMandated('change_email', { email: 'new@example.com' });
  await sleep(650);
  await invokeMandated('donate_one_dollar', {});
  await sleep(650);
  await invokeMandated('apply_coupon', {});
  await sleep(650);
  await invokeMandated('donate_swapped', {});
  await sleep(650);
  await invokeMandated('view_profile', {});

  btn.disabled = false;
  btn.textContent = label;
}

function wireDemoButton() {
  $('#demo-btn').addEventListener('click', runDemo);
}

// --- Boot -----------------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
