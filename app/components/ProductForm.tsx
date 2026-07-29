import {useNavigate} from 'react-router';
import {useState} from 'react';
import {VariantSelector} from '@cloudcart/nitro-react';
import {AddToCartButton} from './AddToCartButton';
import {OptionSwatch} from './OptionSwatch';
import {realDiscountFor as synthDiscount} from '~/lib/active-discounts';

interface ProductFormProps {
  product: any;
  selectedVariant: any;
}

/** BG legal: 1 € = 1.95583 лв (fixed). */
const EUR_TO_BGN = 1.95583;

const fmtBg = (n: number, currency: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + (currency === 'EUR' ? ' €' : ' лв');

/**
 * Convert any money object {amount, currencyCode} to both EUR + BGN values.
 * Defaults to EUR if currencyCode is missing or unknown.
 */
function bothCurrencies(money: {amount: string; currencyCode?: string} | null | undefined) {
  if (!money) return null;
  const amount = parseFloat(money.amount);
  const currency = (money.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? amount : amount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? amount : amount * EUR_TO_BGN;
  return {eur, bgn};
}

export function ProductForm({product, selectedVariant}: ProductFormProps) {
  const [qty, setQty] = useState(1);
  const variant = selectedVariant;
  const hasMultiplePrices =
    product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount;
  // Sale-source priority:
  //   1) variant.compareAtPrice (variant-specific override)
  //   2) product.discount.msrpPrice (catalogue-wide active discount)
  //   3) synthDiscount() — synthesises the active store-wide promo when
  //      neither of the above is set (CloudCart Storefront API doesn't
  //      surface auto-applied catalogue promos like "−30% за май").
  const productDiscount = (product as any).discount;
  const variantCompare = variant?.compareAtPrice;
  let comparePriceObj: {amount: string; currencyCode?: string} | null =
    variantCompare && parseFloat(variantCompare.amount) > parseFloat(variant?.price?.amount ?? '0')
      ? variantCompare
      : (productDiscount?.msrpPrice ?? null);
  let livePriceObj = variant?.price ?? product.priceRange.minVariantPrice;

  if (!comparePriceObj) {
    const synth = synthDiscount(product, livePriceObj);
    if (synth) {
      comparePriceObj = synth.msrpPrice;
      livePriceObj = synth.salePrice;
    }
  }

  const isOnSale = !!(
    comparePriceObj &&
    livePriceObj &&
    parseFloat(comparePriceObj.amount) > parseFloat(livePriceObj.amount)
  );

  const priceObj = livePriceObj;
  const price = bothCurrencies(priceObj);
  const compare = bothCurrencies(comparePriceObj);
  const discountPct = isOnSale && comparePriceObj && priceObj
    ? (productDiscount?.percent ??
        Math.round((1 - parseFloat(priceObj.amount) / parseFloat(comparePriceObj.amount)) * 100))
    : 0;
  const savings =
    isOnSale && price && compare ? compare.eur - price.eur : 0;

  const maxQty = variant?.quantityAvailable && variant.quantityAvailable < 99
    ? variant.quantityAvailable
    : 99;

  return (
    <div>
      {/* Price block — EUR primary (large italic), BGN secondary, save badge */}
      <div className="bb-pdp-pricerow" aria-live="polite">
        {price && (
          <>
            <span className="bb-pdp-price-eur">
              {hasMultiplePrices && !variant ? 'от ' : ''}{fmtBg(price.eur, 'EUR')}
            </span>
            <span className="bb-pdp-price-bgn">{fmtBg(price.bgn, 'BGN')}</span>
          </>
        )}
        {isOnSale && compare && (
          <span className="bb-pdp-price-old" aria-label={`Стара цена ${fmtBg(compare.eur, 'EUR')} (${fmtBg(compare.bgn, 'BGN')})`}>
            <span className="bb-pdp-price-old-eur">{fmtBg(compare.eur, 'EUR')}</span>
            <span className="bb-pdp-price-old-bgn">{fmtBg(compare.bgn, 'BGN')}</span>
          </span>
        )}
        {isOnSale && discountPct > 0 && (
          <span className="bb-pdp-discount">−{discountPct}%</span>
        )}
      </div>
      {isOnSale && savings > 0 && (
        <div className="bb-pdp-savings">
          Спестяваш <strong>{fmtBg(savings, 'EUR')}</strong>{' '}
          <span className="bb-pdp-savings-bgn">({fmtBg(savings * EUR_TO_BGN, 'BGN')})</span>
        </div>
      )}

      {/* Stock */}
      {variant && <StockIndicator variant={variant} />}

      {/* Variant Selector */}
      <VariantSelector product={product}>
        {(options) =>
          options.map(({name, values}) => {
            const optionMeta = getOptionMeta(product, name);
            const optionType = optionMeta.type;
            const activeValue = values.find((v) => v.isActive);

            return (
              <fieldset key={name} className="border-none p-0 mb-5">
                <legend className="p-0 text-[0.85rem] font-semibold mb-2 text-dark">
                  {name}
                  {activeValue && <span className="font-normal text-gray-500">: {activeValue.value}</span>}
                </legend>

                {optionType === 'select' ? (
                  <OptionSelect name={name} values={values} />
                ) : (
                  <div className={`flex flex-wrap gap-2${optionType === 'color' ? ' gap-2.5' : ''}`}>
                    {values.map((o) => {
                      const valueMeta = optionMeta.values[o.value];
                      return (
                        <OptionSwatch
                          key={o.value}
                          option={o}
                          type={optionType}
                          color={valueMeta?.color}
                          swatchUrl={valueMeta?.swatchUrl}
                        />
                      );
                    })}
                  </div>
                )}
              </fieldset>
            );
          })
        }
      </VariantSelector>

      {/* Quantity + Add to cart row */}
      {variant && (
        <div className="bb-pdp-purchase">
          <div className="bb-pdp-qty" aria-label="Количество">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Намали количеството"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span className="bb-pdp-qty-num">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              aria-label="Увеличи количеството"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <line x1="12" y1="5" x2="12" y2="19" />
              </svg>
            </button>
          </div>

          <AddToCartButton
            merchandiseId={variant.id}
            quantity={qty}
            disabled={!variant.availableForSale}
            className="bb-pdp-add"
          >
            <span className="bb-pdp-add-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="bb-pdp-add-icon" aria-hidden="true">
                <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
                <path d="M9 8a3 3 0 016 0" />
              </svg>
              <span className="bb-pdp-add-label">
                {variant.availableForSale ? 'Купи' : 'Изчерпан'}
              </span>
              {/* Price intentionally NOT shown on the button — client request.
                  The price already lives in the price block above the button;
                  repeating it here is a known bad UX pattern. */}
            </span>
          </AddToCartButton>
        </div>
      )}
    </div>
  );
}

function StockIndicator({variant}: {variant: any}) {
  if (!variant.availableForSale) {
    return (
      <div className="bb-pdp-stock bb-pdp-stock--out">
        <span className="bb-pdp-stock-dot" /> Изчерпан временно
      </div>
    );
  }

  if (variant.currentlyNotInStock) {
    return (
      <div className="bb-pdp-stock bb-pdp-stock--preorder">
        <span className="bb-pdp-stock-dot" /> За предпоръчка · доставка след 3-5 дни
      </div>
    );
  }

  if (variant.quantityAvailable != null && variant.quantityAvailable > 0 && variant.quantityAvailable <= 5) {
    return (
      <div className="bb-pdp-stock bb-pdp-stock--low">
        <span className="bb-pdp-stock-dot" /> Остават само {variant.quantityAvailable} бр.
      </div>
    );
  }

  return (
    <div className="bb-pdp-stock bb-pdp-stock--in">
      <span className="bb-pdp-stock-dot" /> В наличност · доставка за 24-48ч
    </div>
  );
}

function OptionSelect({name, values}: {name: string; values: any[]}) {
  const navigate = useNavigate();
  const activeValue = values.find((v) => v.isActive);

  return (
    <select
      className="form-select w-full max-w-xs py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm text-dark cursor-pointer transition-[border-color] duration-150 hover:border-gray-400 focus:border-dark focus:ring-0"
      value={activeValue?.value ?? ''}
      aria-label={name}
      onChange={(e) => {
        const selected = values.find((v) => v.value === e.target.value);
        if (selected) {
          navigate(selected.to, {replace: true, preventScrollReset: true});
        }
      }}
    >
      {values.map((o) => (
        <option key={o.value} value={o.value} disabled={!o.available}>
          {o.value}{!o.available ? ' (изчерпан)' : ''}
        </option>
      ))}
    </select>
  );
}

function getOptionMeta(product: any, optionName: string) {
  const values: Record<string, {color?: string; swatchUrl?: string}> = {};
  let type: string | undefined;

  for (const variant of product.variants.nodes) {
    for (const so of variant.selectedOptions) {
      if (so.name !== optionName) continue;
      if (so.type && !type) type = so.type;
      if (!values[so.value]) {
        values[so.value] = {
          color: so.color || undefined,
          swatchUrl: so.swatchUrl || undefined,
        };
      }
    }
  }

  return {type, values};
}
