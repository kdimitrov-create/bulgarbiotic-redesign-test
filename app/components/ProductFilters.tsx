import {useState} from 'react';
import {useSearchParams, useNavigate} from 'react-router';
import type {Filter} from '@cloudcart/nitro';
import {filterInputToParam, isFilterActive} from '~/lib/filters';
import {ChevronDownIcon} from '@heroicons/react/20/solid';

interface ProductFiltersProps {
  filters?: Filter[];
  totalCount?: number | null;
  /** Hide the sort dropdown — used when sort lives in a toolbar above the grid. */
  hideSort?: boolean;
}

export function ProductFilters({filters = [], totalCount, hideSort = false}: ProductFiltersProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentSort = searchParams.get('sort') ?? '';
  const currentMinPrice = searchParams.get('minPrice') ?? '';
  const currentMaxPrice = searchParams.get('maxPrice') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  function toggleFilterValue(input: string) {
    const param = filterInputToParam(input);
    if (!param) return;

    const params = new URLSearchParams(searchParams);
    const existing = params.getAll(param.key);

    if (existing.includes(param.value)) {
      params.delete(param.key);
      for (const v of existing) {
        if (v !== param.value) params.append(param.key, v);
      }
    } else {
      params.append(param.key, param.value);
    }
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  function clearAll() {
    navigate('?', {preventScrollReset: true});
  }

  const hasActiveFilters = Array.from(searchParams.keys()).some(
    (k) => !['sort', 'cursor', 'direction', 'page', 'q'].includes(k),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Sort (hidden when rendered in toolbar separately) */}
      {!hideSort && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500 flex items-center gap-1.5">
            Сортирай по
          </label>
          <select
            className="form-select w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm text-[var(--color-ink)] cursor-pointer transition-colors hover:border-gray-400 focus:border-[var(--color-brand-pink)] focus:ring-0"
            value={currentSort}
            onChange={(e) => updateParam('sort', e.target.value)}
          >
            <option value="">Препоръчани</option>
            <option value="price-asc">Цена: ниска → висока</option>
            <option value="price-desc">Цена: висока → ниска</option>
            <option value="title-asc">Име: А → Я</option>
            <option value="title-desc">Име: Я → А</option>
            <option value="created-desc">Най-нови</option>
            <option value="best-selling">Най-продавани</option>
          </select>
        </div>
      )}

      {totalCount != null && (
        <div className="text-xs text-gray-500 pb-1 border-b border-gray-100">
          {totalCount} {totalCount === 1 ? 'продукт' : 'продукта'}
        </div>
      )}

      {/* Dynamic filters from API */}
      {filters.map((filter) => (
        <FilterGroup
          key={filter.id}
          filter={filter}
          searchParams={searchParams}
          onToggle={toggleFilterValue}
          onUpdateParam={updateParam}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />
      ))}

      {hasActiveFilters && (
        <button
          className="bg-transparent border-none text-[var(--color-brand-pink)] text-xs font-semibold cursor-pointer underline text-left p-0 font-sans"
          onClick={clearAll}
        >
          Изчисти всички филтри
        </button>
      )}
    </div>
  );
}

function FilterGroup({
  filter,
  searchParams,
  onToggle,
  onUpdateParam,
  currentMinPrice,
  currentMaxPrice,
}: {
  filter: Filter;
  searchParams: URLSearchParams;
  onToggle: (input: string) => void;
  onUpdateParam: (key: string, value: string) => void;
  currentMinPrice: string;
  currentMaxPrice: string;
}) {
  switch (filter.type) {
    case 'LIST':
      return <FilterListGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    case 'SWATCH_COLOR':
      return <FilterSwatchColorGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    case 'SWATCH_IMAGE':
      return <FilterSwatchImageGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    case 'PRICE_RANGE':
      return (
        <FilterPriceRangeGroup
          filter={filter}
          onUpdateParam={onUpdateParam}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />
      );
    case 'RANGE':
      return <FilterRangeGroup filter={filter} onUpdateParam={onUpdateParam} />;
    case 'BOOLEAN':
      return <FilterBooleanGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    default:
      return null;
  }
}

function FilterListGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  const VISIBLE_COUNT = 7;
  const [expanded, setExpanded] = useState(false);
  const hasMore = filter.values.length > VISIBLE_COUNT;
  const visibleValues = expanded ? filter.values : filter.values.slice(0, VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500 flex items-center gap-1.5">
        {filter.label}
      </label>
      <div className="flex flex-col gap-1">
        {visibleValues.map((v) => (
          <label
            key={v.id}
            className="flex items-center gap-2 text-[13px] cursor-pointer py-1 px-0 rounded transition-colors hover:bg-gray-50 [&_input]:shrink-0"
          >
            <input
              type="checkbox"
              className="form-checkbox size-3.5 rounded border-gray-300 text-[var(--color-brand-pink)] focus:ring-[var(--color-brand-pink)] focus:ring-offset-0"
              checked={isFilterActive(searchParams, v.input)}
              onChange={() => onToggle(v.input)}
            />
            <span className="flex-1 text-[var(--color-ink)] truncate">{v.label}</span>
            <span className="text-xs text-gray-400 shrink-0">{v.count}</span>
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[var(--color-brand-pink)] transition-colors p-0 bg-transparent border-none cursor-pointer font-sans"
        >
          <ChevronDownIcon className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Покажи по-малко' : `Покажи всички ${filter.values.length}`}
        </button>
      )}
    </div>
  );
}

function FilterSwatchColorGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex flex-wrap gap-1.5">
        {filter.values.map((v) => (
          <button
            key={v.id}
            className={`size-7 rounded-full border-2 cursor-pointer p-0 transition-[border-color,box-shadow] duration-150 hover:border-gray-400 ${isFilterActive(searchParams, v.input) ? 'border-[var(--color-ink)] shadow-[0_0_0_2px_var(--color-cream-1),0_0_0_4px_var(--color-ink)]' : 'border-gray-200'}`}
            title={`${v.label} (${v.count})`}
            onClick={() => onToggle(v.input)}
            style={{backgroundColor: v.swatchColor ?? '#ccc'}}
          />
        ))}
      </div>
    </div>
  );
}

function FilterSwatchImageGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex flex-wrap gap-1.5">
        {filter.values.map((v) => (
          <button
            key={v.id}
            className={`size-9 rounded-md border-2 cursor-pointer p-0.5 bg-white transition-[border-color] duration-150 overflow-hidden hover:border-gray-400 ${isFilterActive(searchParams, v.input) ? 'border-[var(--color-ink)]' : 'border-gray-200'}`}
            title={`${v.label} (${v.count})`}
            onClick={() => onToggle(v.input)}
          >
            {v.swatchImage && <img src={v.swatchImage} alt={v.label} className="w-full h-full object-cover rounded" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterPriceRangeGroup({filter, onUpdateParam, currentMinPrice, currentMaxPrice}: {
  filter: Filter;
  onUpdateParam: (key: string, value: string) => void;
  currentMinPrice: string;
  currentMaxPrice: string;
}) {
  const min = filter.minValue?.value ?? 0;
  const max = filter.maxValue?.value ?? 0;
  const currency = filter.minValue?.currencyCode ?? '';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500 flex items-center gap-1.5">
        Цена
        {currency && <span className="font-normal normal-case text-gray-400"> ({currency})</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          key={`min-${currentMinPrice}`}
          type="number"
          className="form-input w-full py-2 px-2.5 border-[1.5px] border-gray-200 rounded-md text-[13px] focus:border-[var(--color-brand-pink)] focus:ring-0"
          placeholder={String(min)}
          defaultValue={currentMinPrice}
          onBlur={(e) => onUpdateParam('minPrice', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onUpdateParam('minPrice', (e.target as HTMLInputElement).value)}
          min={min}
          max={max}
        />
        <span className="text-gray-300 shrink-0">—</span>
        <input
          key={`max-${currentMaxPrice}`}
          type="number"
          className="form-input w-full py-2 px-2.5 border-[1.5px] border-gray-200 rounded-md text-[13px] focus:border-[var(--color-brand-pink)] focus:ring-0"
          placeholder={String(max)}
          defaultValue={currentMaxPrice}
          onBlur={(e) => onUpdateParam('maxPrice', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onUpdateParam('maxPrice', (e.target as HTMLInputElement).value)}
          min={min}
          max={max}
        />
      </div>
    </div>
  );
}

function FilterRangeGroup({filter, onUpdateParam}: {filter: Filter; onUpdateParam: (key: string, value: string) => void}) {
  const min = filter.minValue?.value ?? 0;
  const max = filter.maxValue?.value ?? 0;
  const step = filter.rangeStep ?? 1;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0 min-w-8 text-center">{min}</span>
        <input
          type="range"
          className="form-range flex-1 accent-[var(--color-brand-pink)]"
          min={min}
          max={max}
          step={step}
          defaultValue={max}
        />
        <span className="text-xs text-gray-500 shrink-0 min-w-8 text-center">{max}</span>
      </div>
    </div>
  );
}

function FilterBooleanGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  const trueValue = filter.values.find((v) => {
    try {
      const parsed = JSON.parse(v.input);
      return parsed.onSale === true || parsed.isNew === true || parsed.isFeatured === true;
    } catch {
      return false;
    }
  });

  if (!trueValue) return null;

  // Translate built-in boolean filter labels to BG
  const labelMap: Record<string, string> = {
    'On Sale': 'Промоция',
    'New': 'Ново',
    'Featured': 'Препоръчано',
    'Available': 'В наличност',
  };
  const label = labelMap[filter.label] || filter.label;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-[13px] cursor-pointer py-1">
        <input
          type="checkbox"
          className="form-checkbox size-3.5 rounded border-gray-300 text-[var(--color-brand-pink)] focus:ring-[var(--color-brand-pink)] focus:ring-offset-0 shrink-0"
          checked={isFilterActive(searchParams, trueValue.input)}
          onChange={() => onToggle(trueValue.input)}
        />
        <span className="flex-1 text-[var(--color-ink)] font-medium">{label}</span>
        <span className="text-xs text-gray-400 shrink-0">{trueValue.count}</span>
      </label>
    </div>
  );
}
