import type { CategoryRecord, EditorTemplateItem } from "./types";
import { CategorizationOptionRow } from "./CategorizationOptionRow";

type Props = {
  item: EditorTemplateItem;
  itemIndex: number;
  categories: CategoryRecord[];
  showMaxScore?: boolean;
  onLabelChange: (value: string) => void;
  onMaxScoreChange: (value: number | "") => void;
  onRemove: () => void;
  onAddOption: () => void;
  onOptionLabelChange: (optionIndex: number, value: string) => void;
  onOptionCategoryChange: (
    optionIndex: number,
    categoryId: number | null,
    categoryName: string | null,
    level: number
  ) => void;
  onRemoveOption: (optionIndex: number) => void;
};

export function TemplateItemCard({
  item,
  itemIndex,
  categories,
  showMaxScore = true,
  onLabelChange,
  onMaxScoreChange,
  onRemove,
  onAddOption,
  onOptionLabelChange,
  onOptionCategoryChange,
  onRemoveOption,
}: Props) {
  return (
    <div
      key={`${item.item_id}-${itemIndex}`}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
    >
      <div className={`grid gap-4 ${showMaxScore ? "lg:grid-cols-[1.2fr_0.55fr_auto]" : "lg:grid-cols-[1fr_auto]"}`}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Ítem
          </label>
          <input
            className="touch-input"
            onChange={(e) => onLabelChange(e.target.value)}
            value={item.label}
          />
        </div>

        {showMaxScore && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Puntaje máx.
            </label>
            <input
              className="touch-input"
              min={0}
              onChange={(e) => {
                const rawValue = e.target.value;
                onMaxScoreChange(
                  rawValue === "" ? "" : Math.max(0, Number(rawValue))
                );
              }}
              type="number"
              value={item.max_score}
            />
          </div>
        )}

        <div className="flex items-end">
          <button
            className="touch-button w-auto min-w-32 border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
            onClick={onRemove}
            type="button"
          >
            Quitar
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">
            Opciones de recategorización
          </p>
          <button
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
            onClick={onAddOption}
            type="button"
          >
            + Añadir opción
          </button>
        </div>

        {item.categorization_options.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-4 text-sm text-slate-400">
            {showMaxScore
              ? "Este ítem solo sumará puntaje. Si quieres que también recategorice, añade opciones y elige la categoría real creada para esta modalidad."
              : "Este ítem todavía no recategoriza. Añade opciones y elige la categoría real creada para esta modalidad."}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mb-2 grid grid-cols-[minmax(250px,1fr)_280px_140px_auto] gap-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2">
              <span className="block whitespace-nowrap text-xs font-semibold text-slate-200 uppercase tracking-wider">Etiqueta de la opción</span>
              <span className="block whitespace-nowrap text-xs font-semibold text-slate-200 uppercase tracking-wider">Categoría destino</span>
              <span className="block whitespace-nowrap text-xs font-semibold text-slate-200 uppercase tracking-wider">Nivel</span>
              <span className="block"></span>
            </div>
            {item.categorization_options.map((option, optionIndex) => (
              <CategorizationOptionRow
                key={`${item.item_id}-option-${optionIndex}`}
                option={option}
                optionIndex={optionIndex}
                itemId={item.item_id}
                categories={categories}
                onLabelChange={(value) => onOptionLabelChange(optionIndex, value)}
                onCategoryChange={(catId, catName, level) =>
                  onOptionCategoryChange(optionIndex, catId, catName, level)
                }
                onRemove={() => onRemoveOption(optionIndex)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
