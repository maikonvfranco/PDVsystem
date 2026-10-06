import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { HeaderActions } from '../adminProducts/components/HeaderActions';
import { ProductTable } from '../adminProducts/components/ProductTable';
import { ProductModal } from '../adminProducts/components/ProductModal';
import type { Product } from '../../types';

import "../../styles/index.css";

export default function AdminProducts() {
  const navigate = useNavigate();
  const {
    filteredProducts,
    existingCategories,
    loading,
    searchTerm,
    setSearchTerm,
    saveProduct,
    deleteProduct,
  } = useProducts();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <HeaderActions
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenCreateModal={handleOpenCreateModal}
        onBack={() => navigate('/')}
      />

      <ProductTable
        products={filteredProducts}
        loading={loading}
        onEdit={handleOpenEditModal}
        onDelete={deleteProduct}
      />

      <ProductModal
        isOpen={isModalOpen}
        editingProduct={editingProduct}
        existingCategories={existingCategories}
        onClose={() => setIsModalOpen(false)}
        onSave={saveProduct}
      />
    </div>
  );
}