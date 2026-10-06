import { useMemo } from 'react';
import type { Product } from '../../../types';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string, name: string) => void;
}

export function ProductTable({ products, loading, onEdit, onDelete }: ProductTableProps) {
  // Agrupa e ordena categoricamente e alfabeticamente de forma garantida
  const sortedAndGroupedProducts = useMemo(() => {
    // 1. Agrupa os produtos em uma Map/Objeto temporário
    const grouped = products.reduce((acc, product) => {
      const category = product.category?.trim() || 'Sem Categoria';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    // 2. Transforma em Array de Categorias Ordenado (A-Z)
    const sortedCategories = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );

    // 3. Monta a estrutura final ordenando os PRODUTOS (A-Z) dentro de cada categoria
    return sortedCategories.map((categoryName) => {
      const sortedProducts = [...grouped[categoryName]].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );

      return {
        categoryName,
        products: sortedProducts,
      };
    });
  }, [products]);

  const isInternalCode = (code: string) => {
    const cleanCode = code.replace(/\D/g, '');
    return cleanCode.length < 8 || code.length !== cleanCode.length;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center text-gray-400 animate-pulse">
        Carregando estoque...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="max-w-6xl mx-auto bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center text-gray-500">
        Nenhum produto atende aos critérios de busca atuais.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Resumo no topo */}
      <div className="flex justify-between items-center text-xs text-gray-400 px-2">
        <span>Exibindo <strong>{products.length}</strong> produtos</span>
        <span><strong>{sortedAndGroupedProducts.length}</strong> categorias encontradas</span>
      </div>

      {/* Renderização por Blocos de Categorias Ordenados */}
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {sortedAndGroupedProducts.map(({ categoryName, products: categoryProducts }) => (
          <div 
            key={categoryName} 
            className="bg-gray-800/90 border border-gray-700 rounded-2xl overflow-hidden shadow-xl"
          >
            {/* Cabeçalho do Bloco de Categoria */}
            <div className="bg-gray-900/80 px-6 py-3 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <h3 className="font-bold text-gray-200 text-base">{categoryName}</h3>
              </div>
              <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400 border border-gray-700 font-medium">
                {categoryProducts.length} {categoryProducts.length === 1 ? 'produto' : 'produtos'}
              </span>
            </div>

            {/* Tabela do Bloco */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-700/60 bg-gray-900/30">
                    <th className="py-3 px-6 w-1/4">Código</th>
                    <th className="py-3 px-6 w-2/5">Nome do Produto</th>
                    <th className="py-3 px-6 text-right w-1/5">Preço Unitário</th>
                    <th className="py-3 px-6 text-center w-1/5">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40 text-sm">
                  {categoryProducts.map((product) => {
                    const internal = isInternalCode(product.code);
                    return (
                      <tr 
                        key={product.id} 
                        className="hover:bg-gray-700/30 transition-colors group"
                      >
                        {/* Código de barras + Tag Interno/Externo */}
                        <td className="py-3.5 px-6 font-mono text-green-400">
                          <div className="flex items-center gap-2">
                            <span>{product.code}</span>
                            <span 
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                internal 
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/80' 
                                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                              }`}
                              title={internal ? 'Código Interno da Loja' : 'Código de Barras Industrial (EAN/UPC)'}
                            >
                              {internal ? 'INT' : 'EXT'}
                            </span>
                          </div>
                        </td>

                        {/* Nome do Produto */}
                        <td className="py-3.5 px-6 font-medium text-gray-200 group-hover:text-white">
                          {product.name}
                        </td>

                        {/* Preço */}
                        <td className="py-3.5 px-6 text-right font-mono font-bold text-blue-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onEdit(product)}
                              className="bg-gray-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onDelete(product.id, product.name)}
                              className="bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              Apagar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}