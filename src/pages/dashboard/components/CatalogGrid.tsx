import type { Product } from '../../../types';
import { toast } from 'react-toastify';
import { useMemo } from 'react';

interface CatalogGridProps {
  loading: boolean;
  categories: string[];
  selectedCategory: string | null;
  productsInSelectedCategory: Product[];
  isCashOpen?: boolean;
  onSelectCategory: (category: string | null) => void;
  onAddToCart: (product: Product) => void;
}

export function CatalogGrid({
  loading,
  categories,
  selectedCategory,
  productsInSelectedCategory,
  isCashOpen = true,
  onSelectCategory,
  onAddToCart,
}: CatalogGridProps) {

  // Ordena categorias em ordem alfabética
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [categories]);

  const handleProductClick = (product: Product) => {
    if (!isCashOpen) {
      toast.warn("O caixa está fechado! Abra o caixa para iniciar o atendimento.");
      return;
    }
    onAddToCart(product);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 font-medium animate-pulse">
        Carregando catálogo de produtos...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden gap-3">
      {!isCashOpen && (
        <div className="p-3 bg-red-950/80 border border-red-700/60 rounded-xl text-red-200 text-xs font-semibold flex items-center justify-between">
          <span>🔒 Caixa Fechado - Abra o caixa no Hub Admin para iniciar o atendimento.</span>
        </div>
      )}

      {/* 1. GRADE COMPACTA DE CATEGORIAS (Quebra linha automaticamente, sem scroll lateral) */}
      <div className="flex flex-wrap gap-2 shrink-0 bg-gray-900/40 p-2 rounded-2xl border border-gray-800">

        {sortedCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 2. GRADE PRINCIPAL DE PRODUTOS */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {productsInSelectedCategory.map((product) => (
            <button
              key={product.id}
              disabled={!isCashOpen}
              onClick={() => handleProductClick(product)}
              className={`p-3.5 rounded-2xl font-bold flex flex-col justify-between text-left transition-all border shadow-sm h-26 ${
                isCashOpen
                  ? 'bg-gray-800 hover:bg-gray-750 border-gray-700 text-white hover:border-blue-500 hover:scale-[1.02] cursor-pointer active:scale-95'
                  : 'bg-gray-800/40 border-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="text-sm text-gray-100 line-clamp-2 leading-tight font-medium">
                  {product.name}
                </span>
              </div>
              <span className="text-sm font-mono font-bold text-blue-400 self-end">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
              </span>
            </button>
          ))}
        </div>

        {productsInSelectedCategory.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Nenhum produto cadastrado nesta categoria.
          </div>
        )}
      </div>
    </div>
  );
}