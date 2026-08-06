/**
 * Reading the page-builder's settings values.
 *
 * Most settings are plain strings. The repeating ones — `banners`, `buttons`,
 * `slides` — arrive as a map keyed by "1", "2", … serialised with SINGLE quotes:
 *
 *   {'1': {'type': 'image', 'src': 'https://…', 'link': ''}, '2': {…}}
 *
 * That is not JSON, so `JSON.parse` throws on it. Everything below exists to
 * turn it into objects without pulling in a parser dependency.
 */

/** A repeated entry (one banner, one button, one slide). */
export type BuilderEntry = Record<string, string>;

/** `"1"` / `1` / `"yes"` / `true` all mean on; anything else means off. */
export function isOn(value: unknown, fallback = false): boolean {
  if (value == null || value === '') return fallback;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'yes' || v === 'true' || v === 'on';
}

export function text(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

export function number(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Turn a settings value that holds a keyed map into an ordered array.
 *
 * Accepts what the builder actually stores: a real array, a real object, a JSON
 * string, or the single-quoted form above. Anything unreadable yields [] rather
 * than throwing — a page must not blank out because one widget is odd.
 */
export function entries(value: unknown): BuilderEntry[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(isRecord) as BuilderEntry[];
  if (isRecord(value)) return ordered(value as Record<string, unknown>);

  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw || (raw[0] !== '{' && raw[0] !== '[')) return [];

  const parsed = parseLoose(raw);
  if (Array.isArray(parsed)) return parsed.filter(isRecord) as BuilderEntry[];
  if (isRecord(parsed)) return ordered(parsed as Record<string, unknown>);
  return [];
}

function isRecord(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Keys are "1", "2", … — order by their number, not by insertion. */
function ordered(map: Record<string, unknown>): BuilderEntry[] {
  return Object.keys(map)
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
    .map((k) => map[k])
    .filter(isRecord)
    .map((entry) => {
      const out: BuilderEntry = {};
      for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
        if (v == null) continue;
        out[k] = typeof v === 'string' ? v : String(v);
      }
      return out;
    });
}

/**
 * JSON first; if that fails, rewrite the single-quoted form into JSON.
 *
 * The rewrite walks the string character by character rather than running a
 * regex, because a value can itself contain a quote or a brace — a URL with a
 * query string, or Bulgarian copy with an apostrophe — and a regex would cut it
 * in the wrong place.
 */
function parseLoose(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through to the rewrite */
  }
  try {
    return JSON.parse(toJson(raw));
  } catch {
    return null;
  }
}

function toJson(raw: string): string {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"') {
      // Already a JSON string — copy it across untouched.
      const end = closingQuote(raw, i, '"');
      out += raw.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (ch === "'") {
      const end = closingQuote(raw, i, "'");
      const inner = raw.slice(i + 1, end);
      out += '"' + inner.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      i = end + 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Index of the quote that closes the one at `start`, honouring backslashes. */
function closingQuote(raw: string, start: number, quote: string): number {
  for (let i = start + 1; i < raw.length; i += 1) {
    if (raw[i] === '\\') {
      i += 1;
      continue;
    }
    if (raw[i] === quote) return i;
  }
  return raw.length - 1;
}
