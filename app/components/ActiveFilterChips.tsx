import {useSearchParams, useNavigate} from 'react-router';
import type {Filter} from '@cloudcart/nitro';

interface Props {
  filters?: Filter[];
}

/** URL params that don't represent filters (pagination/sort) — skip them. */
const NON_FILTER_KEYS = new Set(['sort', 'cursor', 'direction', 'page', 'q']);

type ActiveChip = {
  key: string;
  value: string;
  label: string;
};

/** Try to find a human-readable label for a given URL param + value. */
function labelFor(filters: Filter[], param: string, value: string): string {
  // Price range — handled separately
  if (param === 'minPrice') return `Цена от ${value} лв`;
  if (param === 'maxPrice') return `Цена до ${value} лв`;

  // Brand booleans
  if (param === 'onSale') return 'Промоция';
  if (param === 'isNew') return 'Ново';
  if (param === 'isFeatured') return 'Препоръчано';
  if (param === 'available') return 'В наличност';

  // Variant options / properties — strip prefix
  if (param.startsWith('option_')) return `${param.slice(7)}: ${value}`;
  if (param.startsWith('prop_')) return `${param.slice(5)}: ${value}`;

  // Search facets — look up label by matching FilterValue input JSON
  for (const f of filters) {
    for (const v of f.values) {
      try {
        const parsed = JSON.parse(v.input);
        if (parsed.productVendor === value && param === 'vendor') return v.label;
        if (parsed.tag === value && param === 'tag') return v.label;
        if (parsed.category?.id === value && param === 'category') return v.label;
      } catch {
        /* ignore */
      }
    }
  }

  return value;
}

export function ActiveFilterChips({filters = []}: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const chips: ActiveChip[] = [];
  for (const [key, value] of searchParams) {
    if (NON_FILTER_KEYS.has(key) || !value) continue;
    chips.push({key, value, label: labelFor(filters, key, value)});
  }

  if (chips.length === 0) return null;

  function removeChip(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    const remaining = params.getAll(key).filter((v) => v !== value);
    params.delete(key);
    for (const v of remaining) params.append(key, v);
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  function clearAll() {
    const params = new URLSearchParams();
    // Preserve only sort
    const sort = searchParams.get('sort');
    if (sort) params.set('sort', sort);
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  return (
    <div className="bb-listing-chips" role="region" aria-label="Активни филтри">
      <span className="bb-listing-chips-label">Филтри:</span>
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value}`}
          type="button"
          className="bb-listing-chip"
          onClick={() => removeChip(chip.key, chip.value)}
          aria-label={`Премахни филтър ${chip.label}`}
        >
          <span>{chip.label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ))}
      <button type="button" className="bb-listing-chip-clear" onClick={clearAll}>
        Изчисти всички
      </button>
    </div>
  );
}
