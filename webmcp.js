/* =============================================================
   webmcp.js — WebMCP abstraction layer
   -------------------------------------------------------------
   Registers tools through the real WebMCP API when the browser
   exposes it, otherwise falls back to a local registry (shim) so
   the demo runs in any browser.

   Two responsibilities:
   1. Feature-detect document.modelContext / navigator.modelContext.
   2. Provide a unified registerTool / listTools / executeTool API.

   Honesty note: the demo's "trigger" buttons call executeTool(),
   which runs the tool's execute() function directly — the same
   function a real agent would run. This keeps the demo's consent /
   mandate flow deterministic (the browser's own consent prompt is
   not scriptable, so we model it ourselves).
   ============================================================= */

const webmcp = (() => {
  const registry = new Map(); // name -> tool definition

  // --- Feature detection -------------------------------------
  // Newer spec: document.modelContext. Older spec: navigator.modelContext.
  const modelContext =
    (typeof document !== 'undefined' && document.modelContext) ||
    (typeof navigator !== 'undefined' && navigator.modelContext);

  const hasTesting =
    typeof navigator !== 'undefined' && 'modelContextTesting' in navigator;

  const mode =
    modelContext && typeof modelContext.registerTool === 'function'
      ? 'live'
      : 'shim';

  // --- Registration -------------------------------------------
  // Always store the tool locally. When the real API is present,
  // also register it with the browser so a genuine agent could
  // discover and call it.
  async function registerTool(tool) {
    registry.set(tool.name, tool);

    if (mode === 'live') {
      try {
        await modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
          annotations: tool.annotations,
          // Forward the browser-provided `client` when present.
          execute: (input, client) => tool.execute(input, client),
        });
        console.info(`[webmcp] registered '${tool.name}' with real WebMCP`);
      } catch (err) {
        console.warn(`[webmcp] registerTool('${tool.name}') failed:`, err);
      }
    } else {
      console.info(`[webmcp] shim: registered '${tool.name}' locally`);
    }
  }

  async function registerTools(tools) {
    for (const tool of tools) await registerTool(tool);
  }

  function listTools() {
    return [...registry.values()];
  }

  function getTool(name) {
    return registry.get(name);
  }

  // --- Invocation ---------------------------------------------
  // The canonical "an agent calls a tool" entry point. Runs
  // execute() directly so the demo is deterministic. In a real
  // WebMCP session this same execute() would be triggered by the
  // browser/agent.
  async function executeTool(name, args = {}) {
    const tool = registry.get(name);
    if (!tool) throw new Error(`Unknown tool: '${name}'`);
    return tool.execute(args);
  }

  return {
    mode, // 'live' | 'shim'
    isLive: mode === 'live',
    hasTesting,
    registerTool,
    registerTools,
    listTools,
    getTool,
    executeTool,
  };
})();
