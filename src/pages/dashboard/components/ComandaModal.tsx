import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

interface ComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Ação única: envia o valor da comanda para o carrinho
  onAddToCart: (amount: number) => void;
}

export function ComandaModal({ isOpen, onClose, onAddToCart }: ComandaModalProps) {
  const [amountInput, setAmountInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountInput('');
      // Foco automático no input ao abrir o modal
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sanitiza a entrada substituindo vírgula por ponto para cálculo preciso dos centavos
  const totalAmount = parseFloat(amountInput.replace(',', '.')) || 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (totalAmount <= 0) {
      toast.warning('Informe um valor válido para a comanda.');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    onAddToCart(totalAmount);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-white flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <h2 className="text-xl font-bold text-amber-400">Adicionar Comanda</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Input do Valor */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Valor da Comanda (R$):
          </label>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amountInput}
            onChange={(e) => {
              // Permite apenas números, vírgula e ponto
              const val = e.target.value.replace(/[^0-9.,]/g, '');
              setAmountInput(val);
            }}
            autoFocus
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-3xl font-mono text-green-400 font-bold focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Botão Único */}
        <button
          type="submit"
          disabled={totalAmount <= 0}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-lg transition-all ${
            totalAmount > 0
              ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/20'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          🛒 Adicionar ao Carrinho
        </button>
      </form>
    </div>
  );
}