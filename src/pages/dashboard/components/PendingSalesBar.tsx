import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/services/firebase';
import { cancelPendingSale } from '../../../services/salesService';
import { toast } from 'react-toastify';
import type { CartItem } from '../../../types';

export interface PendingSale {
  id: string;
  total: number;
  paymentMethod: string;
  timeFormatted: string;
  sessionId?: string | null;
  items: CartItem[];
}

interface PendingSalesBarProps {
  sessionId?: string | null;
  onSelectPendingSale: (sale: PendingSale) => void;
}

export function PendingSalesBar({ sessionId, onSelectPendingSale }: PendingSalesBarProps) {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setPendingSales([]);
      return;
    }

    const salesRef = collection(db, 'sales');
    
    const q = query(
      salesRef, 
      where('status', '==', 'pending'),
      where('sessionId', '==', sessionId)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const sales: PendingSale[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          sales.push({
            id: doc.id,
            total: data.totalAmount || data.total || 0,
            paymentMethod: data.paymentMethod || 'Dinheiro',
            timeFormatted: data.timeFormatted || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recente'),
            sessionId: data.sessionId, items: data.items || [],
          });
        });
        setPendingSales(sales);
      },
      (error) => {
        console.error("Erro ao escutar vendas pendentes:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  if (pendingSales.length === 0) return null;

  const executeCancel = async (saleId: string) => {
    try {
      await cancelPendingSale(saleId);
      toast.info("Venda pendente cancelada.");
    } catch (error) {
      toast.error("Erro ao cancelar venda.");
    }
  };

  const handleCancel = (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();

    toast.warn(
      ({ closeToast }) => (
        <div className="flex flex-col gap-2 p-1">
          <span className="font-bold text-sm text-gray-100">
            Deseja realmente CANCELAR esta venda pendente?
          </span>
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={closeToast}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Voltar
            </button>
            <button
              onClick={() => {
                closeToast();
                executeCancel(saleId);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow"
            >
              Sim, Cancelar
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-gray-900 border border-amber-500/50 rounded-2xl p-3 shadow-2xl max-w-md w-full">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Vendas Pendentes da Sessão ({pendingSales.length})
        </span>
        <span className="text-[10px] text-gray-400">Clique na venda p/ alterar ou dar baixa</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {pendingSales.map((sale) => (
          <div
            key={sale.id}
            onClick={() => onSelectPendingSale(sale)}
            className="flex items-center justify-between p-2.5 bg-gray-950 hover:bg-gray-800 rounded-xl border border-gray-800 transition-colors cursor-pointer group"
          >
            <div>
              <span className="font-bold text-green-400 font-mono text-base block">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total)}
              </span>
              <div className="text-xs text-gray-400">
                {sale.paymentMethod} • <span className="text-gray-300">{sale.timeFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleCancel(e, sale.id)}
                className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-colors border border-red-500/30"
                title="Cancelar esta venda"
              >
                ✕ Cancelar
              </button>

              <span className="px-3 py-1.5 bg-blue-600 group-hover:bg-blue-500 font-bold text-xs rounded-lg text-white">
                Dar Baixa ➔
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}