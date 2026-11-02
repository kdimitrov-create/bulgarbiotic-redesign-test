/**
 * Има ли ИЗОБЩО начин витрината да не пита магазина по петнайсет пъти на страница.
 *
 * Дотук се знае: `caches.default` е забранен за този работник, а Nova не дава
 * нито KV, нито друга кутия - само низове. Остават три недоказани надежди и
 * тази проба ги проверява на живо, вместо да се разсъждава за тях:
 *
 *   1. ИМЕНУВАН КЕШ. Забранен е „подразбиращият се" - може именуваният да не е.
 *   2. GET към API-то. Cloudflare кешира само GET. Ако магазинът приема заявка
 *      по GET, отваря се вратата към точка 3.
 *   3. `cf: {cacheTtl}` при fetch. Това е РАЗЛИЧЕН механизъм от Cache API -
 *      кеширане на ръба по пътя на заявката. Забраната за единия не значи
 *      забрана за другия. Ако работи, имаме общ кеш и нищо не се реже.
 *
 * Нищо не се пише и не се мени - само прочитане на `__typename` и на заглавките.
 * Токени не излизат навън: в отговора влизат само кодове и `cf-cache-status`.
 */
export async function loader({context}: {context: any}) {
  const env = context?.cloudflare?.env ?? context?.env ?? {};
  const out: Record<string, unknown> = {};

  /* ── 1. Именуван кеш ───────────────────────────────────────────────── */
  try {
    const named = await (globalThis as any).caches?.open?.('bb-probe');
    if (!named) {
      out.namedCache = 'няма caches.open';
    } else {
      const key = 'https://bb-cache.internal/named';
      // Запис от ПРЕДИШНА заявка значи, че кешът наистина е общ между изолатите
      // - а точно това, а не записът сам по себе си, решава задачата.
      const before = await named.match(key).catch(() => null);
      out.namedCache = before ? 'РАБОТИ и оцелява между заявки' : 'РАБОТИ (първи запис)';
      if (before) out.storedAt = await before.text();
      await named.put(
        key,
        new Response(new Date().toISOString(), {headers: {'Cache-Control': 'max-age=300'}}),
      );
    }
  } catch (err) {
    out.namedCache = `забранен: ${(err as Error).message}`;
  }

  const origin =
    env.PUBLIC_API_ORIGIN ||
    (env.PUBLIC_STORE_DOMAIN ? `https://${env.PUBLIC_STORE_DOMAIN}` : null);
  out.origin = origin ? 'налично' : 'липсва';

  const pat = env.CLOUDCART_ADMIN_PAT;
  const sfToken = env.PUBLIC_STOREFRONT_API_TOKEN;
  const probe = encodeURIComponent('{__typename}');

  /* ── 2. Приема ли магазинът заявка по GET ──────────────────────────── */
  if (origin && pat) {
    try {
      const res = await fetch(`${origin}/api/gql?query=${probe}`, {
        headers: {Authorization: `Bearer ${pat}`},
      });
      const body = await res.text();
      out.adminGET = {
        status: res.status,
        // Само дали е върнало смислен отговор - не самото съдържание.
        looksValid: body.includes('__typename') || body.includes('"data"'),
      };
    } catch (err) {
      out.adminGET = `грешка: ${(err as Error).message}`;
    }
  }

  if (origin && sfToken) {
    try {
      const res = await fetch(`${origin}/api/sf?query=${probe}`, {
        headers: {'X-Storefront-Access-Token': sfToken},
      });
      const body = await res.text();
      out.storefrontGET = {
        status: res.status,
        looksValid: body.includes('__typename') || body.includes('"data"'),
      };
    } catch (err) {
      out.storefrontGET = `грешка: ${(err as Error).message}`;
    }
  }

  /* ── 3. Кешира ли ръбът, когато го помолим през `cf` ───────────────── */
  if (origin && sfToken) {
    const url = `${origin}/api/sf?query=${probe}&probe=cf`;
    const hits: string[] = [];
    for (let i = 0; i < 2; i++) {
      try {
        const res = await fetch(url, {
          headers: {'X-Storefront-Access-Token': sfToken},
          cf: {cacheTtl: 120, cacheEverything: true},
        } as any);
        hits.push(`${res.status}/${res.headers.get('cf-cache-status') ?? 'няма заглавка'}`);
      } catch (err) {
        hits.push(`грешка: ${(err as Error).message}`);
      }
    }
    // Втората заявка е важната: HIT значи, че ръбът пази вместо нас.
    out.cfCacheTtl = hits;
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
  });
}
