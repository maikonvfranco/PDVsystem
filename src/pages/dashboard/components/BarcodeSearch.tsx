import { useState } from 'react';
import type { RefObject } from 'react';
import type { Product } from '../../../types';
import { toast } from 'react-toastify';
import { extractProductCode } from '../../../hooks/usePOS'; // Importe a função aqui

interface BarcodeSearchProps {
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
  filteredProducts: Product[];
  inputRef: RefObject<HTMLInputElement | null>;
  isCashOpen?: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onSelectProduct: (product: Product) => void;
  onBlurKeepFocus: () => void;
  onOpenRegisterModal?: (initialCode: string) => void;
}

export function BarcodeSearch({
  barcodeInput,
  setBarcodeInput,
  showDropdown,
  setShowDropdown,
  filteredProducts,
  inputRef,
  isCashOpen = true,
  onSubmit,
  onSelectProduct,
  onBlurKeepFocus,
  onOpenRegisterModal,
}: BarcodeSearchProps) {
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCashOpen) {
      toast.warn("Caixa fechado! Abra o caixa para registrar produtos.");
      return;
    }

    const trimmedInput = barcodeInput.trim();

    // Se não encontrou o produto mesmo após a busca (incluindo tratamento de balança)
    if (trimmedInput.length > 0 && filteredProducts.length === 0) {
      setShowDropdown(false);
      // Extrai o código caso seja etiqueta de balança para não cadastrar o código de 12 dígitos
      const codeToRegister = extractProductCode(trimmedInput);
      setPendingCode(codeToRegister);
      return;
    }

    onSubmit(e);
  };

  const handleSelect = (product: Product) => {
    if (!isCashOpen) {
      toast.warn("Caixa fechado! Abra o caixa para registrar produtos.");
      return;
    }
    onSelectProduct(product);
  };

  const handleCancelRegister = () => {
    setPendingCode(null);
    setBarcodeInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleConfirmRegister = () => {
    if (!pendingCode) return;
    const codeToRegister = pendingCode;
    setPendingCode(null);
    setBarcodeInput('');
    if (onOpenRegisterModal) {
      onOpenRegisterModal(codeToRegister);
    }
  };

  return (
    <div className="relative mb-4" onClick={(e) => e.stopPropagation()}>
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          disabled={!isCashOpen || !!pendingCode}
          placeholder={isCashOpen ? "Bipe o código ou digite o nome do produto..." : "🔒 Caixa fechado. Abra para bipar produtos."}
          value={barcodeInput}
          onChange={(e) => {
            setBarcodeInput(e.target.value);
            setShowDropdown(e.target.value.length > 0);
          }}
          onFocus={() => {
            if (isCashOpen && barcodeInput.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              const active = document.activeElement;
              if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                return;
              }
              if (isCashOpen && !pendingCode) onBlurKeepFocus();
            }, 50);
          }}
          autoFocus={isCashOpen}
          className={`flex-1 border rounded-xl px-4 py-3 text-lg font-mono placeholder-gray-500 focus:outline-none shadow-inner ${
            isCashOpen
              ? 'bg-gray-950 border-gray-700 text-green-400 focus:border-blue-500'
              : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        />
      </form>

      {/* Dropdown de Sugestões */}
      {isCashOpen && showDropdown && filteredProducts.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl divide-y divide-gray-800">
          {filteredProducts.map((product) => (
            <li
              key={product.id}
              onClick={() => handleSelect(product)}
              className="flex justify-between items-center px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-white font-medium">{product.name}</span>
                <span className="text-sm font-mono text-gray-400">Cód: {product.code}</span>
              </div>
              <span className="text-green-400 font-bold font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Dropdown aviso rápido */}
      {isCashOpen && showDropdown && barcodeInput.length > 0 && filteredProducts.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 p-4 bg-gray-900 border border-gray-700 rounded-xl flex justify-between items-center shadow-2xl">
          <span className="text-gray-400 text-sm">
            Nenhum produto encontrado
          </span>
          <button
            type="button"
            onClick={() => {
              setShowDropdown(false);
              setPendingCode(extractProductCode(barcodeInput.trim()));
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cadastrar
          </button>
        </div>
      )}

      {/* 🛑 MODAL BLOQUEANTE DE CONFIRMAÇÃO 🛑 */}
      {pendingCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[999] animate-in fade-in duration-150">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400 text-xl font-bold">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Produto não cadastrado
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Deseja realizar o cadastro deste item agora? (Código: {pendingCode})
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={handleCancelRegister}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors cursor-pointer border border-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRegister}
                autoFocus
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-lg"
              >
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}