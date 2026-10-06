interface NavigationCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  badge?: string;
  variant?: 'default' | 'danger' | 'warning';
}

export function NavigationCard({
  title,
  description,
  icon,
  onClick,
  badge,
  variant = 'default',
}: NavigationCardProps) {
  const borderHoverMap = {
    default: 'hover:border-blue-500 hover:bg-gray-800/80',
    danger: 'hover:border-red-500 hover:bg-red-950/20',
    warning: 'hover:border-amber-500 hover:bg-amber-950/20',
  };

  return (
    <div
      onClick={onClick}
      className={`p-6 bg-gray-800 border border-gray-700/80 rounded-2xl cursor-pointer transition-all duration-200 shadow-xl group hover:-translate-y-1 ${borderHoverMap[variant]}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-3xl p-3 bg-gray-900 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </span>
        {badge && (
          <span className="px-3 py-1 bg-gray-900 border border-gray-700 text-xs font-bold text-gray-300 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed">
        {description}
      </p>
      <div className="mt-4 flex items-center text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
        Acessar módulo →
      </div>
    </div>
  );
}