import { useState, useEffect, useMemo, createElement } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import type { Product } from '../types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const existingCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category || 'Bolos')));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return products;

    return products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const code = product.code?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';

      return name.includes(searchLower) || code.includes(searchLower) || category.includes(searchLower);
    });
  }, [products, searchTerm]);

  const saveProduct = async (
    productData: { code: string; name: string; price: number; category: string; unit: string },
    editingId?: string
  ) => {
    try {
      if (editingId) {
        await api.updateProduct(editingId, productData);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await api.createProduct(productData);
        toast.success("Produto cadastrado com sucesso!");
      }
      await loadProducts();
      return true;
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar o produto.");
      return false;
    }
  };

  // Executa a remoção do produto na API
  const executeDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      toast.success("Produto removido!");
      await loadProducts();
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      toast.error("Erro ao remover o produto.");
    }
  };

  // Handler para Deletar Produto usando Toast interativo
  const deleteProduct = (id: string, name: string) => {
    toast.warn(
      ({ closeToast }) =>
        createElement(
          'div',
          { className: 'flex flex-col gap-2 p-1' },
          createElement(
            'span',
            { className: 'font-bold text-sm text-gray-100' },
            `Tem certeza que deseja apagar o produto "${name}"?`
          ),
          createElement(
            'div',
            { className: 'flex justify-end gap-2 mt-1' },
            createElement(
              'button',
              {
                onClick: closeToast,
                className: 'px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold cursor-pointer',
              },
              'Cancelar'
            ),
            createElement(
              'button',
              {
                onClick: () => {
                  closeToast();
                  executeDeleteProduct(id);
                },
                className: 'px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow',
              },
              'Excluir'
            )
          )
        ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );
  };

  return {
    products,
    filteredProducts,
    existingCategories,
    loading,
    searchTerm,
    setSearchTerm,
    saveProduct,
    deleteProduct,
  };
}