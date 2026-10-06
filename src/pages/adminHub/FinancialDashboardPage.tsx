import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase/services/firebase';
import { getSalesByPeriod, type SaleRecord } from '../../services/salesService';

interface TaxConfig {
    pix: number;
    debit: number;
    credit1x: number;
    credit2x6x: number;
    taxRates: number;
}

const DEFAULT_TAXES: TaxConfig = {
    pix: 0.0,
    debit: 1.2,
    credit1x: 2.5,
    credit2x6x: 3.8,
    taxRates: 4.0,
};

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export function FinancialDashboardPage() {
    const navigate = useNavigate();

    // Redireciona caso acesse diretamente a subrota isolada
    useEffect(() => {
        if (window.location.pathname.endsWith('/admin/financial')) {
            navigate('/admin', { replace: true });
        }
    }, [navigate]);

    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual'>('monthly');
    const [loading, setLoading] = useState<boolean>(true);
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [prevSales, setPrevSales] = useState<SaleRecord[]>([]);

    // Estado das taxas + estado de carregamento/salvamento do Firestore
    const [taxes, setTaxes] = useState<TaxConfig>(DEFAULT_TAXES);
    const [savingTaxes, setSavingTaxes] = useState<boolean>(false);
    const [showTaxSettings, setShowTaxSettings] = useState<boolean>(false);

    // Carregar configurações de taxas do Firestore
    useEffect(() => {
        const loadTaxSettings = async () => {
            try {
                const taxDocRef = doc(db, 'settings', 'taxes');
                const docSnap = await getDoc(taxDocRef);
                if (docSnap.exists()) {
                    setTaxes(docSnap.data() as TaxConfig);
                }
            } catch (error) {
                console.error('Erro ao carregar configurações de taxas:', error);
                toast.error('Erro ao carregar as configurações de taxas.');
            }
        };

        loadTaxSettings();
    }, []);

    // Salvar taxas no Firestore
    const handleSaveTaxes = async () => {
        setSavingTaxes(true);
        try {
            const taxDocRef = doc(db, 'settings', 'taxes');
            await setDoc(taxDocRef, taxes, { merge: true });
            setShowTaxSettings(false);
            toast.success('Configurações de taxas salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar taxas:', error);
            toast.error('Falha ao salvar as configurações de taxas.');
        } finally {
            setSavingTaxes(false);
        }
    };

    // Busca vendas do Período Atual + Período Anterior
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let start = new Date();
            let prevStart = new Date();
            let prevEnd = new Date();

            if (period === 'daily') {
                start.setHours(0, 0, 0, 0);

                prevStart.setDate(now.getDate() - 1);
                prevStart.setHours(0, 0, 0, 0);

                prevEnd.setDate(now.getDate() - 1);
                prevEnd.setHours(23, 59, 59, 999);
            } else if (period === 'weekly') {
                start.setDate(now.getDate() - 7);
                prevEnd.setDate(now.getDate() - 8);
                prevStart.setDate(now.getDate() - 15);

                start.setHours(0, 0, 0, 0);
                prevStart.setHours(0, 0, 0, 0);
                prevEnd.setHours(23, 59, 59, 999);
            } else if (period === 'monthly') {
                start.setDate(now.getDate() - 30);
                prevEnd.setDate(now.getDate() - 31);
                prevStart.setDate(now.getDate() - 60);

                start.setHours(0, 0, 0, 0);
                prevStart.setHours(0, 0, 0, 0);
                prevEnd.setHours(23, 59, 59, 999);
            } else if (period === 'quarterly') {
                start.setDate(now.getDate() - 90);
                prevEnd.setDate(now.getDate() - 91);
                prevStart.setDate(now.getDate() - 180);

                start.setHours(0, 0, 0, 0);
                prevStart.setHours(0, 0, 0, 0);
                prevEnd.setHours(23, 59, 59, 999);
            } else if (period === 'semiannual') {
                start.setDate(now.getDate() - 180);
                prevEnd.setDate(now.getDate() - 181);
                prevStart.setDate(now.getDate() - 360);

                start.setHours(0, 0, 0, 0);
                prevStart.setHours(0, 0, 0, 0);
                prevEnd.setHours(23, 59, 59, 999);
            }

            const [currentData, previousData] = await Promise.all([
                getSalesByPeriod(start, now, 'completed'),
                getSalesByPeriod(prevStart, prevEnd, 'completed'),
            ]);

            setSales(currentData);
            setPrevSales(previousData);
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
            toast.error('Erro ao carregar o relatório financeiro.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    // Cálculos Financeiros
    const metrics = useMemo(() => {
        let rawGrossRevenue = 0;
        let rawCardFeeDeductions = 0;
        const paymentDistribution: Record<string, number> = {};

        sales.forEach((s) => {
            const amount = s.totalAmount || 0;
            rawGrossRevenue += amount;

            const paymentKey = s.paymentMethod || 'Dinheiro';
            const method = paymentKey.toLowerCase();
            paymentDistribution[paymentKey] = (paymentDistribution[paymentKey] || 0) + amount;

            if (method.includes('pix')) {
                rawCardFeeDeductions += amount * (taxes.pix / 100);
            } else if (method.includes('débito') || method.includes('debito')) {
                rawCardFeeDeductions += amount * (taxes.debit / 100);
            } else if (method.includes('crédito') || method.includes('credito')) {
                rawCardFeeDeductions += amount * (taxes.credit1x / 100);
            }
        });

        const grossRevenue = Number(rawGrossRevenue.toFixed(2));
        const cardFeeDeductions = Number(rawCardFeeDeductions.toFixed(2));
        const taxDeductions = Number((grossRevenue * (taxes.taxRates / 100)).toFixed(2));
        const netRevenue = Number((grossRevenue - cardFeeDeductions - taxDeductions).toFixed(2));

        const rawPrevGross = prevSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        const prevGross = Number(rawPrevGross.toFixed(2));

        let growthPercent = 0;
        if (prevGross > 0) {
            growthPercent = Number((((grossRevenue - prevGross) / prevGross) * 100).toFixed(2));
        } else if (grossRevenue > 0) {
            growthPercent = 100;
        }

        const roundedPaymentDistribution: Record<string, number> = {};
        Object.entries(paymentDistribution).forEach(([method, val]) => {
            roundedPaymentDistribution[method] = Number(val.toFixed(2));
        });

        return {
            grossRevenue,
            cardFeeDeductions,
            taxDeductions,
            netRevenue,
            growthPercent,
            prevGross,
            paymentDistribution: roundedPaymentDistribution,
        };
    }, [sales, prevSales, taxes]);

    // Formatação do Gráfico Temporal
    const chartData = useMemo(() => {
        const map: Record<string, { date: string; timestamp: number; bruta: number; liquida: number }> = {};

        sales.forEach((s) => {
            const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
            const dateKey = period === 'daily' 
                ? `${d.getHours().toString().padStart(2, '0')}:00`
                : d.toISOString().split('T')[0];
            
            const label = period === 'daily'
                ? `${d.getHours().toString().padStart(2, '0')}:00`
                : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            if (!map[dateKey]) {
                map[dateKey] = {
                    date: label,
                    timestamp: d.getTime(),
                    bruta: 0,
                    liquida: 0
                };
            }

            const amount = s.totalAmount || 0;
            const method = (s.paymentMethod || '').toLowerCase();
            let fee = 0;

            if (method.includes('pix')) fee = taxes.pix;
            else if (method.includes('débito') || method.includes('debito')) fee = taxes.debit;
            else if (method.includes('crédito') || method.includes('credito')) fee = taxes.credit1x;

            const totalFeePercent = fee + taxes.taxRates;
            const netAmount = amount - amount * (totalFeePercent / 100);

            map[dateKey].bruta += amount;
            map[dateKey].liquida += netAmount;
        });

        return Object.values(map)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((item) => ({
                ...item,
                bruta: Number(item.bruta.toFixed(2)),
                liquida: Number(item.liquida.toFixed(2)),
            }));
    }, [sales, taxes, period]);

    const pieData = useMemo(() => {
        return Object.entries(metrics.paymentDistribution).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2)),
        }));
    }, [metrics.paymentDistribution]);

    return (
        <div className="p-6 bg-gray-950 text-white min-h-screen space-y-6">

            {/* Topo do Painel com Botão de Voltar */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-800 pb-5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                        title="Voltar ao Painel"
                    >
                        ← Voltar
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-blue-400 flex items-center gap-2">
                            📊 Dashboard Financeiro
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Visão consolidada de vendas brutas, descontos e lucro líquido.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Seletor de Período */}
                    <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-2xl">
                        {(
                            [
                                ['daily', 'Diário'],
                                ['weekly', 'Semanal'],
                                ['monthly', 'Mensal'],
                                ['quarterly', 'Trimestral'],
                                ['semiannual', 'Semestral'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setPeriod(key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${period === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Botão de Ajustar Taxas */}
                    <button
                        onClick={() => setShowTaxSettings(!showTaxSettings)}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl text-xs font-bold flex items-center gap-2 text-gray-200 transition-colors cursor-pointer"
                    >
                        ⚙️ Configurar Taxas
                    </button>
                </div>
            </div>

            {/* Card Comparativo de Desempenho (%) */}
            <div className="bg-gradient-to-r from-blue-950/40 to-purple-950/40 border border-blue-900/40 p-4 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">
                        {metrics.growthPercent >= 0 ? '📈' : '📉'}
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase text-gray-400">Comparativo do Período</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xl font-extrabold ${metrics.growthPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {metrics.growthPercent >= 0 ? `+${metrics.growthPercent.toFixed(2)}%` : `${metrics.growthPercent.toFixed(2)}%`}
                            </span>
                            <span className="text-xs text-gray-300">
                                {metrics.growthPercent >= 0 ? 'de aumento em relação ao período anterior' : 'de queda em relação ao período anterior'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                        {period === 'daily' ? 'Ontem' : 'Período Anterior'}
                    </span>
                    <span className="text-sm font-mono font-bold text-gray-300">
                        R$ {metrics.prevGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Configuração de Taxas Expansível com Persistência */}
            {showTaxSettings && (
                <div className="bg-gray-900 border border-blue-500/30 p-5 rounded-3xl space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                        <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2">
                            ⚙️ Ajuste de Taxas das Maquininhas & Imposto Fiscal
                        </h3>
                        <span className="text-xs text-gray-400">Altere os percentuais e clique em salvar</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Taxa PIX (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={taxes.pix}
                                onChange={(e) => setTaxes({ ...taxes, pix: Number(e.target.value) })}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Cartão Débito (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={taxes.debit}
                                onChange={(e) => setTaxes({ ...taxes, debit: Number(e.target.value) })}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Crédito à Vista (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={taxes.credit1x}
                                onChange={(e) => setTaxes({ ...taxes, credit1x: Number(e.target.value) })}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Crédito Parcelado (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={taxes.credit2x6x}
                                onChange={(e) => setTaxes({ ...taxes, credit2x6x: Number(e.target.value) })}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-yellow-400 uppercase font-bold block mb-1">Imposto Fiscal (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={taxes.taxRates}
                                onChange={(e) => setTaxes({ ...taxes, taxRates: Number(e.target.value) })}
                                className="w-full bg-gray-950 border border-yellow-500/40 rounded-xl p-2 text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSaveTaxes}
                            disabled={savingTaxes}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                            {savingTaxes ? 'Salvando...' : '💾 Salvar Configurações'}
                        </button>
                    </div>
                </div>
            )}

            {/* Grid de Cards de Valores Consolidados */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <span className="text-xs text-gray-400 uppercase font-bold block">1. Venda Bruta Total</span>
                    <span className="text-2xl font-bold font-mono text-blue-400 mt-2 block">
                        R$ {metrics.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">Total sem descontos</span>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <span className="text-xs text-red-400 uppercase font-bold block">2. Taxas de Maquininhas</span>
                    <span className="text-2xl font-bold font-mono text-red-400 mt-2 block">
                        - R$ {metrics.cardFeeDeductions.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">Débito, Crédito e PIX</span>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <span className="text-xs text-yellow-400 uppercase font-bold block">3. Impostos ({taxes.taxRates}%)</span>
                    <span className="text-2xl font-bold font-mono text-yellow-400 mt-2 block">
                        - R$ {metrics.taxDeductions.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">Estimativa Simples / MEI</span>
                </div>

                <div className="bg-gray-900 border border-green-500/30 bg-green-950/10 p-5 rounded-3xl">
                    <span className="text-xs text-green-400 uppercase font-bold block">4. Lucro Líquido Real</span>
                    <span className="text-2xl font-bold font-mono text-green-400 mt-2 block">
                        R$ {metrics.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-green-500/70 mt-1 block">Valor disponível pós-taxas</span>
                </div>
            </div>

            {/* Seção de Gráficos de Relatório */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                            📈 Evolução Temporal (Venda Bruta vs. Líquida)
                        </h3>
                        <div className="flex gap-4 text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-blue-400">
                                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> Bruta
                            </span>
                            <span className="flex items-center gap-1.5 text-green-400">
                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span> Líquida
                            </span>
                        </div>
                    </div>

                    <div className="h-72 w-full pt-4">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                Carregando dados do gráfico...
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                Sem histórico de vendas para este período.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorBruta" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorLiquida" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '1rem', color: '#fff' }}
                                        formatter={(value) => [`R$ ${Number(value || 0).toFixed(2)}`, '']}
                                    />
                                    <Area type="monotone" dataKey="bruta" name="Bruta" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorBruta)" />
                                    <Area type="monotone" dataKey="liquida" name="Líquida" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorLiquida)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-gray-200 text-sm">
                        💳 Distribuição por Pagamento
                    </h3>

                    <div className="h-60 w-full flex items-center justify-center">
                        {pieData.length === 0 ? (
                            <span className="text-gray-500 text-xs">Sem dados no período</span>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '1rem', color: '#fff' }}
                                        formatter={(value) => [`R$ ${Number(value || 0).toFixed(2)}`, 'Valor']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-800">
                        {pieData.map((item, index) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-2 text-gray-300">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></span>
                                    {item.name}
                                </span>
                                <span className="font-mono font-bold text-gray-200">
                                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}