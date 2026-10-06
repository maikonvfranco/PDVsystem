import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { dbClients } from '../../firebase/services/firebase';
import { toast } from 'react-toastify';

interface PurchaseItem {
  date: string;
  price: number; // Salvo em centavos (ex: 350 para R$ 3,50)
}

interface CreditItem {
  date: string;
  amount?: number; // Salvo em centavos
  price?: number;  // Compatibilidade com estruturas que usem price
}

interface PaymentHistoryItem {
  date: string;
  amountPaid: number; // Salvo em centavos
  items: PurchaseItem[]; // Guarda a lista completa das compras quitadas
}

interface Customer {
  id: string;
  name: string;
  purchase?: PurchaseItem[];
  credits?: CreditItem[];
  payments_history?: PaymentHistoryItem[];
  [key: string]: any;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Estados para os Modais de Ação
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditInput, setCreditInput] = useState('');

  const [isConfirmPaymentModalOpen, setIsConfirmPaymentModalOpen] = useState(false);

  // Estados para os Modais de Consulta
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirecionamento de rota caso acesse diretamente sub-rota
  useEffect(() => {
    if (window.location.pathname.endsWith('/admin/customers')) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  // Busca os clientes no Firestore (dbClients -> users)
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(dbClients, 'users'));

      const list: Customer[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || docSnap.data().nome || 'Cliente sem nome',
        ...docSnap.data(),
      }));

      // Ordena em ordem alfabética (A-Z)
      list.sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );

      setCustomers(list);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Soma dos débitos (purchases) em centavos
  const totalPurchasesCents = selectedCustomer?.purchase
    ? selectedCustomer.purchase.reduce((acc, item) => acc + (item.price || 0), 0)
    : 0;

  // Soma dos créditos em centavos
  const totalCreditsCents = selectedCustomer?.credits
    ? selectedCustomer.credits.reduce((acc, item) => acc + (item.amount || item.price || 0), 0)
    : 0;

  // Total líquido devedor (em Reais)
  const totalDue = Math.max(0, totalPurchasesCents - totalCreditsCents) / 100;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);

  // Auxiliar para gerar timestamp formatado
  const getFormattedTimestamp = () => {
    const now = new Date();
    return `${now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })}, ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  // Handler para adicionar novo débito na conta do cliente (array purchase)
  const handleAddPurchase = async () => {
    const numericValue = parseFloat(amountInput.replace(',', '.'));
    if (!numericValue || numericValue <= 0) {
      toast.warn('Informe um valor válido.');
      return;
    }

    if (!selectedCustomerId) return;

    try {
      setIsSubmitting(true);
      const customerRef = doc(dbClients, 'users', selectedCustomerId);
      const amountInCents = Math.round(numericValue * 100);

      await updateDoc(customerRef, {
        purchase: arrayUnion({
          date: getFormattedTimestamp(),
          price: amountInCents,
        }),
      });

      toast.success('Valor adicionado com sucesso!');
      setAmountInput('');
      setIsAddModalOpen(false);

      await fetchCustomers();
    } catch (error) {
      console.error('Erro ao adicionar valor:', error);
      toast.error('Erro ao adicionar valor ao cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para adicionar novo crédito na conta do cliente (array credits)
  const handleAddCredit = async () => {
    const numericValue = parseFloat(creditInput.replace(',', '.'));
    if (!numericValue || numericValue <= 0) {
      toast.warn('Informe um valor de crédito válido.');
      return;
    }

    if (!selectedCustomerId) return;

    try {
      setIsSubmitting(true);
      const customerRef = doc(dbClients, 'users', selectedCustomerId);
      const amountInCents = Math.round(numericValue * 100);

      await updateDoc(customerRef, {
        credits: arrayUnion({
          date: getFormattedTimestamp(),
          amount: amountInCents,
          price: amountInCents,
        }),
      });

      toast.success('Crédito adicionado com sucesso!');
      setCreditInput('');
      setIsCreditModalOpen(false);

      await fetchCustomers();
    } catch (error) {
      console.error('Erro ao adicionar crédito:', error);
      toast.error('Erro ao adicionar crédito ao cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para Quitar Totalmente: move os itens de `purchase` para `payments_history` e limpa `purchase` e `credits`
  const handleConfirmFullPayment = async () => {
    if (!selectedCustomer) return;

    const currentPurchases = selectedCustomer.purchase || [];
    if (currentPurchases.length === 0 && totalPurchasesCents === 0) {
      toast.info('Este cliente não possui compras pendentes para quitar.');
      setIsConfirmPaymentModalOpen(false);
      return;
    }

    try {
      setIsSubmitting(true);
      const customerRef = doc(dbClients, 'users', selectedCustomer.id);

      // Prepara o registro do histórico com a cópia detalhada das compras e valor pago líquido
      const paymentRecord: PaymentHistoryItem = {
        date: getFormattedTimestamp(),
        amountPaid: Math.round(totalDue * 100),
        items: [...currentPurchases],
      };

      // Atualiza o documento no Firestore: inclui o pagamento e ZERA tanto o array purchase quanto o credits
      await updateDoc(customerRef, {
        payments_history: arrayUnion(paymentRecord),
        purchase: [], // Apaga os débitos ativos
        credits: [],  // Zera os créditos acumulados
      });

      toast.success('Pagamento confirmado e conta quitada!');
      setIsConfirmPaymentModalOpen(false);

      await fetchCustomers();
    } catch (error) {
      console.error('Erro ao processar quitação:', error);
      toast.error('Erro ao registrar quitação do cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Topo com botão de Voltar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="p-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center font-bold text-sm"
            title="Voltar ao Painel"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-blue-400">Gerenciamento de Clientes</h1>
        </div>

        {/* Seleção do Cliente */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg space-y-3">
          <label className="text-sm font-semibold text-gray-300 block">
            Selecione o Cliente:
          </label>
          {loading ? (
            <div className="text-gray-400 text-sm">Carregando clientes...</div>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 text-white rounded-xl p-3 text-base focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Selecione um cliente --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Painel do Cliente Selecionado */}
        {selectedCustomer && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h1 className="text-xl font-bold text-white">{selectedCustomer.name}</h1>
                <span className="text-xs text-gray-400 font-mono">ID: {selectedCustomer.id}</span>
              </div>

              {/* Total acumulado abatendo créditos */}
              <div className="bg-gray-950 px-5 py-3 rounded-xl border border-gray-800 text-right">
                <span className="text-xs text-gray-400 block uppercase font-medium">
                  Total Devedor
                </span>
                <span className="text-2xl font-extrabold font-mono text-red-400">
                  {formatCurrency(totalDue)}
                </span>
                {totalCreditsCents > 0 && (
                  <span className="text-[10px] text-green-400 block mt-0.5 font-mono">
                    (Créditos abatidos: {formatCurrency(totalCreditsCents / 100)})
                  </span>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
              >
                ➕ Adicionar
              </button>

              <button
                type="button"
                onClick={() => setIsCreditModalOpen(true)}
                className="py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
              >
                💵 Créditos
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmPaymentModalOpen(true)}
                className="py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
              >
                💳 Pagamento
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                📜 Histórico
              </button>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(true)}
                className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-bold rounded-xl text-sm transition-all cursor-pointer col-span-2 sm:col-span-1"
              >
                🔍 Detalhes
              </button>
            </div>
          </div>
        )}

        {/* Modal para Adicionar Compra (Débito) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-amber-400">
                Adicionar Valor ao Cliente
              </h3>
              <p className="text-xs text-gray-400">
                Informe o valor da compra para lançar na conta de <strong>{selectedCustomer?.name}</strong>.
              </p>

              <div>
                <label className="text-xs text-gray-300 block mb-1">Valor (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 font-mono text-xl text-amber-400 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAmountInput('');
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm cursor-pointer border border-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddPurchase}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl text-sm cursor-pointer shadow-lg"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Adicionar Crédito */}
        {isCreditModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-green-400">
                Lançar Crédito ao Cliente
              </h3>
              <p className="text-xs text-gray-400">
                Informe o valor a ser adicionado como crédito para <strong>{selectedCustomer?.name}</strong>.
              </p>

              <div>
                <label className="text-xs text-gray-300 block mb-1">Valor do Crédito (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditInput}
                  onChange={(e) => setCreditInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 font-mono text-xl text-green-400 focus:outline-none focus:border-green-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreditModalOpen(false);
                    setCreditInput('');
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm cursor-pointer border border-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddCredit}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm cursor-pointer shadow-lg"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Quitação / Pagamento */}
        {isConfirmPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-red-400">
                Confirmar Quitação
              </h3>
              <p className="text-xs text-gray-300">
                Deseja confirmar o pagamento e quitar o valor de{' '}
                <strong className="text-green-400">{formatCurrency(totalDue)}</strong> da conta de{' '}
                <strong>{selectedCustomer?.name}</strong>?
              </p>
              <p className="text-[11px] text-gray-400 bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                ⚠️ As compras e créditos ativos serão arquivados no histórico e o saldo atual será zerado.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmPaymentModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm cursor-pointer border border-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFullPayment}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm cursor-pointer shadow-lg"
                >
                  {isSubmitting ? 'Quitando...' : 'Quitar Conta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Histórico de Pagamentos */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <h3 className="text-lg font-bold text-blue-400">
                Histórico de Pagamentos
              </h3>

              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {selectedCustomer?.payments_history && selectedCustomer.payments_history.length > 0 ? (
                  selectedCustomer.payments_history.map((pay, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
                        <span>Data: {pay.date}</span>
                        <span className="text-green-400 font-bold text-sm">
                          {formatCurrency(pay.amountPaid / 100)}
                        </span>
                      </div>

                      {/* Itens detalhados contidos neste pagamento */}
                      {pay.items && pay.items.length > 0 && (
                        <div className="pt-2 border-t border-gray-800 space-y-1">
                          <span className="text-[10px] text-gray-500 uppercase font-bold block">
                            Compras quitadas neste pagamento:
                          </span>
                          {pay.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex justify-between text-xs text-gray-300 font-mono"
                            >
                              <span className="text-gray-400">{item.date}</span>
                              <span>{formatCurrency(item.price / 100)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs text-center py-6 bg-gray-950 rounded-xl border border-gray-800">
                    Nenhum pagamento registrado no histórico.
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm cursor-pointer border border-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes da Compra Atual */}
        {isDetailsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <h3 className="text-lg font-bold text-blue-400">
                Detalhes da Conta Atual
              </h3>

              <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                {/* Compras Pendentes (Ativas) */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-amber-400 mb-2">
                    Compras Em Aberto (Débitos)
                  </h4>
                  {selectedCustomer?.purchase && selectedCustomer.purchase.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.purchase.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-400 text-xs font-mono">{item.date}</span>
                          <span className="font-mono text-amber-400 font-bold">
                            {formatCurrency(item.price / 100)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 bg-gray-950 p-3 rounded-xl text-center border border-gray-800">
                      Nenhuma compra ativa em aberto.
                    </div>
                  )}
                </div>

                {/* Créditos Existentes */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-green-400 mb-2">
                    Créditos Lançados
                  </h4>
                  {selectedCustomer?.credits && selectedCustomer.credits.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.credits.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-400 text-xs font-mono">{item.date}</span>
                          <span className="font-mono text-green-400 font-bold">
                            {formatCurrency((item.amount || item.price || 0) / 100)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 bg-gray-950 p-3 rounded-xl text-center border border-gray-800">
                      Nenhum crédito registrado.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm cursor-pointer border border-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}