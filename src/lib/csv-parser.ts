import type { SaasTool } from "@/lib/persistence.functions";
import { findAlternative } from "@/lib/saas-alts";

// Minimal CSV parser for bank/card statement style exports.
// Expects description + amount columns; auto-detects header or falls back to heuristics.

function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsvToTools(text: string): SaasTool[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const descIdx = header.findIndex((h) => /vendor|description|merchant|payee|name|memo|narrative/.test(h));
  const amtIdx = header.findIndex((h) => /amount|debit|charge|price|cost|total/.test(h));
  const hasHeader = descIdx !== -1 && amtIdx !== -1;
  const startRow = hasHeader ? 1 : 0;
  const tools: SaasTool[] = [];
  const seen = new Map<string, SaasTool>();
  for (let i = startRow; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    let name = "";
    let cost = 0;
    if (hasHeader) {
      name = cols[descIdx] ?? "";
      cost = Math.abs(Number(String(cols[amtIdx] ?? "").replace(/[^0-9.\-]/g, ""))) || 0;
    } else {
      for (const c of cols) {
        const n = Number(String(c).replace(/[^0-9.\-]/g, ""));
        if (!name && !Number.isFinite(n)) name = c;
        else if (!name && (c || "").match(/[a-zA-Zء-ي]/)) name = c;
        else if (!cost && Number.isFinite(n) && n !== 0) cost = Math.abs(n);
      }
    }
    name = name.replace(/^["']|["']$/g, "").trim();
    if (!name || cost <= 0) continue;
    const key = name.toLowerCase();
    const prev = seen.get(key);
    if (prev) {
      prev.cost = Math.max(prev.cost, cost);
    } else {
      const tool: SaasTool = {
        id: crypto.randomUUID(),
        name,
        category: findAlternative(name)?.category ?? "",
        cost,
        users: 1,
        usage: 100,
      };
      seen.set(key, tool);
      tools.push(tool);
    }
  }
  return tools;
}
