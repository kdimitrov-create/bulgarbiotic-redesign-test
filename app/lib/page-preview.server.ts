/**
 * Reading an unpublished page draft, for the panel's „Преглед" button.
 *
 * The button links to `/preview/page/{pageId}/{historyId}`. Every save in the
 * builder writes a new history row, so the draft the merchant is looking at is
 * not the one the storefront serves — only the Admin API can hand it over, and
 * only with the PAT.
 */

const REQUEST_TIMEOUT_MS = 8000;

export interface PageDraft {
  title: string;
  handle: string | null;
  /** The builder tree of this exact history row. */
  design: unknown;
  /** Whether this version is the live one. */
  published: boolean;
}

export async function fetchPageDraft(
  env: Record<string, string | undefined>,
  pageId: string,
  historyId: string,
): Promise<PageDraft | null> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  const query = `query PageDraft($pageId: ID!, $historyId: ID!) {
    pageHistoryVersion(pageId: $pageId, historyId: $historyId) { id design published }
    page(id: $pageId) { id name urlHandle }
  }`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query, variables: {pageId, historyId}}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: any; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const version = json.data?.pageHistoryVersion;
    if (!version) return null;
    const page = json.data?.page;
    return {
      title: page?.name || 'Преглед',
      handle: page?.urlHandle ?? null,
      design: version.design ?? null,
      published: Boolean(version.published),
    };
  } catch (error) {
    console.error('page preview: could not load the draft —', (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Same rule as everywhere else: never call the domain this worker serves. */
function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
