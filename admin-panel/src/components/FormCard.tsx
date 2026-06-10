interface FormCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormCard({ title, description, children }: FormCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      <div className="space-y-4 px-5 py-4">
        {children}
      </div>
    </div>
  );
}
