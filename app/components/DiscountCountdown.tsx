import {useEffect, useState} from 'react';
import {markDiscount} from '~/lib/product-marks';

/**
 * Таймерът „промоцията свършва след…", такъв какъвто търговецът го е включил.
 *
 * В панела всяка отстъпка има два отделни ключа - за списъците и за
 * продуктовата страница. Storefront API-то ги връща като `countdownOnListing`
 * и `countdownOnDetail`, при това и в списъчната заявка (проверено 2026-08-12),
 * тоест картата в категорията може да ги спазва точно както продуктовата
 * страница. Дотук и двата се пренебрегваха: включеше ли ги търговецът, на
 * сайта не се появяваше нищо.
 *
 * Брои се до `endDate` на отстъпката. Няма ли край, няма и таймер - това е
 * безсрочна промоция и всяко число, което бихме показали, е измислено.
 * Панелът има и втори режим, „обратно броене от N минути" на посетител
 * (`countdownMinutes` в Admin API-то). Той не се рисува тук нарочно: това е
 * измислена спешност, не край на промоция, и не е поискан.
 *
 * Изчислява се в браузъра, а не на сървъра: остатъкът зависи от часовника на
 * посетителя и се променя всяка секунда. До първото пресмятане не се рисува
 * нищо, за да няма разминаване между сървърния и клиентския HTML.
 */
export function DiscountCountdown({
  product,
  surface,
  className,
}: {
  product: any;
  /** Кой ключ от панела решава: `listing` за карта, `detail` за продуктовата страница. */
  surface: 'listing' | 'detail';
  className?: string;
}) {
  const discount = markDiscount(product);
  const enabled =
    surface === 'listing' ? discount?.countdownOnListing : discount?.countdownOnDetail;
  const endsAt = parseEnd(discount?.endDate);

  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || endsAt === null) return;
    const tick = () => setLeft(endsAt - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [enabled, endsAt]);

  if (!enabled || endsAt === null || left === null || left <= 0) return null;

  return (
    <span className={`bb-cdown${className ? ` ${className}` : ''}`} aria-live="off">
      <span className="bb-cdown-label">Промоцията свършва след</span>
      <span className="bb-cdown-time">{format(left)}</span>
      <style>{`
        .bb-cdown {
          display: inline-flex; align-items: baseline; gap: 6px;
          font-size: 12.5px; line-height: 1.3;
          color: var(--color-brand-pink);
        }
        .bb-cdown-label { color: rgba(10, 37, 64, 0.62); }
        .bb-cdown-time {
          font-weight: 800;
          /* Табличните цифри спират подскачането на ширината всяка секунда. */
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </span>
  );
}

/**
 * `endDate` идва като „2026-08-13 03:00:00" - без часова зона и с интервал
 * вместо „T". Safari отказва да разчете точно този вид, затова се преобразува
 * ръчно. Приема се за местно време, каквото е и в панела.
 */
function parseEnd(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const [, y, mo, d, h, mi, sec] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +sec).getTime();
  }
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : null;
}

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  // Над едно денонощие секундите не носят нищо освен шум.
  if (days > 0) return `${days} д. ${pad(hours)}:${pad(minutes)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
