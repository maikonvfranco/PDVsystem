import { useState, useEffect, createElement } from 'react';
import { doc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/services/firebase';
import { openCheckoutSession, closeCheckoutSession, registerCashMovement } from '../services/checkoutService';
import { toast } from 'react-toastify';

export function useAdminHub() {
  const [summary, setSummary] = useState({
    todaySalesTotal: 0,
    todaySalesCount: 0,
    cashBalance: 0,
    isCashOpen: false,
  });

  const [loading, setLoading] = useState(true);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [modalType, setModalType] = useState<'sangria' | 'suprimento'>('sangria');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 1. Escuta em tempo real o status do caixa
  useEffect(() => {
    const checkoutRef = doc(db, 'checkout', 'open');
    const unsubscribe = onSnapshot(checkoutRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const isOpen = !!data.isOpen;
        const sessionId = data.activeSessionId || null;

        setCurrentSessionId(sessionId);
        setSummary((prev) => ({
          ...prev,
          isCashOpen: isOpen,
          cashBalance: data.cash ?? 0,
        }));
      } else {
        setCurrentSessionId(null);
        setSummary((prev) => ({ ...prev, isCashOpen: false, cashBalance: 0 }));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Escuta em tempo real as vendas do dia de hoje
  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const salesRef = collection(db, 'sales');
    const todaySalesQuery = query(
      salesRef,
      where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    );

    const unsubscribe = onSnapshot(
      todaySalesQuery,
      (snapshot) => {
        let totalSales = 0;
        let countSales = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'completed') {
            totalSales += Number(data.totalAmount || 0);
            countSales += 1;
          }
        });

        setSummary((prev) => ({
          ...prev,
          todaySalesTotal: totalSales,
          todaySalesCount: countSales,
        }));
      },
      (error) => {
        console.error("Erro ao buscar vendas do dia:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handler para Abrir Caixa
  const handleOpenCash = async (initialCash: number): Promise<boolean> => {
    try {
      await openCheckoutSession(initialCash, 'Admin');
      toast.success("Caixa aberto com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
      toast.error("Erro ao abrir caixa no banco de dados.");
      return false;
    }
  };

  // Executa o fechamento do caixa no Firestore
  const executeCloseCash = async () => {
    try {
      if (currentSessionId) {
        await closeCheckoutSession(currentSessionId, summary.cashBalance);
      } else {
        await closeCheckoutSession('desconhecido', summary.cashBalance);
      }
      toast.info("Caixa fechado com sucesso!");
    } catch (error) {
      console.error("Erro ao fechar caixa:", error);
      toast.error("Erro ao fechar o caixa.");
    }
  };

  // Handler para Fechar Caixa com modal customizado no Toast (válido para arquivos .ts)
  const handleCloseCash = () => {
    toast.warn(
      ({ closeToast }) =>
        createElement(
          'div',
          { className: 'flex flex-col gap-2 p-1' },
          createElement(
            'span',
            { className: 'font-bold text-sm text-gray-100' },
            'Deseja realmente FECHAR o caixa?'
          ),
          createElement(
            'div',
            { className: 'flex justify-end gap-2 mt-1' },
            createElement(
              'button',
              {
                onClick: closeToast,
                className: 'px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold cursor-pointer',
              },
              'Cancelar'
            ),
            createElement(
              'button',
              {
                onClick: () => {
                  closeToast();
                  executeCloseCash();
                },
                className: 'px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow',
              },
              'Confirmar'
            )
          )
        ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );
  };

  const openCashAction = (type: 'sangria' | 'suprimento') => {
    if (!summary.isCashOpen) {
      toast.warning("Abra o caixa antes de realizar movimentações!");
      return;
    }
    setModalType(type);
    setIsCashModalOpen(true);
  };

  // Handler para Sangria e Suprimento
  const handleCashActionSubmit = async (amount: number, reason: string): Promise<boolean> => {
    try {
      if (modalType === 'sangria' && amount > summary.cashBalance) {
        toast.error("Valor de sangria maior do que o saldo atual em gaveta!");
        return false;
      }

      await registerCashMovement(modalType, amount, reason, currentSessionId);
      
      const successMsg = modalType === 'sangria' ? "Sangria realizada com sucesso!" : "Suprimento adicionado com sucesso!";
      toast.success(successMsg);

      setIsCashModalOpen(false);
      return true;
    } catch (error) {
      console.error(`Erro ao realizar ${modalType}:`, error);
      toast.error(`Erro ao processar ${modalType}.`);
      return false;
    }
  };

  return {
    summary,
    loading,
    isCashModalOpen,
    setIsCashModalOpen,
    isOpenCashModalOpen,
    setIsOpenCashModalOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    modalType,
    openCashAction,
    handleCashActionSubmit,
    handleOpenCash,
    handleCloseCash,
  };
}