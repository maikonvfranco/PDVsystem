import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import type { Product } from '../../../types';

interface ProductModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  initialCode?: string;
  existingCategories: string[];
  onClose: () => void;
  onSave: (
    productData: { code: string; name: string; price: number; category: string; unit: string },
    editingId?: string
  ) => Promise<boolean>;
}

export function ProductModal({
  isOpen,
  editingProduct,
  initialCode = '',
  existingCategories,
  onClose,
  onSave,
}: ProductModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Bolos');
  const [isWeighed, setIsWeighed] = useState(false); // 🟢 NOVO: Marcação de balança
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const sortedCategories = [...existingCategories].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

  const fetchProductByEan = async (barcode: string) => {
    const cleanCode = barcode.trim();
    if (cleanCode.length < 8 || editingProduct) return;

    setIsLoadingApi(true);
    let productName = '';

    try {
      const cosmosRes = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${cleanCode}.json`, {
        headers: {
          'X-Cosmos-Token': 'SEU_TOKEN_COSMOS_AQUI'
        }
      });

      if (cosmosRes.ok) {
        const cosmosData = await cosmosRes.json();
        if (cosmosData.description) {
          productName = cosmosData.description;
        }
      }
    } catch {
      // Falhou no Cosmos
    }

    if (!productName) {
      try {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`);
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.status === 1 && offData.product) {
            productName = offData.product.product_name_pt || offData.product.product_name || '';
          }
        }
      } catch {
        // Falhou na Open Food Facts
      }
    }

    setIsLoadingApi(false);

    if (productName) {
      setName(productName);
      setTimeout(() => priceInputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    if (editingProduct) {
      setCode(editingProduct.code);
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setCategory(editingProduct.category);
      setIsWeighed(editingProduct.unit === 'kg');
    } else {
      const targetCode = initialCode || '';
      setCode(targetCode);
      setName('');
      setPrice('');
      setCategory((prev) => (prev ? prev : sortedCategories[0] || 'Bolos'));
      setIsWeighed(false);

      if (targetCode.length >= 8) {
        fetchProductByEan(targetCode);
      }
    }
    setIsCreatingNewCategory(false);
    setNewCategoryName('');

    if (isOpen && !editingProduct) {
      setTimeout(() => {
        if (initialCode) {
          priceInputRef.current?.focus();
        } else {
          codeInputRef.current?.focus();
        }
      }, 100);
    }
  }, [editingProduct, isOpen, initialCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCode(val);

    if (val.trim().length === 13) {
      fetchProductByEan(val);
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchProductByEan(code);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCreatingNewCategory ? newCategoryName.trim() : category;
    const numericPrice = parseFloat(price.replace(',', '.'));

    if (!code || !name || !price || !finalCategory || isNaN(numericPrice)) {
      toast.warning('Preencha todos os campos obrigatórios com valores válidos!');
      return;
    }

    const success = await onSave(
      {
        code,
        name,
        price: numericPrice,
        category: finalCategory,
        unit: isWeighed ? 'kg' : 'un', // 🟢 Envia "kg" se checado, senão "un"
      },
      editingProduct?.id
    );

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-400">
            {editingProduct ? '📝 Editar Valores' : '✨ Cadastrar Produto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white font-bold text-xl px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm text-gray-400">Código de Barras / Interno</label>
              {isLoadingApi && (
                <span className="text-xs text-blue-400 animate-pulse font-semibold">
                  Buscando dados...
                </span>
              )}
            </div>
            <input
              ref={codeInputRef}
              type="text"
              required
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleCodeKeyDown}
              placeholder="Bipe o código EAN ou digite o código interno..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome do Produto</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bolo de Chocolate Cremoso"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Preço de Venda (R$)</label>
            <input
              ref={priceInputRef}
              type="text"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, '');
                setPrice(val);
              }}
              placeholder="0,00"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Seletor unidade ou peso */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">
              Como este produto é vendido?
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-950 border border-gray-800 rounded-xl">
              <button
                type="button"
                onClick={() => setIsWeighed(false)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${!isWeighed
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                    : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                  }`}
              >
                <span className="text-base">📦</span>
                <span>Unidade</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWeighed(true)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${isWeighed
                    ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-300'
                    : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                  }`}
              >
                <span className="text-base">⚖️</span>
                <span>Kilogramas</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm text-gray-400">Categoria</label>
              <button
                type="button"
                onClick={() => setIsCreatingNewCategory(!isCreatingNewCategory)}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
              >
                {isCreatingNewCategory ? 'selecionar existente' : '➕ criar nova categoria'}
              </button>
            </div>

            {isCreatingNewCategory ? (
              <input
                type="text"
                required
                placeholder="Digite o nome da nova categoria..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-gray-900 border border-blue-500 rounded-xl p-3 text-white focus:outline-none"
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {sortedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                {sortedCategories.length === 0 && <option value="Bolos">Bolos</option>}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
            >
              {editingProduct ? 'Atualizar' : 'Salvar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}