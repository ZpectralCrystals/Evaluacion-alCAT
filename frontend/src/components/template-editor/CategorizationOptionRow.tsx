import type { CategorizationOption } from "../../lib/judging";
import type { CategoryRecord } from "./types";

type Props = {
  option: CategorizationOption;
  optionIndex: number;
  itemId: string;
  categories: CategoryRecord[];
  onLabelChange: (value: string) => void;
  onCategoryChange: (categoryId: number | null, categoryName: string | null, level: number) => void;
  onRemove: () => void;
};

export function CategorizationOptionRow({
  option,
  optionIndex,
  itemId,
  categories,
  onLabelChange,
  onCategoryChange,
  onRemove,
}: Props) {
  return (
    <div
      key={`${itemId}-option-${optionIndex}`}
      className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 md:grid-cols-[minmax(250px,1fr)_280px_140px_auto]"
    >
      {/* Label siempre visible */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-xs font-medium text-slate-400">Etiqueta de la opción</span>
        <input
          className="touch-input w-full min-w-[200px]"
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Ej. Modificación completa / Pro"
          value={option.label}
        />
      </div>

      {/* Label siempre visible */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-xs font-medium text-slate-400">Categoría destino</span>
        <select
          className="touch-input w-full min-w-[200px]"
          onChange={(e) => {
            const selectedCategory = categories.find(
              (cat) => String(cat.id) === e.target.value
            );
            onCategoryChange(
              selectedCategory?.id ?? null,
              selectedCategory?.nombre ?? null,
              selectedCategory?.level ?? option.triggers_level
            );
          }}
          value={option.category_id ?? ""}
        >
          <option value="">Selecciona categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nombre} (Nivel {category.level})
            </option>
          ))}
        </select>
      </div>

      {/* Label siempre visible */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-xs font-medium text-slate-400">Nivel</span>
        <div className="flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          Nivel {option.triggers_level}
        </div>
      </div>

      <div className="flex items-end">
        <button
          className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:w-auto"
          onClick={onRemove}
          type="button"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}
