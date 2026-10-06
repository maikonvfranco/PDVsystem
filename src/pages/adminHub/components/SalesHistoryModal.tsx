import { useState, useEffect, useMemo, useRef } from 'react';
import { getSalesByPeriod, type SaleRecord, type PaymentBreakdown } from '../../../services/salesService';
import type { CartItem } from '../../../types';
import { toast } from 'react-toastify';

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PeriodMode = 'today' | 'week' | 'month' | 'year' | 'custom';

type CartItemCompatible = CartItem & {
  productName?: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  unitPrice?: number;
};

export function SalesHistoryModal({ isOpen, onClose }: SalesHistoryModalProps) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('today');
  const [statusFilter, setStatusFilter] = useState<string>('completed');

  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [selectedYearOffset, setSelectedYearOffset] = useState<number>(0);

  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  // Calcula o intervalo de datas exato
  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    if (periodMode === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (periodMode === 'week') {
      const currentDay = now.getDay();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - currentDay + (selectedWeekOffset * 7));
      sunday.setHours(0, 0, 0, 0);

      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);

      return { start: sunday, end: saturday };
    } else if (periodMode === 'month') {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + selectedMonthOffset, 1);
      const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      return { start: firstDay, end: lastDay };
    } else if (periodMode === 'year') {
      const targetYear = now.getFullYear() + selectedYearOffset;
      const firstDay = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      const lastDay = new Date(targetYear, 11, 31, 23, 59, 59, 999);

      return { start: firstDay, end: lastDay };
    } else if (periodMode === 'custom') {
      // 🟢 Ajuste para considerar até 23:59:59.999 do último dia selecionado
      const s = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date();
      const e = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : new Date();
      
      return { start: s, end: e };
    }

    return { start, end };
  };

  const fetchHistory = async (): Promise<void> => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const data = await getSalesByPeriod(start, end, statusFilter);
      setSales(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar o histórico de vendas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, periodMode, statusFilter, selectedWeekOffset, selectedMonthOffset, selectedYearOffset]);

  const summary = useMemo(() => {
    const totalRevenue = sales.reduce((acc: number, s: SaleRecord) => acc + (s.totalAmount || 0), 0);
    const count = sales.length;
    const avgTicket = count > 0 ? totalRevenue / count : 0;

    const byMethod: Record<string, number> = {};
    sales.forEach((s: SaleRecord) => {
      if (s.paymentsDetails && s.paymentsDetails.length > 0) {
        s.paymentsDetails.forEach((p: PaymentBreakdown) => {
          byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
        });
      } else {
        const method = s.paymentMethod || 'Dinheiro';
        byMethod[method] = (byMethod[method] || 0) + (s.totalAmount || 0);
      }
    });

    return { totalRevenue, count, avgTicket, byMethod };
  }, [sales]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Cabeçalho */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <div>
            <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
              📜 Histórico de Vendas
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Consulte cupons, formas de pagamento e relatórios detalhados.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 font-bold flex items-center justify-center transition-colors text-gray-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Filtros e Controles */}
        <div className="p-6 bg-gray-950/30 border-b border-gray-800 space-y-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            
            <div className="flex flex-wrap gap-1.5 bg-gray-900 p-1 rounded-2xl border border-gray-800">
              {(
                [
                  ['today', 'Hoje'],
                  ['week', 'Por Semana'],
                  ['month', 'Por Mês'],
                  ['year', 'Por Ano'],
                  ['custom', 'Personalizado'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriodMode(key as PeriodMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    periodMode === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="completed">Concluídas</option>
              <option value="pending">Pendentes</option>
              <option value="canceled">Canceladas</option>
              <option value="all">Todos os Status</option>
            </select>
          </div>

          {periodMode === 'week' && (
            <div className="flex gap-2 items-center bg-gray-900 p-2.5 rounded-2xl border border-gray-800 text-xs">
              <span className="text-gray-400 font-medium">Selecione a Semana:</span>
              <select
                value={selectedWeekOffset}
                onChange={(e) => setSelectedWeekOffset(Number(e.target.value))}
                className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>Esta Semana (Atual)</option>
                <option value={-1}>Semana Passada</option>
                <option value={-2}>Há 2 semanas</option>
                <option value={-3}>Há 3 semanas</option>
                <option value={-4}>Há 4 semanas</option>
              </select>
            </div>
          )}

          {periodMode === 'month' && (
            <div className="flex gap-2 items-center bg-gray-900 p-2.5 rounded-2xl border border-gray-800 text-xs">
              <span className="text-gray-400 font-medium">Selecione o Mês:</span>
              <select
                value={selectedMonthOffset}
                onChange={(e) => setSelectedMonthOffset(Number(e.target.value))}
                className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>Este Mês (Atual)</option>
                <option value={-1}>Mês Passado</option>
                <option value={-2}>Há 2 Meses</option>
                <option value={-3}>Há 3 Meses</option>
                <option value={-6}>Há 6 Meses</option>
              </select>
            </div>
          )}

          {periodMode === 'year' && (
            <div className="flex gap-2 items-center bg-gray-900 p-2.5 rounded-2xl border border-gray-800 text-xs">
              <span className="text-gray-400 font-medium">Selecione o Ano:</span>
              <select
                value={selectedYearOffset}
                onChange={(e) => setSelectedYearOffset(Number(e.target.value))}
                className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>Ano Atual ({new Date().getFullYear()})</option>
                <option value={-1}>Ano Passado ({new Date().getFullYear() - 1})</option>
                <option value={-2}>{new Date().getFullYear() - 2}</option>
              </select>
            </div>
          )}

          {/* 🟢 Campos de Data Customizada com clique total e ícone destacado */}
          {periodMode === 'custom' && (
            <div className="flex flex-wrap gap-3 items-center bg-gray-900 p-3 rounded-2xl border border-gray-800 text-xs">
              {/* Campo Data Inicial */}
              <div 
                onClick={() => startDateInputRef.current?.showPicker?.()} 
                className="flex items-center gap-2 bg-gray-950 border border-gray-700 hover:border-blue-500 p-2 rounded-xl cursor-pointer transition-colors"
              >
                <span className="text-gray-400 font-medium">De:</span>
                <input
                  ref={startDateInputRef}
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>

              {/* Campo Data Final */}
              <div 
                onClick={() => endDateInputRef.current?.showPicker?.()} 
                className="flex items-center gap-2 bg-gray-950 border border-gray-700 hover:border-blue-500 p-2 rounded-xl cursor-pointer transition-colors"
              >
                <span className="text-gray-400 font-medium">Até:</span>
                <input
                  ref={endDateInputRef}
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={fetchHistory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md active:scale-95"
              >
                Filtrar Vendas
              </button>
            </div>
          )}

          {/* Resumo Consolidado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Faturamento</span>
              <span className="text-lg font-bold font-mono text-green-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalRevenue)}
              </span>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Qtd. Vendas</span>
              <span className="text-lg font-bold font-mono text-blue-400">
                {summary.count} cupons
              </span>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Ticket Médio</span>
              <span className="text-lg font-bold font-mono text-purple-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.avgTicket)}
              </span>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Meios de Pagamento</span>
              <div className="text-[10px] text-gray-300 font-mono mt-0.5 space-y-0.5 truncate">
                {Object.entries(summary.byMethod).map(([method, amount]: [string, number]) => (
                  <div key={method} className="flex justify-between gap-1">
                    <span className="text-gray-400">{method}:</span>
                    <span className="font-bold">R$ {amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Vendas */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">
              Carregando histórico de vendas...
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <span>Nenhuma venda encontrada para o período selecionado.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale: SaleRecord) => {
                const dateObj: Date = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date();
                const formattedDate = dateObj.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="flex items-center justify-between p-4 bg-gray-950 hover:bg-gray-800/60 rounded-2xl border border-gray-800 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-lg">
                        🛒
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-green-400 text-base">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalAmount)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sale.status === 'completed'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : sale.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {sale.status === 'completed' ? 'Concluída' : sale.status === 'pending' ? 'Pendente' : 'Cancelada'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span className="text-blue-400 font-medium">{sale.paymentMethod}</span>
                          <span>•</span>
                          <span>{sale.items?.length || 0} item(ns)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 bg-gray-900 group-hover:bg-blue-600 text-gray-300 group-hover:text-white text-xs font-bold rounded-xl transition-colors border border-gray-800 group-hover:border-blue-500 cursor-pointer"
                    >
                      Ver Detalhes ➔
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Venda (Cupom) */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-blue-400 flex items-center gap-1.5">
                🧾 Cupom da Venda
              </h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 font-bold flex items-center justify-center text-gray-400 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs text-gray-400 uppercase font-bold block mb-2">Itens:</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedSale.items?.map((item: CartItemCompatible, idx: number) => {
                  const itemName = item.productName || item.name || item.title || item.description || 'Produto sem nome';
                  const itemPrice = item.price ?? item.unitPrice ?? 0;
                  const itemTotal = item.quantity * itemPrice;

                  return (
                    <div key={idx} className="flex justify-between items-center text-xs bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                      <div>
                        <span className="font-bold text-gray-200 block">{itemName}</span>
                        <span className="text-gray-400 text-[10px]">
                          {item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemPrice)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-green-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Forma Principal:</span>
                <span className="text-blue-400 font-bold">{selectedSale.paymentMethod}</span>
              </div>

              {selectedSale.paymentsDetails && selectedSale.paymentsDetails.length > 0 && (
                <div className="pt-1 border-t border-gray-800 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Detalhamento Múltiplo:</span>
                  {selectedSale.paymentsDetails.map((p: PaymentBreakdown, idx: number) => (
                    <div key={idx} className="flex justify-between text-gray-300">
                      <span>• {p.method}:</span>
                      <span>R$ {p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedSale.change ? selectedSale.change > 0 && (
                <div className="flex justify-between text-yellow-400 pt-1 border-t border-gray-800 font-bold">
                  <span>Troco Devolvido:</span>
                  <span>R$ {selectedSale.change.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex justify-between items-center bg-gray-950 p-4 rounded-2xl border border-gray-800">
              <span className="text-sm font-bold text-gray-300">Total da Venda:</span>
              <span className="text-2xl font-mono font-bold text-green-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.totalAmount)}
              </span>
            </div>

            <button
              onClick={() => setSelectedSale(null)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl transition-colors text-sm cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}