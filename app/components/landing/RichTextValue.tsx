import {Fragment, type ReactNode} from 'react';

/**
 * Поле „Форматиран текст“ (`rich_text_field`) от метаобект.
 *
 * Админът пази текста като дърво в JSON: root → paragraph / heading / list →
 * text, с bold и italic върху текста и link около него. В @cloudcart/nitro-react
 * 0.8 няма компонент за него. В Nitrogen 2.3 има - `<MetafieldRichText>`, и при
 * прехода (TASKS.md, етап 2) този файл се заменя с него.
 *
 * Админът не допуска нов ред вътре в абзац, затова заглавие на два реда се пише
 * като два абзаца. `RichInline` ги рисува в един елемент, с <br> между тях.
 */

type RichNode = {
  type: string;
  value?: string;
  bold?: boolean;
  italic?: boolean;
  url?: string;
  title?: string;
  level?: number;
  listType?: 'ordered' | 'unordered';
  children?: RichNode[];
};

function parse(value: string | null | undefined): RichNode | null {
  if (!value) return null;
  try {
    const root = JSON.parse(value) as RichNode;
    return root && Array.isArray(root.children) ? root : null;
  } catch {
    return null;
  }
}

/** Връзка към този магазин става относителна, за да остане в приложението. */
export function localHref(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'bulgarbiotic.bg' || u.hostname === 'www.bulgarbiotic.bg') {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    // Относителен адрес - оставя се както е.
  }
  return url;
}

function inline(nodes: RichNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, i) => {
    if (node.type === 'text') {
      let out: ReactNode = node.value ?? '';
      if (node.italic) out = <em>{out}</em>;
      if (node.bold) out = <b>{out}</b>;
      return <Fragment key={i}>{out}</Fragment>;
    }
    if (node.type === 'link' && node.url) {
      return (
        <a key={i} href={localHref(node.url)} title={node.title}>
          {inline(node.children)}
        </a>
      );
    }
    return <Fragment key={i}>{inline(node.children)}</Fragment>;
  });
}

/** Абзаците на полето като отделни елементи - <p className=…>, заглавия, списъци. */
export function RichBlocks({value, className}: {value?: string | null; className?: string}) {
  const root = parse(value);
  if (!root) return null;
  return (
    <>
      {root.children!.map((node, i) => {
        if (node.type === 'heading') {
          const Tag = `h${Math.min(6, Math.max(1, node.level ?? 2))}` as 'h2';
          return <Tag key={i}>{inline(node.children)}</Tag>;
        }
        if (node.type === 'list') {
          const Tag = node.listType === 'ordered' ? 'ol' : 'ul';
          return (
            <Tag key={i}>
              {(node.children ?? []).map((item, j) => (
                <li key={j}>{inline(item.children)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className={className}>
            {inline(node.children)}
          </p>
        );
      })}
    </>
  );
}

/** Всички абзаци в един елемент, с <br> между тях - за заглавия. */
export function RichInline({value}: {value?: string | null}) {
  const root = parse(value);
  if (!root) return null;
  return (
    <>
      {root.children!.map((node, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inline(node.children)}
        </Fragment>
      ))}
    </>
  );
}
