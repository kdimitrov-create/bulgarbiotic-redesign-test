import {Link} from 'react-router';

interface BreadcrumbItem {
  title: string;
  to?: string;
}

/**
 * Breadcrumb nav.
 *
 * Mobile: single-line, horizontally scrollable if needed; the LAST item
 * (current page) truncates with ellipsis so a long product name doesn't
 * push the whole trail to 3 lines. Schema.org markup preserved.
 */
export function Breadcrumbs({items}: {items: BreadcrumbItem[]}) {
  return (
    <nav className="text-xs text-gray-400 mb-6 -mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Breadcrumb">
      <ol
        className="flex items-center list-none whitespace-nowrap min-w-0"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <li
          className="shrink-0"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <Link
            to="/"
            itemProp="item"
            className="text-gray-400 transition-colors duration-150 hover:text-dark hover:no-underline"
          >
            <span itemProp="name">Начало</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={i}
              className={`flex items-center min-w-0 ${isLast ? 'flex-1' : 'shrink-0'}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <span className="mx-2 text-gray-300 shrink-0" aria-hidden="true">/</span>
              {item.to ? (
                <Link
                  to={item.to}
                  itemProp="item"
                  className="text-gray-400 transition-colors duration-150 hover:text-dark hover:no-underline"
                >
                  <span itemProp="name">{item.title}</span>
                </Link>
              ) : (
                <span
                  className={`text-gray-600 ${isLast ? 'truncate min-w-0 max-w-[60vw] sm:max-w-none' : ''}`}
                  itemProp="name"
                  title={isLast ? item.title : undefined}
                >
                  {item.title}
                </span>
              )}
              <meta itemProp="position" content={String(i + 2)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
