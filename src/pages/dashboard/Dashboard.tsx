import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UpdateBanner } from './components/UpdateBanner';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase/services/firebase';
import { useCart } from '../../hooks/useCart';
import { usePOS } from '../../hooks/usePOS';
import { BarcodeSearch } from './components/BarcodeSearch';
import { CatalogGrid } from './components/CatalogGrid';
import { CartSidebar } from './components/CartSidebar';
import { PaymentModal } from './components/PaymentModal';
import { ComandaModal } from './components/ComandaModal';
import { PendingSalesBar, type PendingSale } from './components/PendingSalesBar';
import { ProductModal } from '../adminProducts/components/ProductModal';
import type { Product } from '../../types';

import "../../styles/index.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { cartItems, total, updateQuantity, clearCart, addToCart, removeFromCart } = useCart();
  
  // Modais de operação
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isComandaModalOpen, setIsComandaModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [selectedPendingSale, setSelectedPendingSale] = useState<PendingSale | null>(null);

  // Cadastro rápido de produtos não encontrados
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [initialProductCode, setInitialProductCode] = useState('');

  // Flag para controle do focar automático no scanner de código de barras
  const isAnyModalOpen = isPaymentModalOpen || isComandaModalOpen || isCancelConfirmOpen || isProductModalOpen;

  // Estado da sessão do caixa
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // Listener em tempo real para status do caixa aberto/fechado
  useEffect(() => {
    const checkoutRef = doc(db, 'checkout', 'open');
    const unsubscribe = onSnapshot(checkoutRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsCheckoutOpen(!!data.isOpen);
        setSessionId(data.isOpen ? data.activeSessionId || null : null);
      } else {
        setIsCheckoutOpen(false);
        setSessionId(null);
      }
    }, (error) => {
      console.error("Erro ao escutar estado do caixa:", error);
    });

    return () => unsubscribe();
  }, []);

  const {
    productsInSelectedCategory,
    categories,
    filteredProducts,
    loading,
    selectedCategory,
    setSelectedCategory,
    barcodeInput,
    setBarcodeInput,
    showDropdown,
    setShowDropdown,
    barcodeInputRef,
    focusInput,
    handleBarcodeSubmit,
    handleSelectProduct,
  } = usePOS({
    addToCart,
    isPaymentModalOpen: isAnyModalOpen,
  });

  const forceFocus = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const handleOpenRegisterModal = (code: string) => {
    setInitialProductCode(code);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (
    productData: { code: string; name: string; price: number; category: string; unit: string },
    editingId?: string
  ): Promise<boolean> => {
    try {
      if (editingId) {
        const productRef = doc(db, 'products', editingId);
        await updateDoc(productRef, {
          ...productData,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        });

        const newProduct: Product = {
          id: docRef.id,
          ...productData,
        };

        toast.success(`Produto "${newProduct.name}" cadastrado com sucesso!`);
        addToCart(newProduct);
      }

      setIsProductModalOpen(false);
      setInitialProductCode('');
      forceFocus();

      return true;
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto.");
      return false;
    }
  };

  const handleOpenNewPayment = () => {
    if (!isCheckoutOpen) {
      toast.warning("O caixa está fechado! Abra o caixa para realizar vendas.");
      forceFocus();
      return;
    }
    setSelectedPendingSale(null);
    setIsPaymentModalOpen(true);
  };

  const handleSelectPendingSale = (sale: PendingSale) => {
    setSelectedPendingSale(sale);
    setIsPaymentModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPendingSale(null);
    forceFocus();
  };

  const handleConfirmCancelSale = () => {
    clearCart();
    setIsCancelConfirmOpen(false);
    toast.info("Venda cancelada com sucesso.");
    forceFocus();
  };

  const handleContainerClick = () => {
    if (!isAnyModalOpen) {
      focusInput();
    }
  };

  return (
    <div onClick={handleContainerClick} className="flex flex-col h-screen bg-gray-800 text-white select-none">

      <UpdateBanner />

      {/* Header */}
      <div className="p-4 flex items-center justify-between h-15 bg-gray-800 border-b border-gray-700 px-6">
        <h1 className="text-2xl font-bold">Painel de Vendas (PDV)</h1>

        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isCheckoutOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-semibold">
            {isCheckoutOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
          </span>
        </div>
      </div>

      {!isCheckoutOpen && (
        <div className="bg-red-900/60 border-b border-red-500/50 p-2.5 text-center font-bold text-red-200 text-sm flex items-center justify-center gap-2">
          <span>⚠️ O Caixa está FECHADO. Abra o caixa para iniciar e registrar vendas no banco de dados.</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-row flex-1 bg-gray-900 overflow-hidden">
        <div className="w-1/2 flex flex-col p-4 overflow-hidden">
          <BarcodeSearch
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            filteredProducts={filteredProducts}
            inputRef={barcodeInputRef}
            isCashOpen={isCheckoutOpen}
            onSubmit={handleBarcodeSubmit}
            onSelectProduct={handleSelectProduct}
            onBlurKeepFocus={() => {
              if (!isAnyModalOpen) {
                focusInput();
              }
            }}
            onOpenRegisterModal={handleOpenRegisterModal}
          />
          <CatalogGrid
            loading={loading}
            categories={categories}
            selectedCategory={selectedCategory}
            productsInSelectedCategory={productsInSelectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={addToCart}
          />
        </div>

        <CartSidebar
          cartItems={cartItems}
          total={total}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onCancelSale={() => setIsCancelConfirmOpen(true)}
          onOpenPayment={handleOpenNewPayment}
          onOpenComanda={() => setIsComandaModalOpen(true)}
          onOpenProducts={() => navigate('/products')}
          onOpenAdmin={() => navigate('/admin')}
        />
      </div>

      <PendingSalesBar
        sessionId={sessionId}
        onSelectPendingSale={handleSelectPendingSale}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleCloseModal}
        total={selectedPendingSale ? selectedPendingSale.total : total}
        cartItems={selectedPendingSale ? selectedPendingSale.items : cartItems}
        pendingSaleId={selectedPendingSale?.id}
        sessionId={sessionId}
        onFinalizeSuccess={() => {
          if (!selectedPendingSale) {
            clearCart();
          }
          handleCloseModal();
        }}
      />

      <ComandaModal
        isOpen={isComandaModalOpen}
        onClose={() => {
          setIsComandaModalOpen(false);
          forceFocus();
        }}
        onAddToCart={(amount) => {
          addToCart({
            id: `comanda-${Date.now()}`,
            code: 'COMANDA',
            name: 'Comanda',
            price: amount,
            category: 'Comandas',
            unit: 'un',
          });
        }}
      />

      {/* Confirmation Modal - Cancel Sale */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">Cancelar Venda?</h3>
            <p className="text-sm text-gray-400">
              Todos os itens adicionados ao carrinho serão removidos.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsCancelConfirmOpen(false);
                  forceFocus();
                }}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancelSale}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rapid Product Registration Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        editingProduct={null}
        initialCode={initialProductCode}
        existingCategories={categories}
        onClose={() => {
          setIsProductModalOpen(false);
          setInitialProductCode('');
          forceFocus();
        }}
        onSave={handleSaveProduct}
      />
    </div>
  );
}