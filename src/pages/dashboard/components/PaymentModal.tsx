import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createSaleRecord, confirmPendingSale, type PaymentBreakdown } from '../../../services/salesService';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { dbClients } from '../../../firebase/services/firebase';
import type { CartItem } from '../../../types';

interface Customer {
  id: string;
  name: string;
  [key: string]: any;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  cartItems?: CartItem[];
  pendingSaleId?: string | null;
  sessionId?: string | null;
  onFinalizeSuccess: () => void;
}

// Converte o valor em Reais (ex: 3.50) para centavos inteiros (ex: 350)
async function addPurchaseToCustomer(customerId: string, totalAmount: number) {
  const customerRef = doc(dbClients, 'users', customerId);

  const now = new Date();
  const dateFormatted = `${now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })}, ${now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const amountInCents = Math.round(totalAmount * 100);

  await updateDoc(customerRef, {
    purchase: arrayUnion({
      date: dateFormatted,
      price: amountInCents,
    }),
  });
}

const roundToFiveCents = (val: number): number => {
  return Math.round(val * 20) / 20;
};

export function PaymentModal({
  isOpen,
  onClose,
  total,
  cartItems = [],
  pendingSaleId = null,
  sessionId = null,
  onFinalizeSuccess,
}: PaymentModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Pré-seleciona "Máquininha"
  const [selectedMethod, setSelectedMethod] = useState<string>('Máquininha');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');

  const [cashPart, setCashPart] = useState<string>('');
  const [creditPart, setCreditPart] = useState<string>('');
  const [debitPart, setDebitPart] = useState<string>('');
  const [pixPart, setPixPart] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountPaidInput('');
      setCashPart('');
      setCreditPart('');
      setDebitPart('');
      setPixPart('');
      setSelectedCustomerId('');
      setSelectedMethod('Máquininha');

      const fetchCustomers = async () => {
        try {
          setLoadingCustomers(true);
          const querySnapshot = await getDocs(collection(dbClients, 'users'));
          
          const list: Customer[] = querySnapshot.docs.map((d) => ({
            id: d.id,
            name: d.data().name || d.data().nome || 'Cliente sem nome',
            ...d.data(),
          }));

          list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

          setCustomers(list);
        } catch (error) {
          console.error("Erro ao carregar clientes:", error);
          toast.error("Erro ao carregar lista de clientes.");
        } finally {
          setLoadingCustomers(false);
        }
      };

      fetchCustomers();
    }
  }, [isOpen]);

  const numericAmountPaid = parseFloat(amountPaidInput) || 0;
  const numCash = parseFloat(cashPart) || 0;
  const numCredit = parseFloat(creditPart) || 0;
  const numDebit = parseFloat(debitPart) || 0;
  const numPix = parseFloat(pixPart) || 0;

  const totalMultiple = useMemo(
    () => numCash + numCredit + numDebit + numPix,
    [numCash, numCredit, numDebit, numPix]
  );

  const remainingMultiple = useMemo(
    () => Math.max(0, total - totalMultiple),
    [total, totalMultiple]
  );

  const change = useMemo(() => {
    let rawChange = 0;
    if (selectedMethod === 'Dinheiro') {
      rawChange = Math.max(0, numericAmountPaid - total);
    } else if (selectedMethod === 'Múltiplo' && numCash > 0) {
      const restToPay = total - (numCredit + numDebit + numPix);
      rawChange = Math.max(0, numCash - restToPay);
    }
    return roundToFiveCents(rawChange);
  }, [selectedMethod, numericAmountPaid, total, numCash, numCredit, numDebit, numPix]);

  const isValidPayment = useMemo(() => {
    if (selectedMethod === 'Anotar') {
      return selectedCustomerId !== '';
    }
    if (selectedMethod === 'Dinheiro') {
      return numericAmountPaid >= total - 0.001;
    }
    if (selectedMethod === 'Múltiplo') {
      return totalMultiple >= total - 0.01;
    }
    return true;
  }, [selectedMethod, selectedCustomerId, numericAmountPaid, total, totalMultiple]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleAutoFillRemaining = (
    currentVal: string,
    setter: (v: string) => void
  ) => {
    if (!currentVal && remainingMultiple > 0) {
      setter(remainingMultiple.toFixed(2));
    }
  };

  const handleProcessSale = async (isPending = false) => {
    if (!pendingSaleId && cartItems.length === 0) {
      toast.warn("O carrinho está vazio.");
      return;
    }

    if (!isPending && !isValidPayment) {
      toast.error("O valor pago ainda não atinge o total da venda.");
      return;
    }

    if (selectedMethod === 'Anotar' && !selectedCustomerId) {
      toast.error("Por favor, selecione um cliente para anotar.");
      return;
    }

    const paymentsDetails: PaymentBreakdown[] = [];
    if (selectedMethod === 'Múltiplo') {
      if (numCash > 0) paymentsDetails.push({ method: 'Dinheiro', amount: numCash });
      if (numCredit > 0) paymentsDetails.push({ method: 'Máquininha', amount: numCredit });
    }

    try {
      setIsSubmitting(true);

      if (selectedMethod === 'Anotar' && selectedCustomerId) {
        await addPurchaseToCustomer(selectedCustomerId, total);
      }

      if (pendingSaleId) {
        await confirmPendingSale(
          pendingSaleId,
          selectedMethod,
          total,
          paymentsDetails,
          change,
          sessionId
        );
        toast.success("Pagamento pendente confirmado!");
      } else {
        await createSaleRecord(
          {
            sessionId,
            total,
            paymentMethod: selectedMethod,
            paymentsDetails,
            items: cartItems,
            amountPaid: selectedMethod === 'Dinheiro' ? numericAmountPaid : total,
            change,
          },
          isPending
        );

        if (isPending) {
          toast.info("Venda registrada como PENDENTE!");
        } else {
          toast.success('Venda concluída com sucesso!');
        }
      }

      onFinalizeSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar a venda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: 'Máquininha', label: 'Máquininha', icon: '💳' },
    { id: 'Dinheiro', label: 'Dinheiro', icon: '💵' },
    { id: 'Anotar', label: 'Anotar', icon: '📝' },
    { id: 'Múltiplo', label: 'Duplo', icon: '🧩' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-400">
            {pendingSaleId ? "⚡ Concluir Venda Pendente" : "Finalizar Pagamento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Display de Total */}
        <div className="mb-4 p-4 bg-gray-950 rounded-xl border border-gray-800 text-center">
          <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
            Total da Compra
          </span>
          <span className="text-4xl font-extrabold font-mono text-green-400">
            {formatCurrency(total)}
          </span>
        </div>

        {/* Seleção de Forma de Pagamento */}
        <label className="text-xs text-gray-400 block mb-2 font-medium">
          Selecione a Forma de Pagamento:
        </label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMethod(m.id)}
              className={`p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                selectedMethod === m.id
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-[1.02]'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* PAINEL: Dinheiro */}
        {selectedMethod === 'Dinheiro' && (
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Valor Recebido (R$):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-xl text-green-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[total, 5, 10, 20, 50, 100].map((val, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAmountPaidInput(val.toFixed(2))}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-mono rounded-lg border border-gray-700 text-gray-300 cursor-pointer"
                >
                  {idx === 0 ? 'Exato' : `R$ ${val}`}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">
                {numericAmountPaid < total - 0.001
                  ? 'Falta Pagar:'
                  : change > 0
                  ? 'Troco:'
                  : 'Status:'}
              </span>
              <span
                className={`text-xl font-bold font-mono ${
                  numericAmountPaid < total - 0.001
                    ? 'text-red-400'
                    : change > 0
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                {numericAmountPaid < total - 0.001
                  ? formatCurrency(total - numericAmountPaid)
                  : change > 0
                  ? formatCurrency(change)
                  : '✓ Pagamento Exato'}
              </span>
            </div>
          </div>
        )}

        {/* PAINEL: Duplo (Múltiplo) */}
        {selectedMethod === 'Múltiplo' && (
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4 space-y-3 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400 font-bold">Informe os valores recebidos:</span>
              <span className="text-gray-400 font-mono">
                Restante: <strong className="text-amber-400">{formatCurrency(remainingMultiple)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">💵 Dinheiro</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cashPart}
                  onFocus={() => handleAutoFillRemaining(cashPart, setCashPart)}
                  onChange={(e) => setCashPart(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 font-mono text-green-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">💳 Máquininha</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditPart}
                  onFocus={() => handleAutoFillRemaining(creditPart, setCreditPart)}
                  onChange={(e) => setCreditPart(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 font-mono text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-800 text-sm">
              <span className="text-gray-400">Total Informado:</span>
              <span className={`font-mono font-bold ${totalMultiple >= total ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totalMultiple)}
              </span>
            </div>

            {change > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Troco no Dinheiro:</span>
                <span className="font-mono font-bold text-yellow-400">
                  {formatCurrency(change)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* PAINEL: Anotar (Fiado) */}
        {selectedMethod === 'Anotar' && (
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4 space-y-3">
            <label className="text-xs text-gray-400 font-bold block">
              Selecione o Cliente:
            </label>
            {loadingCustomers ? (
              <div className="text-center py-2 text-xs text-gray-400">
                Carregando lista de clientes...
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Escolha um cliente --</option>
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={isSubmitting || (!pendingSaleId && !isValidPayment)}
            onClick={() => handleProcessSale(false)}
            className={`w-full py-3.5 font-bold rounded-xl transition-all shadow-lg text-base cursor-pointer ${
              isValidPayment || pendingSaleId
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
            }`}
          >
            {isSubmitting
              ? 'Gravando...'
              : pendingSaleId
              ? 'Confirmar e Dar Baixa'
              : selectedMethod === 'Anotar'
              ? 'Anotar na Conta do Cliente'
              : 'Concluir Venda'}
          </button>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors text-sm cursor-pointer border border-gray-700"
            >
              Cancelar
            </button>

            {!pendingSaleId && selectedMethod !== 'Anotar' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleProcessSale(true)}
                className="flex-1 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 font-bold rounded-xl transition-colors text-sm cursor-pointer"
              >
                ⏳ Deixar Pendente
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}