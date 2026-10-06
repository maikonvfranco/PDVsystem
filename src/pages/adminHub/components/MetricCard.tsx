interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color?: 'blue' | 'green' | 'amber' | 'purple';
}

export function MetricCard({ title, value, subtitle, icon, color = 'blue' }: MetricCardProps) {
  const colorMap = {
    blue: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    green: 'border-green-500/30 text-green-400 bg-green-500/10',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };

  return (
    <div className={`p-5 rounded-2xl bg-gray-800 border ${colorMap[color].split(' ')[0]} shadow-lg flex items-center justify-between`}>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-bold font-mono text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colorMap[color]}`}>
        {icon}
      </div>
    </div>
  );
}