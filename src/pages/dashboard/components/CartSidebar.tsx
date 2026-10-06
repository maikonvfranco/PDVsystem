import { useState, useEffect } from 'react';
import type { CartItem, Product } from '../../../types';
import { AdminPinModal } from './AdminPinModal';

interface CartSidebarProps {
  cartItems: CartItem[];
  total: number;
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onAddToCart?: (product: Product) => void;
  onOpenProducts: () => void;
  onOpenAdmin: () => void;
  onOpenComanda: () => void;
  onCancelSale: () => void;
  onOpenPayment: () => void;
}

function QuantityInput({
  item,
  isKg,
  onUpdateQuantity,
}: {
  item: CartItem;
  isKg: boolean;
  onUpdateQuantity?: (id: string, quantity: number) => void;
}) {
  const currentDisplayVal = isKg
    ? Math.round(item.quantity * 1000).toString()
    : item.quantity.toString();

  const [inputValue, setInputValue] = useState(currentDisplayVal);

  useEffect(() => {
    setInputValue(currentDisplayVal);
  }, [currentDisplayVal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!onUpdateQuantity || val === '') return;

    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) return;

    if (isKg) {
      onUpdateQuantity(item.cartItemId, parsed / 1000);
    } else {
      onUpdateQuantity(item.cartItemId, Math.floor(parsed));
    }
  };

  const handleBlur = () => {
    if (inputValue === '' || parseFloat(inputValue) <= 0) {
      setInputValue(currentDisplayVal);
    }
  };

  return (
    <input
      type="number"
      min={1}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-14 bg-gray-950 text-center text-xs font-bold text-blue-400 rounded py-0.5 border border-gray-700 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

export function CartSidebar({
  cartItems,
  total,
  onRemoveFromCart,
  onUpdateQuantity,
  onAddToCart,
  onOpenAdmin,
  onCancelSale,
  onOpenPayment,
  onOpenComanda,
}: CartSidebarProps) {
  const hasItems = cartItems.length > 0;
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const checkIsKg = (item: CartItem): boolean => {
    const unit = item.product.unit ?? 'un';
    return unit === 'kg' || Boolean(item.isWeightedPrice);
  };

  const calculateItemSubtotal = (item: CartItem): number => {
    if (item.isWeightedPrice) {
      return Math.floor(item.product.price * 100) / 100;
    }
    // Math.floor para ser arredondando para baixo
    return Math.floor(item.product.price * item.quantity * 100) / 100;
  };

  const handleDecrease = (item: CartItem) => {
    const isKg = checkIsKg(item);
    const step = isKg ? 0.1 : 1;
    const nextQty = Number((item.quantity - step).toFixed(3));

    if (nextQty > 0 && onUpdateQuantity) {
      onUpdateQuantity(item.cartItemId, nextQty);
    } else {
      onRemoveFromCart(item.cartItemId);
    }
  };

  const handleIncrease = (item: CartItem) => {
    const isKg = checkIsKg(item);
    const step = isKg ? 0.1 : 1;
    const nextQty = Number((item.quantity + step).toFixed(3));

    if (onUpdateQuantity) {
      onUpdateQuantity(item.cartItemId, nextQty);
    } else if (onAddToCart) {
      onAddToCart(item.product);
    }
  };

  return (
    <div
      className="p-4 w-1/2 flex flex-col justify-between border-l border-gray-800 bg-gray-950"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gray-900 p-4 rounded-xl flex-1 overflow-auto border border-gray-800 shadow-inner">
        <h2 className="font-bold text-lg mb-2 text-blue-400">Itens do Cupom:</h2>
        <div className="space-y-2">
          {cartItems.map((item) => {
            const isKg = checkIsKg(item);
            const displayVal = isKg
              ? Math.round(item.quantity * 1000)
              : item.quantity;
            const subtotal = calculateItemSubtotal(item);

            return (
              <div
                key={item.cartItemId}
                className="flex justify-between items-center font-mono border-b border-gray-800 pb-2 group"
              >
                <div className="flex-1 pr-2 truncate">
                  <span className="text-gray-400 font-bold mr-2">
                    {displayVal}{isKg ? 'g' : 'un'}
                  </span>
                  <span>{item.product.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleDecrease(item)}
                      className="px-2 py-0.5 hover:bg-gray-700 text-gray-300 font-bold transition-colors cursor-pointer"
                    >
                      -
                    </button>

                    <div className="flex items-center px-1">
                      <QuantityInput
                        item={item}
                        isKg={isKg}
                        onUpdateQuantity={onUpdateQuantity}
                      />
                      <span className="text-[10px] text-gray-400 ml-1 font-sans">
                        {isKg ? 'g' : 'un'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleIncrease(item)}
                      className="px-2 py-0.5 hover:bg-gray-700 text-gray-300 font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-white min-w-[75px] text-right">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(subtotal)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(item.cartItemId)}
                    className="bg-red-950 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer md:opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center py-4">
        <p className="font-bold text-3xl">Total:</p>
        <p className="font-bold text-4xl text-green-400 font-mono">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onOpenComanda}
          className="p-4 rounded-xl bg-gray-700 font-bold hover:bg-gray-600 cursor-pointer transition-colors"
        >
          Adicionar
        </button>

        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="p-4 rounded-xl bg-gray-700 font-bold hover:bg-gray-600 cursor-pointer transition-colors"
        >
          Admin
        </button>

        <button
          disabled={!hasItems}
          onClick={onCancelSale}
          className={`p-4 rounded-xl font-bold transition-colors ${hasItems ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
        >
          Cancelar
        </button>

        <button
          disabled={!hasItems}
          onClick={onOpenPayment}
          className={`p-4 rounded-xl font-bold transition-colors ${hasItems ? 'bg-green-600 hover:bg-green-700 cursor-pointer shadow-lg' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
        >
          Finalizar
        </button>
      </div>

      <AdminPinModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          setIsAdminModalOpen(false);
          onOpenAdmin();
        }}
      />
    </div>
  );
}