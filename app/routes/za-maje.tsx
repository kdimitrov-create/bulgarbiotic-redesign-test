import {useLoaderData} from 'react-router';
import type {Route} from './+types/za-maje';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import type {Product} from '@cloudcart/nitro';
import {enhanceProductImages} from '~/lib/product-images';
import {ProductCard} from '~/components/ProductCard';

/**
 * "За мъже" category (client Path B placeholder).
 *
 * There is no CloudCart "За мъже" collection yet, so this curated route lists
 * the men's products by handle. Add handles here (or replace with a real
 * CloudCart collection + a /category link) once the client provides more.
 */
const MEN_HANDLES = ['paket-otslabvane-za-maje'];

export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'За мъже | Bactology',
    description:
      'Пробиотични формули, съобразени с мъжкото здраве - метаболизъм, енергия и добро храносмилане.',
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const raw = await Promise.all(
    MEN_HANDLES.map((h) =>
      ctx.storefront.getProduct(h).catch((error: Error) => {
        console.error(`За мъже: failed to load ${h}:`, error.message);
        return null;
      }),
    ),
  );
  const products = raw
    .filter((p): p is Product => p !== null)
    .map((p) => enhanceProductImages(p) as Product);
  return {products};
}

export default function ZaMajePage() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <div className="bb-listing">
      <header className="bb-listing-hero">
        <div className="bb-listing-hero-text">
          <span className="bb-listing-hero-tag">За мъже</span>
          <h1 className="bb-listing-hero-h1">За мъже</h1>
          <p className="bb-listing-hero-sub">
            Пробиотични формули, съобразени с мъжкото здраве - метаболизъм, енергия и добро
            храносмилане.
          </p>
        </div>
        <div className="bb-listing-hero-count" aria-label={`${products.length} продукта`}>
          <span className="bb-listing-hero-count-num">{products.length}</span>
          <span className="bb-listing-hero-count-label">
            {products.length === 1 ? 'продукт' : 'продукта'}
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 md:px-9 py-8 md:py-12">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-16">
            Скоро ще добавим продукти в тази категория.
          </p>
        )}
      </div>
    </div>
  );
}
