import type { NameCount } from '../types';

interface ChipGroupProps {
  title: string;
  items: NameCount[];
  activeValues: Set<string>;
  onToggle: (value: string) => void;
  /** Maps an item to the value stored in activeValues / passed to onToggle. Defaults to item.name. */
  getValue?: (item: NameCount) => string;
}

export function ChipGroup({ title, items, activeValues, onToggle, getValue }: ChipGroupProps) {
  if (items.length === 0) return null;
  const resolveValue = getValue ?? ((item: NameCount) => item.name);

  return (
    <div className="chip-group">
      <div className="chip-group-title">{title}</div>
      <div className="chip-row">
        {items.map((item) => {
          const value = resolveValue(item);
          return (
            <button
              key={value}
              type="button"
              className={`chip${activeValues.has(value) ? ' active' : ''}`}
              onClick={() => onToggle(value)}
            >
              {item.name} ({item.count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
