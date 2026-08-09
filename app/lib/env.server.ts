/**
 * Четене на env променлива, което работи и на Nova, и локално.
 *
 * На Cloudflare Workers `process.env` е ПРАЗЕН - стойностите идват през
 * `ctx.env`. Затова целият код чете оттам.
 *
 * Локално обаче `cloudcart nitrogen dev` подава на контекста само четири ключа
 * (`SESSION_SECRET`, `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`,
 * `PRIVATE_STOREFRONT_API_TOKEN`) - проверено в `@cloudcart/nitro/dist/index.js`.
 * Всичко останало от `.env` стига до `process.env`, но не и до `ctx.env`.
 *
 * Резултатът беше подвеждащ: функция, зависеща от `CLOUDCART_ADMIN_PAT`, падаше
 * тихо на резервния си вариант само локално и изглеждаше счупена, докато на
 * живо е наред. Този помощник маха разликата.
 */
export function envValue(
  env: Record<string, string | undefined> | undefined,
  key: string,
): string | undefined {
  const fromContext = env?.[key];
  if (fromContext) return fromContext;
  // На Workers този клон не дава нищо и е безвреден.
  try {
    return (globalThis as any)?.process?.env?.[key] || undefined;
  } catch {
    return undefined;
  }
}
