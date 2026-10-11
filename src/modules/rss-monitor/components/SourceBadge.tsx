const sourceColors = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-amber-500',
];

const sourceBorderColors = [
  'border-l-blue-500',
  'border-l-purple-500',
  'border-l-teal-500',
  'border-l-orange-500',
  'border-l-pink-500',
  'border-l-indigo-500',
  'border-l-emerald-500',
  'border-l-rose-500',
  'border-l-cyan-500',
  'border-l-amber-500',
];

export function getSourceColor(abbreviation: string): string {
  let hash = 0;
  for (let i = 0; i < abbreviation.length; i++) {
    hash = abbreviation.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % sourceColors.length;
  return sourceColors[index];
}

export function getSourceBorderColor(abbreviation: string): string {
  let hash = 0;
  for (let i = 0; i < abbreviation.length; i++) {
    hash = abbreviation.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % sourceBorderColors.length;
  return sourceBorderColors[index];
}

interface SourceBadgeProps {
  abbreviation: string;
}

export function SourceBadge({ abbreviation }: SourceBadgeProps) {
  const colorClass = getSourceColor(abbreviation);

  return (
    <div
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${colorClass}`}
    >
      {abbreviation}
    </div>
  );
}
