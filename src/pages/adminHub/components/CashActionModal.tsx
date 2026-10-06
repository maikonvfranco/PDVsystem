import { useState } from 'react';
import { toast } from 'react-toastify';

interface CashActionModalProps {
  isOpen: boolean;
  type: 'sangria' | 'suprimento';
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => Promise<boolean>;
}

export function CashActionModal({ isOpen, type, onClose, onSubmit }: CashActionModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isSangria = type === 'sangria';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.warn("Informe um valor válido!");
      return;
    }

    const success = await onSubmit(numericAmount, reason);
    if (success) {
      toast.success(
        `${isSangria ? 'Sangria' : 'Suprimento'} de R$ ${numericAmount.toFixed(2)} registrado com sucesso!`
      );
      setAmount('');
      setReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
        <h2 className={`text-2xl font-bold mb-1 ${isSangria ? 'text-red-400' : 'text-green-400'}`}>
          {isSangria ? '💸 Realizar Sangria (Retirada)' : '💰 Adicionar Suprimento (Reforço)'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {isSangria
            ? 'Retire dinheiro do caixa de gaveta para segurança.'
            : 'Adicione troco ou saldo inicial ao caixa.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 font-mono text-xl text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Motivo / Observação</label>
            <textarea
              rows={3}
              placeholder="Ex: Depósito no banco, pagamento de fornecedor..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 font-bold rounded-xl transition-colors cursor-pointer ${
                isSangria ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Confirmar {isSangria ? 'Sangria' : 'Suprimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}