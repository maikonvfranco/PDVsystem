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
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase/services/firebase';

export interface ExpenseRecord {
    id?: string;
    description: string;
    amount: number;
    category: string;
    takenFromCashDrawer: boolean;
    createdAt: Timestamp;
}

const CATEGORIES = [
    'Insumos / Mercadoria',
    'Contas Fixas (Água/Luz/Internet)',
    'Embalagens',
    'Fornecedores / Boletos',
    'Manutenção',
    'Outros'
];

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#6B7280'];

export default function Expenses() {
    const navigate = useNavigate();

    // Redirecionamento de rota caso acesse diretamente
    useEffect(() => {
        if (window.location.pathname.endsWith('/admin/expenses')) {
            navigate('/admin', { replace: true });
        }
    }, [navigate]);

    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('monthly');
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

    // Estados do Formulário de Lançamento Rápido
    const [description, setDescription] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<string>(CATEGORIES[0]);
    const [takenFromCashDrawer, setTakenFromCashDrawer] = useState<boolean>(true);

    // Buscar despesas no Firestore por período
    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let start = new Date();

            if (period === 'daily') {
                start.setHours(0, 0, 0, 0);
            } else if (period === 'weekly') {
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
            } else if (period === 'monthly') {
                start.setDate(now.getDate() - 30);
                start.setHours(0, 0, 0, 0);
            } else if (period === 'quarterly') {
                start.setDate(now.getDate() - 90);
                start.setHours(0, 0, 0, 0);
            }

            const q = query(
                collection(db, 'expenses'),
                where('createdAt', '>=', Timestamp.fromDate(start)),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const fetchedExpenses: ExpenseRecord[] = [];
            querySnapshot.forEach((docSnap) => {
                fetchedExpenses.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRecord);
            });

            setExpenses(fetchedExpenses);
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            toast.error('Erro ao carregar lista de despesas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [period]);

    // Cadastrar nova despesa
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        const numericAmount = parseFloat(amount.replace(',', '.'));
        if (!description.trim() || isNaN(numericAmount) || numericAmount <= 0) {
            toast.warn('Preencha a descrição e um valor válido.');
            return;
        }

        setSaving(true);
        try {
            const newExpense = {
                description: description.trim(),
                amount: numericAmount,
                category,
                takenFromCashDrawer,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'expenses'), newExpense);
            toast.success('Despesa registrada com sucesso!');

            // Limpar formulário
            setDescription('');
            setAmount('');
            setTakenFromCashDrawer(true);

            // Recarregar despesas
            fetchExpenses();
        } catch (error) {
            console.error('Erro ao salvar despesa:', error);
            toast.error('Erro ao registrar a despesa.');
        } finally {
            setSaving(false);
        }
    };

    // Excluir despesa
    const handleDeleteExpense = async (id?: string) => {
        if (!id) return;
        if (!window.confirm('Tem certeza que deseja remover este registro de despesa?')) return;

        try {
            await deleteDoc(doc(db, 'expenses', id));
            toast.success('Despesa removida!');
            fetchExpenses();
        } catch (error) {
            console.error('Erro ao deletar despesa:', error);
            toast.error('Erro ao excluir despesa.');
        }
    };

    // Cálculos e Métricas
    const metrics = useMemo(() => {
        let totalAmount = 0;
        let totalFromCashDrawer = 0;
        const categoryDistribution: Record<string, number> = {};

        expenses.forEach((item) => {
            const val = item.amount || 0;
            totalAmount += val;

            if (item.takenFromCashDrawer) {
                totalFromCashDrawer += val;
            }

            const cat = item.category || 'Outros';
            categoryDistribution[cat] = (categoryDistribution[cat] || 0) + val;
        });

        return {
            totalAmount: Number(totalAmount.toFixed(2)),
            totalFromCashDrawer: Number(totalFromCashDrawer.toFixed(2)),
            count: expenses.length,
            categoryDistribution,
        };
    }, [expenses]);

    // Dados para o Gráfico da Evolução Temporal
    const chartData = useMemo(() => {
        const map: Record<string, { date: string; timestamp: number; total: number }> = {};

        expenses.forEach((item) => {
            const d = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
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
                    total: 0,
                };
            }

            map[dateKey].total += item.amount || 0;
        });

        return Object.values(map)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((item) => ({
                ...item,
                total: Number(item.total.toFixed(2)),
            }));
    }, [expenses, period]);

    // Dados para o Gráfico de Pizza por Categoria
    const pieData = useMemo(() => {
        return Object.entries(metrics.categoryDistribution).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2)),
        }));
    }, [metrics.categoryDistribution]);

    return (
        <div className="p-6 bg-gray-950 text-white min-h-screen space-y-6">

            {/* Topo da Página */}
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
                        <h1 className="text-3xl font-extrabold text-red-500 flex items-center gap-2">
                            💸 Gestão de Despesas & Saídas
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Lançamento rápido de compras, boletos e saídas do caixa físico.
                        </p>
                    </div>
                </div>

                {/* Seletor de Período */}
                <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-2xl">
                    {(
                        [
                            ['daily', 'Diário'],
                            ['weekly', 'Semanal'],
                            ['monthly', 'Mensal'],
                            ['quarterly', 'Trimestral'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setPeriod(key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                period === key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Formulário de Lançamento Rápido */}
            <div className="bg-gray-900 border border-red-500/30 p-5 rounded-3xl space-y-4">
                <h3 className="font-bold text-red-400 text-sm flex items-center gap-2">
                    ⚡ Registrar Novo Gasto Rápido
                </h3>

                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                            Descrição do Gasto
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Café, Boleto Coca-Cola, Embalagens..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                            Valor (R$)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                            required
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                            Categoria
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-3 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-yellow-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={takenFromCashDrawer}
                                onChange={(e) => setTakenFromCashDrawer(e.target.checked)}
                                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                            />
                            Retirado do Caixa (Gaveta)
                        </label>

                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
                        >
                            {saving ? 'Salvando...' : '+ Salvar'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Grid de Cards Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <span className="text-xs text-gray-400 uppercase font-bold block">Total de Saídas no Período</span>
                    <span className="text-2xl font-bold font-mono text-red-400 mt-2 block">
                        R$ {metrics.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">{metrics.count} lançamentos efetuados</span>
                </div>

                <div className="bg-gray-900 border border-yellow-500/30 bg-yellow-950/10 p-5 rounded-3xl">
                    <span className="text-xs text-yellow-400 uppercase font-bold block">Retirado da Gaveta (Sangria)</span>
                    <span className="text-2xl font-bold font-mono text-yellow-400 mt-2 block">
                        R$ {metrics.totalFromCashDrawer.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-yellow-500/70 mt-1 block">Abatido diretamente do saldo em dinheiro</span>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <span className="text-xs text-gray-400 uppercase font-bold block">Outras Formas de Pagamento</span>
                    <span className="text-2xl font-bold font-mono text-gray-300 mt-2 block">
                        R$ {(metrics.totalAmount - metrics.totalFromCashDrawer).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">Pagos via PIX, conta bancária ou cartão corporativo</span>
                </div>
            </div>

            {/* Seção de Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Evolução Temporal */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                        📈 Evolução de Gastos
                    </h3>

                    <div className="h-72 w-full pt-4">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                Carregando dados do gráfico...
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                Nenhuma despesa registrada para este período.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '1rem', color: '#fff' }}
                                        formatter={(value) => [`R$ ${Number(value || 0).toFixed(2)}`, 'Total Despendido']}
                                    />
                                    <Area type="monotone" dataKey="total" name="Despesas" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesas)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Gráfico de Pizza - Distribuição por Categoria */}
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-gray-200 text-sm">
                        📊 Gastos por Categoria
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
                                        innerRadius={55}
                                        outerRadius={75}
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

                    <div className="space-y-2 pt-2 border-t border-gray-800 max-h-40 overflow-y-auto">
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

            {/* Tabela / Lista Detalhada dos Gastos do Dia / Período */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <h3 className="font-bold text-gray-200 text-base">
                        📋 Detalhamento dos Gastos Registrados
                    </h3>
                    <span className="text-xs text-gray-400 font-mono">
                        {expenses.length} registro(s) encontrado(s)
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-500 text-xs">Carregando lançamentos...</div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">Nenhum gasto registrado neste período.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                                    <th className="py-3 px-2">Data / Hora</th>
                                    <th className="py-3 px-2">Descrição</th>
                                    <th className="py-3 px-2">Categoria</th>
                                    <th className="py-3 px-2">Origem</th>
                                    <th className="py-3 px-2 text-right">Valor</th>
                                    <th className="py-3 px-2 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60 font-mono">
                                {expenses.map((exp) => {
                                    const dateObj = exp.createdAt?.toDate ? exp.createdAt.toDate() : new Date();
                                    return (
                                        <tr key={exp.id} className="hover:bg-gray-800/40 transition-colors">
                                            <td className="py-3 px-2 text-gray-400">
                                                {dateObj.toLocaleDateString('pt-BR')} {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3 px-2 font-bold text-white font-sans">{exp.description}</td>
                                            <td className="py-3 px-2 font-sans text-gray-300">
                                                <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-lg text-[10px]">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 font-sans">
                                                {exp.takenFromCashDrawer ? (
                                                    <span className="text-yellow-400 text-[10px] font-bold bg-yellow-950/40 border border-yellow-800/50 px-2 py-0.5 rounded-md">
                                                        💵 Caixa
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px] bg-gray-800 px-2 py-0.5 rounded-md">
                                                        💳 Outro
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-right font-bold text-red-400">
                                                R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <button
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Excluir Gasto"
                                                >
                                                    🗑️️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}