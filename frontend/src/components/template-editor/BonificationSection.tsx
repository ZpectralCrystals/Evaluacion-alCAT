import type { EditorBonificationItem } from "./types";

type Props = {
  items: EditorBonificationItem[];
  onAdd: () => void;
  onUpdateLabel: (itemIndex: number, value: string) => void;
  onUpdateMaxScore: (itemIndex: number, value: number | "") => void;
  onRemove: (itemIndex: number) => void;
};

export function BonificationSection({
  items,
  onAdd,
  onUpdateLabel,
  onUpdateMaxScore,
  onRemove,
}: Props) {
  return (
    <article className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-200">Bonificaciones</p>
          <h3 className="text-xl font-bold text-white">
            Sección exclusiva del principal
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            Siempre se asigna automáticamente al juez principal y no necesita
            seleccionarse en usuarios.
          </p>
        </div>

        <button
          className="touch-button w-auto min-w-40 bg-amber-500 px-4 py-3 text-sm text-slate-950"
          onClick={onAdd}
          type="button"
        >
          + Añadir bonificación
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-4 text-sm text-slate-400">
            Aún no hay bonificaciones configuradas.
          </div>
        ) : (
          items.map((item, itemIndex) => (
            <div
              key={`${item.item_id}-${itemIndex}`}
              className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[1fr_140px_auto]"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Bonificación
                </label>
                <input
                  className="touch-input"
                  onChange={(e) => onUpdateLabel(itemIndex, e.target.value)}
                  placeholder="Etiqueta de bonificación"
                  value={item.label}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Puntaje máx.
                </label>
                <input
                  className="touch-input"
                  min={0}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    onUpdateMaxScore(
                      itemIndex,
                      rawValue === "" ? "" : Math.max(0, Number(rawValue))
                    );
                  }}
                  type="number"
                  value={item.max_score}
                />
              </div>
              <button
                className="touch-button w-auto min-w-32 border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                onClick={() => onRemove(itemIndex)}
                type="button"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
