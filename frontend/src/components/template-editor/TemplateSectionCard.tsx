import type { CategoryRecord, EditorTemplateSection, EditorTemplateItem } from "./types";
import { TemplateItemCard } from "./TemplateItemCard";

type Props = {
  section: EditorTemplateSection;
  sectionIndex: number;
  categories: CategoryRecord[];
  onTitleChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onRemoveSection: () => void;
  onAddItem: () => void;
  onUpdateItem: (
    itemIndex: number,
    updater: (item: EditorTemplateItem) => EditorTemplateItem
  ) => void;
  onRemoveItem: (itemIndex: number) => void;
  onAddOption: (itemIndex: number) => void;
};

export function TemplateSectionCard({
  section,
  sectionIndex,
  categories,
  onTitleChange,
  onRoleChange,
  onRemoveSection,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onAddOption,
}: Props) {
  return (
    <article
      key={`${section.section_id}-${sectionIndex}`}
      className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4"
    >
      {/* Section header */}
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr_auto]">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Título de sección
          </label>
          <input
            className="touch-input"
            onChange={(e) => onTitleChange(e.target.value)}
            value={section.section_title}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Rol sugerido
          </label>
          <input
            className="touch-input"
            onChange={(e) => onRoleChange(e.target.value)}
            value={section.assigned_role}
          />
        </div>
        <div className="flex items-end">
          <button
            className="touch-button w-auto min-w-32 border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
            onClick={onRemoveSection}
            type="button"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="mt-4 space-y-3">
        <p className="text-xs text-slate-500">
          Los identificadores internos de sección e ítems se generan
          automáticamente.
        </p>

        {section.items.map((item, itemIndex) => (
          <TemplateItemCard
            key={`${item.item_id}-${itemIndex}`}
            item={item}
            itemIndex={itemIndex}
            categories={categories}
            onLabelChange={(value) =>
              onUpdateItem(itemIndex, (current) => ({
                ...current,
                label: value,
              }))
            }
            onMaxScoreChange={(value) =>
              onUpdateItem(itemIndex, (current) => ({
                ...current,
                max_score: value as number,
              }))
            }
            onRemove={() => onRemoveItem(itemIndex)}
            onAddOption={() => onAddOption(itemIndex)}
            onOptionLabelChange={(optionIndex, value) =>
              onUpdateItem(itemIndex, (current) => ({
                ...current,
                categorization_options: current.categorization_options.map(
                  (opt, idx) =>
                    idx === optionIndex ? { ...opt, label: value } : opt
                ),
              }))
            }
            onOptionCategoryChange={(optionIndex, catId, catName, level) =>
              onUpdateItem(itemIndex, (current) => ({
                ...current,
                categorization_options: current.categorization_options.map(
                  (opt, idx) =>
                    idx === optionIndex
                      ? {
                          ...opt,
                          category_id: catId,
                          category_name: catName,
                          triggers_level: level,
                        }
                      : opt
                ),
              }))
            }
            onRemoveOption={(optionIndex) =>
              onUpdateItem(itemIndex, (current) => ({
                ...current,
                categorization_options: current.categorization_options.filter(
                  (_, idx) => idx !== optionIndex
                ),
              }))
            }
          />
        ))}

        <button
          className="touch-button w-auto min-w-40 border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-100"
          onClick={onAddItem}
          type="button"
        >
          + Añadir ítem
        </button>
      </div>
    </article>
  );
}
