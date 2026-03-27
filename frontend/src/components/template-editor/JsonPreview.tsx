type Props = {
  json: string;
};

export function JsonPreview({ json }: Props) {
  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4">
        <p className="text-sm font-medium text-amber-300">Vista previa</p>
        <h3 className="text-xl font-bold text-white">JSON maestro</h3>
      </div>

      <pre className="max-h-[760px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
        <code>{json}</code>
      </pre>
    </aside>
  );
}
