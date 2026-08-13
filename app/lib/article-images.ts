/**
 * Article image overlay — CloudCart's Storefront API does NOT surface
 * `article.image.url` (it returns an empty string + sentinel ID
 * `gid://cloudcart/ArticleImage/0`). The same data IS available via the
 * Admin API as `{id, image: filename}`, so we mirror those filenames here
 * and reconstruct the public CDN URL on demand:
 *
 *   https://bulgarbiotic.bg/cdn/img/articles/{id}/{encodeURIComponent(filename)}?width=N&height=N
 *
 * Refresh procedure: run `cloudcart app execute --store bulgarbiotic.bg
 * --query 'query { articles(first:50) { edges { node { id urlHandle image } } } }'`
 * and pipe the output to regenerate the map.
 */

type ArticleImageEntry = {
  id: number;
  filename: string;
  /**
   * Optional path to an AI-enhanced local cover image (under
   * /public/images/articles/). When set AND the file exists in the build,
   * this overrides the CDN fallback so the listing renders the polished
   * editorial photograph instead of the legacy raw image.
   *
   * Generated via `scripts/gen-article-images.py` (Gemini 3 Pro Image).
   * Same pastel brand palette as homepage product photography for visual
   * cohesion across PDP + Blog.
   */
  enhanced?: string;
};

/** Set of article handles whose enhanced PNGs were successfully generated
 * (kept in sync with public/images/articles/<handle>.png). When the script
 * adds a new handle's PNG, append the handle here so the React layer starts
 * serving it.
 *
 * Regenerate via: `python3 scripts/gen-article-images.py` then sync this
 * list with the contents of public/images/articles/ (handle is the filename
 * without the `.png` extension). */
const ENHANCED_AVAILABLE = new Set<string>([
  '10-prichini-za-poduvane-na-korema-pri-jenite-kak-da-se-spravim',
  '15-septemvri-nablijava-povishete-imuniteta-na-deteto-s-bactojoy',
  'bactojoy-golyamata-strast-na-balgarskite-znamenitosti',
  'bactology-babies-kids-probiotichni-perli-s-mlechen-shokolad-za-silen-detski-imunitet',
  'bactology-femin-shtipka-uverenost-za-lyatoto-i-ne-samo',
  'bactology-femin-za-edno-spokoyno-lyato-bez-vaginalni-problemi',
  'bactology-noviyat-nay-dobar-priyatel-na-detskite-zabki',
  'bakteriii-i-gabichki-probioticite-znayat-kak-da-se-spravyat-s-tyah',
  'barcheta-s-probiotichni-perli',
  'barzo-reshenie-pri-zapek-10-provereni-nachina-za-nezabavno-oblekchenie',
  'biotin-vitamin-b7-malkiyat-vitamin-s-golyamo-znachenie-za-kosata-kojata-i-noktite',
  'blagodarya-ti-mamo',
  'bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g',
  'bulgarbiotik-vdahnovenie-ot-tradiciite-i-prirod',
  'da-vazpitame-polezni-navici-u-deteto-s-bactojoy',
  'disbioza-disbakterioza',
  'fit-tiramisu',
  'fstcheni-barcheta-s-probiotik',
  'gazove-v-chervata',
  'iskash-da-otslabnesh-probioticite-idvat-na-pomosht',
  'kak-da-izbegnem-letnite-nerazpolojeniya-s-pomoshtta-na-probioticite',
  'kak-da-izbegnem-letnite-virusi-s-bactology-ste-edna-krachka-napred',
  'kakvo-da-yadem-pri-podut-korem-i-gazove',
  'kakvo-sa-prebioticite-i-kak-podobryavat-hranosmilaneto',
  'koga-se-pie-probiotik-predi-ili-sled-antibiotika',
  'kolko-chesto-e-dobre-jenata-da-poseshtava-ginekolog',
  'leten-virus-li-s-bactojoy-mojete-da-badete-spokoyni',
  'marieta-zaharieva-biznesat-s-probiotici-mi-dade-drug-pogled-kam-sveta-i-horata',
  'mini-palachinki-s-izvara-i-probiotici',
  'misis-balgariya-zadelya-sredstva-ot-prodajbata-na-produktite-bactojoy-za-fondaciya-iskam-bebe',
  'mogat-li-dobrite-bakterii-da-ni-pomognat-v-ejednevnata-borba-sas-stresa-i-ima-li-vrazka-mejdu-chrevn',
  'mogat-li-probioticite-da-pomognat-za-upravlenieto-na-simptomite-na-menopauza',
  'nay-dobrite-balgarski-probiotici-bactojoy-s-nagrada-za-farma-brand-na-godinata',
  'ne-na-gazovete-i-podutiya-korem-s-bactojoy-gastro-balance',
  'nie-sme-brand-koyto-sachetava-nauka-balgarska-tradiciya-i-choveshki-podhod',
  'oshte-edna-vkusna-recepta-s-shoko-perli',
  'otkriyte-chara-na-parij-s-bulgar-biotik',
  'otslabvaneto-lesno-i-priyatno-s-bactojoy',
  'pokorihme-germaniya',
  'probiotic-chocolate-overnight-oats',
  'probiotici-i-zdrave',
  'probiotici-pri-kiselini',
  'probiotici-za-propusklivi-cherva',
  'probioticite-magicheskiyat-pomoshtnik-v-borbata-s-izlishnite-kilogrami',
  'probioticite-neizmenen-pomoshtnik-po-vreme-na-bremennost-i-sled-rajdane',
  'probiotik-pri-divertikulit',
  'probiotik-pri-razstroystvo',
  'probiotik-za-deca-pri-povrashtane',
  'probiotik-za-gabichki-v-ustata-kak-da-varnem-estestveniya-balans',
  'probiotikat-bactojoy-immune-complex-predpazva-ot-covid-19',
  'proletna-grija-za-damite-s-bactojoy-femin',
  'riben-kolagen-superproteinat-za-krasota-zdrave-i-jiznenost',
  'rolyata-na-probioticite-v-prevenciyata-i-lechenieto-na-autizma',
  'roza-damascena-taynata-na-jenskata-krasota-balans-i-dalgoletie',
  'sboguvay-se-s-izlishnite-kilogrami-s-bactojoy',
  'sindrom-na-razdraznenoto-debelo-chervo',
  'tejest-v-korema-kak-da-se-spravim-barzo-i-efektivno',
  'teleshka-kolastra-estestvena-podkrepa-za-imuniteta-i-cyalostnoto-zdrave',
  'top-10-saveta-kak-da-namalish-zadarjaneto-na-technosti',
  'top-10-saveta-kak-da-podobrish-metabolizma-si',
  'top-5-uprajneniya-za-korem-u-doma-za-stegnato-i-silno-tyalo',
  'triple-chocolate-cookie-dough',
  'uchenite-sa-kategorichni-probioticite-mogat-da-ni-predpazyat-ot-covid-19',
  'vaginalni-infekcii-i-prilojenie-na-probiotici',
  'vegan-sladoled-s-probiotichni-perli',
  'vlez-vav-forma-s-bulgar-biotik-i-razhodi-novo-tyalo-po-plajovete-v-dubay',
  'za-barnauta-za-edin-taen-chat-i-za-silata-na-bakteriite',
  'za-zdravi-zabi-i-venci-s-bactojoy',
  'zabravete-za-zapeka-i-se-radvayte-na-jivota-s-bactojoy-gastro-balance',
  'zadarjane-na-voda-kak-da-se-spravim-s-problema-lesno-i-efektivno',
  'zdravoslovna-zakuska-s-femin',
  'zdravoslovno-vkusno-i-lyubimo-na-decata-shto-e-to-1',
]);

const ARTICLE_IMAGES: Record<string, ArticleImageEntry> = {
  // Generated 2026-05-20 from `articles(first:100)` admin query. To refresh:
  //   cloudcart app execute --store bulgarbiotic.bg \
  //     --query 'query { articles(first:100){edges{node{id urlHandle image}}} }'
  'top-10-saveta-kak-da-podobrish-metabolizma-si': {id: 81, filename: '2acd23f4-9182-4b2f-8a8a-b242c08cfc66 (1).png'},
  'top-5-uprajneniya-za-korem-u-doma-za-stegnato-i-silno-tyalo': {id: 78, filename: '!23.png'},
  'roza-damascena-taynata-na-jenskata-krasota-balans-i-dalgoletie': {id: 76, filename: '0c671ccb-4895-4dd4-86c1-89aed742ff01.png'},
  'top-10-saveta-kak-da-namalish-zadarjaneto-na-technosti': {id: 74, filename: '8654858d-d2ac-4490-bbdf-0af4615551d3.png'},
  'bactology-babies-kids-probiotichni-perli-s-mlechen-shokolad-za-silen-detski-imunitet': {id: 73, filename: 'ChatGPT Image Mar 17, 2026, 10_03_48 AM (1).png'},
  'teleshka-kolastra-estestvena-podkrepa-za-imuniteta-i-cyalostnoto-zdrave': {id: 71, filename: 'd8730dfc-8b16-45dc-9d83-540198d09bef (1).png'},
  'riben-kolagen-superproteinat-za-krasota-zdrave-i-jiznenost': {id: 70, filename: '!2 (1).png'},
  'biotin-vitamin-b7-malkiyat-vitamin-s-golyamo-znachenie-za-kosata-kojata-i-noktite': {id: 69, filename: 'Untitled design (3).jpeg'},
  'kolko-chesto-e-dobre-jenata-da-poseshtava-ginekolog': {id: 68, filename: '!!!.png'},
  'nie-sme-brand-koyto-sachetava-nauka-balgarska-tradiciya-i-choveshki-podhod': {id: 67, filename: '_OM_5471_HR (1) (1).jpeg'},
  'vaginalni-infekcii-i-prilojenie-na-probiotici': {id: 66, filename: '!!Screenshot 2026-02-17 133005.png'},
  'bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g': {id: 65, filename: 'BGolden-Awards-2025.jpeg'},
  'probiotik-za-deca-pri-povrashtane': {id: 64, filename: 'vomiting-in-children.jpeg'},
  'gazove-v-chervata': {id: 63, filename: 'intestinal-gas.jpeg'},
  'probiotik-pri-divertikulit': {id: 62, filename: 'diverticula-colon.jpeg'},
  'kakvo-sa-prebioticite-i-kak-podobryavat-hranosmilaneto': {id: 61, filename: 'Prebiotics.jpeg'},
  'disbioza-disbakterioza': {id: 60, filename: 'Dysbiosis.jpeg'},
  'probiotici-za-propusklivi-cherva': {id: 59, filename: 'Probiotics-for-leaky-gut.jpeg'},
  'barzo-reshenie-pri-zapek-10-provereni-nachina-za-nezabavno-oblekchenie': {id: 58, filename: 'quick solution for constipation.jpeg'},
  'bactology-femin-shtipka-uverenost-za-lyatoto-i-ne-samo': {id: 57, filename: 'JPEG (58) (2).jpeg'},
  'kak-da-izbegnem-letnite-virusi-s-bactology-ste-edna-krachka-napred': {id: 56, filename: 'JPEG (14).jpeg'},
  'tejest-v-korema-kak-da-se-spravim-barzo-i-efektivno': {id: 55, filename: '55.jpeg'},
  'blagodarya-ti-mamo': {id: 54, filename: '54.png'},
  'vlez-vav-forma-s-bulgar-biotik-i-razhodi-novo-tyalo-po-plajovete-v-dubay': {id: 53, filename: '53.png'},
  'probiotik-za-gabichki-v-ustata-kak-da-varnem-estestveniya-balans': {id: 52, filename: '52.jpeg'},
  'probiotici-i-zdrave': {id: 51, filename: '51.jpeg'},
  'mogat-li-probioticite-da-pomognat-za-upravlenieto-na-simptomite-na-menopauza': {id: 50, filename: '50.jpeg'},
  'za-barnauta-za-edin-taen-chat-i-za-silata-na-bakteriite': {id: 49, filename: '49.jpeg'},
  'probiotici-pri-kiselini': {id: 48, filename: '48.jpeg'},
  'probiotik-pri-razstroystvo': {id: 47, filename: '47.jpeg'},
  'zadarjane-na-voda-kak-da-se-spravim-s-problema-lesno-i-efektivno': {id: 46, filename: '46.jpeg'},
  '10-prichini-za-poduvane-na-korema-pri-jenite-kak-da-se-spravim': {id: 45, filename: '45.jpeg'},
  'otkriyte-chara-na-parij-s-bulgar-biotik': {id: 43, filename: '43.png'},
  'sindrom-na-razdraznenoto-debelo-chervo': {id: 42, filename: '42.jpeg'},
  'kakvo-da-yadem-pri-podut-korem-i-gazove': {id: 41, filename: '41.jpeg'},
  'kak-da-izbegnem-letnite-nerazpolojeniya-s-pomoshtta-na-probioticite': {id: 40, filename: '40.jpeg'},
  'koga-se-pie-probiotik-predi-ili-sled-antibiotika': {id: 39, filename: '39.jpeg'},
  'mogat-li-dobrite-bakterii-da-ni-pomognat-v-ejednevnata-borba-sas-stresa-i-ima-li-vrazka-mejdu-chrevn': {id: 38, filename: '38.jpeg'},
  'bulgarbiotik-vdahnovenie-ot-tradiciite-i-prirod': {id: 37, filename: '37.jpeg'},
  'bactology-noviyat-nay-dobar-priyatel-na-detskite-zabki': {id: 36, filename: '36.png'},
  'za-zdravi-zabi-i-venci-s-bactojoy': {id: 34, filename: '482181538_18050965256232558_8412923669198815052_n.jpeg'},
  'zabravete-za-zapeka-i-se-radvayte-na-jivota-s-bactojoy-gastro-balance': {id: 33, filename: '466869719_18040709621232558_1007277866706936239_n.jpeg'},
  'probioticite-magicheskiyat-pomoshtnik-v-borbata-s-izlishnite-kilogrami': {id: 32, filename: '32.jpeg'},
  '15-septemvri-nablijava-povishete-imuniteta-na-deteto-s-bactojoy': {id: 31, filename: '37d65011-0210-4048-bfe1-0852137604f0.jpeg'},
  'ne-na-gazovete-i-podutiya-korem-s-bactojoy-gastro-balance': {id: 30, filename: '462080473_18036260849232558_7101089897151359391_n.jpeg'},
  'bactology-femin-za-edno-spokoyno-lyato-bez-vaginalni-problemi': {id: 29, filename: '491489861_1209030817895661_1195012825426735623_n.jpeg'},
  'leten-virus-li-s-bactojoy-mojete-da-badete-spokoyni': {id: 28, filename: '449967896_18026478983232558_7776633520137987_n.jpeg'},
  'sboguvay-se-s-izlishnite-kilogrami-s-bactojoy': {id: 27, filename: 'DSC_5073.jpeg'},
  'mini-palachinki-s-izvara-i-probiotici': {id: 26, filename: 'image00001-62a9a87b0b1d2.jpeg'},
  'probiotic-chocolate-overnight-oats': {id: 25, filename: '25_1280x1280.jpeg'},
  'triple-chocolate-cookie-dough': {id: 24, filename: '24_1280x1280.jpeg'},
  'fit-tiramisu': {id: 23, filename: '4f8dc873-74bd-40b2-8410-a97a35068777-2.jpeg'},
  'zdravoslovna-zakuska-s-femin': {id: 22, filename: '22_1280x1280.jpeg'},
  'rolyata-na-probioticite-v-prevenciyata-i-lechenieto-na-autizma': {id: 21, filename: 'DSC_5167.jpeg'},
  'vegan-sladoled-s-probiotichni-perli': {id: 20, filename: '462cdaba-23cb-4942-b4af-5ec2be20664b.jpeg'},
  'oshte-edna-vkusna-recepta-s-shoko-perli': {id: 19, filename: '19.jpeg'},
  'nay-dobrite-balgarski-probiotici-bactojoy-s-nagrada-za-farma-brand-na-godinata': {id: 18, filename: '18.jpeg'},
  'uchenite-sa-kategorichni-probioticite-mogat-da-ni-predpazyat-ot-covid-19': {id: 17, filename: 'DSC_3258.jpeg'},
  'bactojoy-golyamata-strast-na-balgarskite-znamenitosti': {id: 16, filename: '16.jpeg'},
  'iskash-da-otslabnesh-probioticite-idvat-na-pomosht': {id: 15, filename: '467977356_18041308256232558_8334968229402118200_n.jpeg'},
  'marieta-zaharieva-biznesat-s-probiotici-mi-dade-drug-pogled-kam-sveta-i-horata': {id: 14, filename: '14.jpeg'},
  'misis-balgariya-zadelya-sredstva-ot-prodajbata-na-produktite-bactojoy-za-fondaciya-iskam-bebe': {id: 13, filename: '13.jpeg'},
  'proletna-grija-za-damite-s-bactojoy-femin': {id: 12, filename: '490376877_1208220871309989_5454598412007401818_n.jpeg'},
  'zdravoslovno-vkusno-i-lyubimo-na-decata-shto-e-to-1': {id: 11, filename: '4bc0cb84-0ab0-4c4d-91b1-fd2215b02d39.jpeg'},
  'probioticite-neizmenen-pomoshtnik-po-vreme-na-bremennost-i-sled-rajdane': {id: 9, filename: '499553835_18058696388232558_819644707056660259_n.jpeg'},
  'bakteriii-i-gabichki-probioticite-znayat-kak-da-se-spravyat-s-tyah': {id: 8, filename: '503509621_18060061547232558_5918048799173285911_n.jpeg'},
  'da-vazpitame-polezni-navici-u-deteto-s-bactojoy': {id: 7, filename: '490274889_1204323595033050_1723268445259472679_n.jpeg'},
  'otslabvaneto-lesno-i-priyatno-s-bactojoy': {id: 6, filename: '468021794_18041302901232558_7725248612718612628_n.jpeg'},
  'probiotikat-bactojoy-immune-complex-predpazva-ot-covid-19': {id: 5, filename: '5.jpeg'},
  'pokorihme-germaniya': {id: 4, filename: '468050627_18041306330232558_8050745566428650207_n.jpeg'},
  'fstcheni-barcheta-s-probiotik': {id: 3, filename: 'bugarbiotic_fastacheni_barcheta.jpeg'},
  'barcheta-s-probiotichni-perli': {id: 2, filename: '2.jpeg'},
};

const CDN_BASE = 'https://bulgarbiotic.bg/cdn/img/articles';

/**
 * Client (2026-08-04): "ползвай реалните снимки на блога". The AI-enhanced
 * local covers are kept in the repo but no longer served — flip this to bring
 * them back.
 */
const USE_ENHANCED_ARTICLE_IMAGES = false;

export type ArticleImageMap = Record<string, {id: number; filename: string}>;

/**
 * Covers read live from the admin panel (see `blog-images.server.ts`). Filled
 * on the server before render and again on the client after hydration, exactly
 * like the product marks. Empty until then, so the static map below stays the
 * safety net.
 */
let live: ArticleImageMap = {};

export function setArticleImages(next: ArticleImageMap | null | undefined) {
  if (!next || !Object.keys(next).length) return;
  live = next;
}

/**
 * Build the best available image URL for an article. Priority:
 *  1. The cover the merchant actually uploaded, read live from the admin.
 *  2. The static filename map (last known good, for when the admin call fails).
 *  3. AI-enhanced local PNG — only if `USE_ENHANCED_ARTICLE_IMAGES` is on.
 *  4. null (caller falls back to placeholder).
 */
export function articleImageUrl(
  handle: string | undefined,
  options: {width?: number; height?: number} = {},
): string | null {
  if (!handle) return null;
  // Запис с празно име не е корица, а само реда на статията - тогава важи
  // статичната карта.
  const entry = (live[handle]?.filename ? live[handle] : undefined) ?? ARTICLE_IMAGES[handle];
  if (entry?.filename) {
    const {width = 800, height = 600} = options;
    const filename = encodeURIComponent(entry.filename);
    return `${CDN_BASE}/${entry.id}/${filename}?width=${width}&height=${height}`;
  }
  if (USE_ENHANCED_ARTICLE_IMAGES && ENHANCED_AVAILABLE.has(handle)) {
    return `/images/articles/${handle}.png`;
  }
  return null;
}

/**
 * Decorate a single article so its `image.url` points at the real CDN
 * asset. Idempotent: if the article already has a non-empty `image.url`
 * we leave it alone (in case the storefront API ever fixes the gap).
 */
export function enhanceArticleImage<T extends {handle?: string; image?: any}>(
  article: T,
  options: {width?: number; height?: number} = {},
): T {
  if (!article) return article;
  // If storefront already populated a real URL, prefer it.
  const existingUrl: string | undefined = article.image?.url;
  if (existingUrl && existingUrl.length > 0) return article;
  const url = articleImageUrl(article.handle, options);
  if (!url) return article;
  return {
    ...article,
    image: {
      ...(article.image ?? {}),
      url,
      altText: article.image?.altText ?? '',
      width: options.width ?? 800,
      height: options.height ?? 600,
    },
  };
}

/**
 * Decorate an array of articles (for the blog listing).
 */
export function enhanceArticleImages<T extends {handle?: string; image?: any}>(
  articles: T[],
  options: {width?: number; height?: number} = {},
): T[] {
  return articles.map((a) => enhanceArticleImage(a, options));
}
