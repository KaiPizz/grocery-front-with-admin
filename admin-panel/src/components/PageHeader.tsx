interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6 border-b border-slate-200 pb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
