interface HeaderActionsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateModal: () => void;
  onBack: () => void;
}

export function HeaderActions({
  searchTerm,
  onSearchChange,
  onOpenCreateModal,
  onBack,
}: HeaderActionsProps) {
  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="flex gap-3 w-full md:w-auto">
        <button
          onClick={onBack}
          className="px-5 py-3 bg-gray-700 hover:bg-gray-600 font-bold rounded-xl transition-colors cursor-pointer"
        >
          Voltar
        </button>
        
        <div className="hidden sm:block">
          <h1 className="text-3xl font-bold">Gerenciamento de Produtos</h1>
          <p className="text-gray-400 text-sm">Cadastre novos itens, altere preços ou remova produtos do PDV.</p>
        </div>
      </div>

      <div className="w-full md:flex-1 md:max-w-md mx-0 md:mx-4">
        <input
          type="text"
          placeholder="Pesquisar por nome, código ou categoria..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-medium text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 shadow-inner"
        />
      </div>
      
      <button
        onClick={onOpenCreateModal}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 whitespace-nowrap w-full md:w-auto"
      >
        ➕ Novo Produto
      </button>
    </div>
  );
}