import {deriveStudyTitle, type Study} from '~/components/MedicalStudies';

/**
 * Extracts structured pieces from a product's `descriptionHtml`:
 *   • benefits  — emoji-bulleted "what this does for you" lines that the CMS
 *                 authors write as `<p><span>🟢 ...</span><br>🟢 ...</p>`
 *                 (rendered separately as a beautiful checklist callout)
 *   • studies   — the `medical-research-section` PDFs grid
 *   • before    — HTML before the medical section (with benefit paragraphs
 *                 and orphan CMS <style> tags stripped out)
 *   • after     — HTML after the medical section
 *
 * Used by ProductTabs to:
 *   1. Render <ProductBenefits> above the regular description
 *   2. Render cleaned-up RichText for the rest
 *   3. Render <MedicalStudies> for the PDF grid
 */

export interface ParsedDescription {
  before: string;
  after: string;
  studiesTitle?: string;
  studiesSubtitle?: string;
  studies: Study[];
  /** Extracted "key benefits" — emoji-led paragraph lines. */
  benefits: string[];
}

/** Regex that matches a line starting with one or more bullet glyphs.
 *
 * Uses Unicode-aware `u` flag + `\p{Extended_Pictographic}` so multi-byte
 * emojis (🟢 = U+1F7E2 = surrogate pair in UTF-16) are matched as single
 * units. Without `u` flag a class like `[🟢]` only matches ONE of the
 * surrogate halves and leaves the other → renders as � replacement char.
 *
 * Also matches:
 *   • ️ — variation selector that follows some emojis
 *   • � — replacement char (in case CMS content is already corrupted)
 *   • Geometric shapes (●▪►➤→·•◦) — common ASCII/legacy bullets
 */
const BULLET_PREFIX = /^\s*(?:[\p{Extended_Pictographic}�✅✓✔●▪▶➞→•◦·]️?\s*)+/u;

export function parseProductDescription(html: string): ParsedDescription {
  if (!html) {
    return {before: '', after: '', studies: [], benefits: []};
  }

  // ─── Step 0: Drop the bullet list the classic theme still needs ──────
  const trimmed = dropLegacyBenefits(html);

  // ─── Step 1: Extract emoji-bullet "benefits" paragraphs ──────────────
  const {cleanedHtml, benefits} = extractBenefits(trimmed);

  // ─── Step 2: Slice out medical-research-section ──────────────────────
  const sectionStart = cleanedHtml.search(/<div[^>]*class="[^"]*medical-research-section[^"]*"/i);
  if (sectionStart < 0) {
    return {
      before: stripInlineMedicalStyle(cleanedHtml),
      after: '',
      studies: [],
      benefits,
    };
  }

  const openTagEnd = cleanedHtml.indexOf('>', sectionStart);
  if (openTagEnd < 0) {
    return {
      before: stripInlineMedicalStyle(cleanedHtml),
      after: '',
      studies: [],
      benefits,
    };
  }

  // Track nested <div> depth to find the matching closing tag
  let depth = 1;
  let i = openTagEnd + 1;
  while (i < cleanedHtml.length && depth > 0) {
    const nextOpen = cleanedHtml.indexOf('<div', i);
    const nextClose = cleanedHtml.indexOf('</div>', i);
    if (nextClose < 0) {
      i = cleanedHtml.length;
      depth = 0;
      break;
    }
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
    }
  }
  const sectionEnd = i;
  const sectionHtml = cleanedHtml.slice(sectionStart, sectionEnd);

  let before = cleanedHtml.slice(0, sectionStart);
  before = stripInlineMedicalStyle(before);
  const after = cleanedHtml.slice(sectionEnd);

  // ─── Step 3: Parse the medical section title/subtitle/items ─────────
  const titleMatch = sectionHtml.match(
    /<div[^>]*class="[^"]*medical-research-title[^"]*"[^>]*>\s*<h\d[^>]*>([\s\S]*?)<\/h\d>/i,
  );
  const studiesTitle = titleMatch ? stripTags(titleMatch[1]).trim() : undefined;

  const subtitleMatch = sectionHtml.match(
    /<div[^>]*class="[^"]*medical-research-subtitle[^"]*"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
  );
  const studiesSubtitle = subtitleMatch ? stripTags(subtitleMatch[1]).trim() : undefined;

  const studies: Study[] = [];
  const itemRe =
    /<div[^>]*class="[^"]*medical-research-item[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(sectionHtml)) !== null) {
    const pdfUrl = m[1];
    const inner = m[2];
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?/i);
    const imageUrl = imgMatch?.[1];
    const alt = imgMatch?.[2];
    const {title, subtitle} = deriveStudyTitle(pdfUrl, imageUrl, alt);
    studies.push({pdfUrl, imageUrl, title, subtitle});
  }

  return {before, after, studiesTitle, studiesSubtitle, studies, benefits};
}

/**
 * Scan paragraphs for emoji-bullet "benefits" lines and extract them.
 * Returns the cleaned HTML (paragraphs that contained ONLY benefit lines
 * are removed entirely) and the deduplicated list of benefit texts.
 */
function extractBenefits(html: string): {cleanedHtml: string; benefits: string[]} {
  const benefits: string[] = [];
  const seen = new Set<string>();

  const cleanedHtml = html.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (match, inner: string) => {
      // Split by <br> tags to look at each line individually
      const lines = inner.split(/<br\s*\/?>/i);
      const remaining: string[] = [];
      let consumedAny = false;

      // Walk lines with index so we can look ahead for continuation lines.
      // A "continuation" = a line WITHOUT a bullet that immediately follows
      // a benefit line and is short (likely the rest of the same sentence,
      // because CMS authors hit Enter mid-sentence). We merge it into the
      // benefit text and consume it so it doesn't end up as an orphan word
      // in the remaining HTML.
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const text = stripTags(line).trim();
        if (!text) {
          remaining.push(line);
          continue;
        }
        const match = text.match(BULLET_PREFIX);
        if (match) {
          let benefitText = text.replace(BULLET_PREFIX, '').trim();

          // Lookahead: glue together up to 2 continuation lines (no bullet,
          // < 60 chars each). Stop at first bullet line or long paragraph.
          while (li + 1 < lines.length) {
            const next = stripTags(lines[li + 1]).trim();
            if (!next) { li++; continue; }
            if (BULLET_PREFIX.test(next)) break;
            if (next.length > 60) break;
            // Looks like a continuation — merge with space
            benefitText = `${benefitText} ${next}`.trim();
            li++;
          }

          // Filter out non-benefit emoji lines (CTAs, dosing, etc.)
          if (
            benefitText.length > 8 &&
            benefitText.length < 280 &&
            !/^прием:/i.test(benefitText) &&
            !/^дозировка/i.test(benefitText) &&
            !seen.has(benefitText.toLowerCase())
          ) {
            benefits.push(benefitText);
            seen.add(benefitText.toLowerCase());
          }
          consumedAny = true;
        } else {
          remaining.push(line);
        }
      }

      // If we extracted anything AND the remaining content is empty/whitespace,
      // drop the whole paragraph. Otherwise keep what's left.
      const remainingHtml = remaining.join('<br>');
      const remainingText = stripTags(remainingHtml).trim();
      if (consumedAny && !remainingText) {
        return ''; // entire <p> was benefits — remove it
      }
      if (consumedAny) {
        // Keep the leftover non-benefit content
        return match.replace(inner, remainingHtml);
      }
      return match;
    },
  );

  // Some of the authored texts write the same list as a checklist <ul> instead
  // of emoji-led lines. Both are the product's key benefits and both belong in
  // the callout, or the same product loses its strip just because its copy was
  // typed differently.
  const withList = extractCheckList(cleanedHtml, benefits, seen);

  return {cleanedHtml: dropOrphanBenefitsHeading(withList, benefits), benefits};
}

/** `<ul class="bb-desc-check">` — the authored equivalent of the emoji lines. */
function extractCheckList(html: string, benefits: string[], seen: Set<string>): string {
  return html.replace(
    /<ul[^>]*class="[^"]*bb-desc-check[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
    (match, inner: string) => {
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => stripTags(m[1]).trim())
        .filter((t) => t.length > 8 && t.length < 280 && !seen.has(t.toLowerCase()));
      if (!items.length) return match;
      for (const item of items) {
        benefits.push(item);
        seen.add(item.toLowerCase());
      }
      return '';
    },
  );
}

/**
 * A heading whose whole list has just been lifted into the benefits strip is
 * left standing over nothing. The authored descriptions write the list under
 * „Основни ползи", so after the lift the body showed that heading followed by
 * the next section.
 */
function dropOrphanBenefitsHeading(html: string, benefits: string[]): string {
  if (!benefits.length) return html;
  return html.replace(
    /<h[1-6][^>]*>\s*(?:<[^>]+>\s*)*Основни\s+ползи[\s\S]{0,20}?<\/h[1-6]>/gi,
    (heading, offset: number) => {
      // Only when nothing of the list survived right below it.
      const after = html.slice(offset + heading.length, offset + heading.length + 400);
      return BULLET_PREFIX.test(stripTags(after)) ? heading : '';
    },
  );
}

/**
 * The old bullet list, kept in the description for the classic theme only.
 *
 * When the authored copy moved into the panel (2026-08-07) the store was still
 * being served by the classic theme, which has no benefits strip and would
 * simply have lost those lines. They stay in the description wrapped in
 * `bb-legacy-benefits`; the redesign builds its strip from the authored text
 * instead, so showing them too would list the same benefits twice.
 */
function dropLegacyBenefits(html: string): string {
  return html.replace(
    /<div[^>]*class="[^"]*bb-legacy-benefits[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    '',
  );
}

/** Remove orphan inline <style> tags that target medical-research-* classes. */
function stripInlineMedicalStyle(html: string): string {
  return html.replace(
    /<style[^>]*>[\s\S]*?\.medical-research-[\s\S]*?<\/style>/gi,
    '',
  );
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
