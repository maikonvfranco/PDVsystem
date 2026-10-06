import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminHub } from '../../hooks/useAdminHub';
import { MetricCard } from './components/MetricCard';
import { NavigationCard } from './components/NavigationCard';
import { CashActionModal } from './components/CashActionModal';
import { OpenCashModal } from './components/OpenCashModal';
import { SalesHistoryModal } from './components/SalesHistoryModal'; // 🟢 Importação do Modal de Histórico

import "../../styles/index.css";

export default function AdminHub() {
  const navigate = useNavigate();
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false); // 🟢 Estado do Modal

  const {
    summary,
    loading,
    isCashModalOpen,
    setIsCashModalOpen,
    isOpenCashModalOpen,
    setIsOpenCashModalOpen,
    modalType,
    openCashAction,
    handleCashActionSubmit,
    handleOpenCash,
    handleCloseCash,
  } = useAdminHub();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Cabeçalho */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-gray-400 text-sm">
            Gerencie o caixa, acompanhe o histórico e controle as configurações do PDV.
          </p>
        </div>
        
        <div className="flex gap-3">
          {/* Botão de Alternar Status de Caixa */}
          {summary.isCashOpen ? (
            <button
              onClick={handleCloseCash}
              className="px-5 py-3 bg-red-600/20 hover:bg-red-600 border border-red-500/50 text-red-300 hover:text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              🔒 Fechar Caixa
            </button>
          ) : (
            <button
              onClick={() => setIsOpenCashModalOpen(true)}
              className="px-5 py-3 bg-green-600 hover:bg-green-700 font-bold rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 text-white"
            >
              🔓 Abrir Caixa
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
          >
            🛒 Ir para o PDV (Caixa)
          </button>
        </div>
      </div>

      {/* Faixa de Métricas Rápidas */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Vendas Hoje"
          value={loading ? '...' : formatCurrency(summary.todaySalesTotal)}
          subtitle={`${summary.todaySalesCount} cupons emitidos`}
          icon="📊"
          color="green"
        />
        <MetricCard
          title="Saldo em Gaveta"
          value={loading ? '...' : formatCurrency(summary.cashBalance)}
          subtitle="Valor estimado em caixa"
          icon="💵"
          color="amber"
        />
        <MetricCard
          title="Status do Caixa"
          value={summary.isCashOpen ? 'ABERTO' : 'FECHADO'}
          subtitle="Caixa operador principal"
          icon={summary.isCashOpen ? '🟢' : '🔴'}
          color={summary.isCashOpen ? 'blue' : 'purple'}
        />
      </div>

      {/* Grade de Navegação para Módulos */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-300">Operações e Módulos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Abrir / Fechar Caixa */}
          <NavigationCard
            title={summary.isCashOpen ? "Fechar Caixa" : "Abrir Caixa"}
            description={
              summary.isCashOpen
                ? "Confira o saldo em gaveta e encerre o turno do caixa."
                : "Informe o suprimento inicial de troco para abrir o caixa."
            }
            icon={summary.isCashOpen ? "🔒" : "🔓"}
            badge={summary.isCashOpen ? "Caixa Aberto" : "Caixa Fechado"}
            variant={summary.isCashOpen ? "warning" : "default"}
            onClick={() => {
              if (summary.isCashOpen) {
                handleCloseCash();
              } else {
                setIsOpenCashModalOpen(true);
              }
            }}
          />

          {/* Card 2: Sangria */}
          <NavigationCard
            title="Sangria de Caixa"
            description="Realize a retirada de notas em excesso do caixa para garantir a segurança."
            icon="💸"
            onClick={() => openCashAction('sangria')}
          />

          {/* Card 3: Suprimento */}
          <NavigationCard
            title="Suprimento (Reforço)"
            description="Adicione dinheiro ou troco extra no caixa da loja."
            icon="💰"
            onClick={() => openCashAction('suprimento')}
          />

          {/* Card 7: CLientes fiado */}
          <NavigationCard
            title="Anotaçâo clientes"
            description="Visualiaze anotações dos clientes."
            icon="📝"
            onClick={() => navigate('/customers')}
          />

          {/* Card 4: Histórico de Vendas 🟢 AGORA ABRE O MODAL */}
          <NavigationCard
            title="Histórico de Vendas"
            description="Consulte comprovantes emitidos, reimprima cupons e gerencie cancelamentos."
            icon="📜"
            onClick={() => setIsSalesHistoryOpen(true)}
          />

          {/* Card 5: Dashboard e Relatórios */}
          <NavigationCard
            title="Dashboard Financeiro"
            description="Gráficos de desempenho, curva ABC de produtos e métodos de pagamento mais usados."
            icon="📈"
            onClick={() => navigate('/admin/financial')}
          />

          {/* Card 6: Gestão de Produtos */}
          <NavigationCard
            title="Cadastro de Produtos"
            description="Gerencie o catálogo, código de barras, categorias e altere os preços do sistema."
            icon="📦"
            onClick={() => navigate('/products')}
          />


          <NavigationCard
            title="Custos e Despesas"
            description="Visualize os gastos da empresa e gerencie despesas."
            icon="💳"
            onClick={() => navigate('/expenses')}
          />

        </div>
      </div>

      {/* Modal para Sangria / Suprimento */}
      <CashActionModal
        isOpen={isCashModalOpen}
        type={modalType}
        onClose={() => setIsCashModalOpen(false)}
        onSubmit={handleCashActionSubmit}
      />

      {/* Modal para Abrir Caixa */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onSubmit={handleOpenCash}
      />

      {/* 🟢 Modal do Histórico de Vendas */}
      <SalesHistoryModal
        isOpen={isSalesHistoryOpen}
        onClose={() => setIsSalesHistoryOpen(false)}
      />
    </div>
  );
}