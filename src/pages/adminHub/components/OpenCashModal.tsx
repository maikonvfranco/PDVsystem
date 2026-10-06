import { useState } from 'react';

interface OpenCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (initialCash: number) => Promise<boolean>;
}

export function OpenCashModal({ isOpen, onClose, onSubmit }: OpenCashModalProps) {
  const [initialCash, setInitialCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(initialCash) || 0;

    setIsSubmitting(true);
    const success = await onSubmit(amount);
    setIsSubmitting(false);

    if (success) {
      setInitialCash('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-green-400">🔓 Abrir Caixa</h2>
        <p className="text-gray-400 text-sm mb-6">
          Informe o valor em dinheiro (troco/fundo inicial) presente na gaveta para iniciar as operações.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fundo de Caixa Inicial (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0,00"
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 font-mono text-xl text-green-400 focus:outline-none focus:border-green-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 font-bold rounded-xl transition-colors cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Abrindo...' : 'Confirmar Abertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}