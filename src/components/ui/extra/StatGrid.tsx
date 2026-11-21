import { MetricCard, type MetricCardProps } from './MetricCard';

export interface StatGridItem extends MetricCardProps {
  id: string;
}

export interface StatGridProps {
  label: string;
  items: readonly StatGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const columnClasses: Record<NonNullable<StatGridProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

export function StatGrid({ label, items, columns = 2, className = '' }: StatGridProps) {
  return (
    <div
      role="list"
      aria-label={label}
      className={`grid grid-cols-1 gap-2 ${columnClasses[columns]} ${className}`}
    >
      {items.map(({ id, ...item }) => (
        <div role="listitem" key={id} className="min-w-0">
          <MetricCard {...item} />
        </div>
      ))}
    </div>
  );
}
