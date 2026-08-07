import type {ReactNode} from 'react';
import {getPageContentOverride} from '~/lib/pages-content';

/**
 * The designed pages, addressable from inside the page builder.
 *
 * Moving a page into the builder must not cost it its design. So a page keeps
 * its hand-built layout AND becomes editable: the merchant composes it in
 * Дизайн → Страници, and wherever they want the designed part they drop a
 * "Код" block holding one line:
 *
 *     <!-- bb:page:kosa-koja-i-nokti -->
 *
 * Around it they can add their own text, banners, buttons or product showcases,
 * reorder everything, or delete the marker to replace the section entirely.
 *
 * Same idea as the homepage markers (`bb:doctors`, …), applied per page.
 */

/** Pages whose designed content can be placed from the builder. */
export const PAGE_SECTIONS: Array<{handle: string; label: string}> = [
  {handle: 'kosa-koja-i-nokti', label: 'Блестяща коса, кожа и нокти'},
  {handle: 'naukata-zad-bulgar-biotic', label: 'Науката зад Bulgar Biotic'},
  {handle: 'probiotik-za-bremenni', label: 'Пробиотик за бременни'},
  {handle: 'probiotik-ot-bactology', label: 'За Bulgar Biotic и Bactology'},
  {handle: 'chesto-zadavani-vaprosi', label: 'Често задавани въпроси'},
  {handle: 'abomanmet-za-byuletin', label: 'Абонамент за бюлетин'},
  {handle: 'about-us', label: 'За нас'},
  {handle: 'events', label: 'Събития и активности'},
];

const KNOWN = new Set(PAGE_SECTIONS.map((p) => p.handle));

/**
 * `bb:page:<handle>` → that page's designed content.
 *
 * Returns null for an unknown handle rather than throwing, so a typo in the
 * panel leaves a gap instead of a broken page.
 */
export function renderPageSection(handle: string): ReactNode {
  if (!KNOWN.has(handle)) return null;
  const override = getPageContentOverride(handle);
  return override ? override() : null;
}

export function knownPageSection(handle: string): boolean {
  return KNOWN.has(handle);
}

/**
 * Has this page been moved into the builder?
 *
 * The signal is the page placing ITS OWN designed section: a Код block holding
 * `bb:page:<its own handle>`. That makes the move an explicit choice per page —
 * a page nobody has touched keeps rendering exactly as it always did, and
 * deleting the marker in the panel hands it straight back.
 */
export function designPlacesPage(design: any, handle: string): boolean {
  if (!design || !handle) return false;
  const needle = `bb:page:${handle}`.toLowerCase();
  let found = false;
  const walk = (node: any) => {
    if (found || !node || typeof node !== 'object') return;
    const code = node?.settings?.code ?? node?.settings?.html;
    if (typeof code === 'string' && code.toLowerCase().includes(needle)) {
      found = true;
      return;
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(design);
  return found;
}
