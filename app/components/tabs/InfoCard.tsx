interface InfoItem {
  label: string;
  value: string;
}

interface InfoCardProps {
  title: string;
  description: React.ReactNode;
  items: InfoItem[];
}

export default function InfoCard({ title, description, items }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        {title}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2"
          >
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {item.label}
            </span>
            <br />
            {item.value}
          </div>
        ))}
      </div>
    </div>
  );
}
