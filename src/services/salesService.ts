import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/services/firebase';
import type { CartItem } from '../types';
import { query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

export interface PaymentBreakdown {
  method: string;
  amount: number;
}

export interface RegisterSaleParams {
  sessionId?: string | null;
  total: number;
  paymentMethod: string;
  paymentsDetails?: PaymentBreakdown[];
  items: CartItem[];
  amountPaid: number;
  change: number;
}

export interface SaleRecord {
  id: string;
  sessionId?: string | null;
  totalAmount: number;
  paymentMethod: string;
  paymentsDetails?: PaymentBreakdown[];
  items: CartItem[];
  amountPaid?: number;
  change?: number;
  status: 'completed' | 'pending' | 'canceled';
  createdAt?: any;
  confirmedAt?: any;
}

/**
 * Função Auxiliar: Garante que o array paymentsDetails sempre contenha 
 * os dados exatos de cada método, mesmo para pagamentos únicos.
 */
function normalizePaymentsDetails(paymentMethod: string, total: number, paymentsDetails: PaymentBreakdown[] = []): PaymentBreakdown[] {
  if (paymentMethod === 'Múltiplo') {
    return paymentsDetails.filter(p => p.amount > 0);
  }
  return [{ method: paymentMethod, amount: total }];
}

// 🟢 Função para somar o dinheiro físico na gaveta
async function processCashEntries(
  paymentsDetails: PaymentBreakdown[] = [],
  change: number = 0,
  mainPaymentMethod: string,
  totalAmount: number
) {
  let netCashAmount = 0;

  if (mainPaymentMethod === 'Dinheiro') {
    // Venda 100% em dinheiro: O saldo líquido acrescido ao caixa é o valor total da venda
    netCashAmount = totalAmount;
  } else if (mainPaymentMethod === 'Múltiplo') {
    // Busca a parte do pagamento que foi feita em Dinheiro
    const cashPart = paymentsDetails.find((p) => p.method === 'Dinheiro' || p.method === 'dinheiro')?.amount || 0;
    // O dinheiro que entra na gaveta é a fatia em dinheiro menos o troco fornecido
    netCashAmount = Math.max(0, cashPart - change);
  }

  // Se entrou dinheiro na gaveta, atualiza o saldo do documento 'checkout/open'
  if (netCashAmount > 0) {
    const openCheckoutRef = doc(db, 'checkout', 'open');
    await updateDoc(openCheckoutRef, {
      cash: increment(netCashAmount),
    });
  }
}

// 1. Criar Venda (Direta ou Pendente)
export async function createSaleRecord(params: RegisterSaleParams, isPending: boolean = false) {
  try {
    const normalizedDetails = normalizePaymentsDetails(
      params.paymentMethod, 
      params.total, 
      params.paymentsDetails || []
    );

    const salePayload = {
      sessionId: params.sessionId || null,
      totalAmount: params.total,
      paymentMethod: params.paymentMethod,
      paymentsDetails: normalizedDetails,
      items: params.items,
      amountPaid: params.amountPaid,
      change: params.change,
      status: isPending ? 'pending' : 'completed',
      createdAt: serverTimestamp(),
    };

    // 🟢 Corrigido: Usa `params` em vez de `saleData`
    if (!isPending) {
      await processCashEntries(
        normalizedDetails,
        params.change,
        params.paymentMethod,
        params.total
      );
    }

    const docRef = await addDoc(collection(db, 'sales'), salePayload);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar registro de venda:', error);
    throw error;
  }
}

// 2. Confirmar Venda Pendente
export async function confirmPendingSale(
  saleId: string,
  finalMethod: string,
  total: number,
  paymentsDetails: PaymentBreakdown[] = [],
  change = 0,
  sessionId?: string | null
) {
  try {
    const finalPaymentsDetails = normalizePaymentsDetails(finalMethod, total, paymentsDetails);

    const saleRef = doc(db, 'sales', saleId);

    const updatePayload: Record<string, any> = {
      status: 'completed',
      paymentMethod: finalMethod,
      paymentsDetails: finalPaymentsDetails,
      change,
      confirmedAt: serverTimestamp(),
    };

    if (sessionId) {
      updatePayload.sessionId = sessionId;
    }

    await updateDoc(saleRef, updatePayload);

    // 🟢 Corrigido: Passando todos os 4 argumentos necessários para processCashEntries
    await processCashEntries(finalPaymentsDetails, change, finalMethod, total);
  } catch (error) {
    console.error('Erro ao confirmar venda pendente:', error);
    throw error;
  }
}

// 3. Cancelar Venda Pendente
export async function cancelPendingSale(saleId: string) {
  try {
    const saleRef = doc(db, 'sales', saleId);
    await updateDoc(saleRef, {
      status: 'canceled',
      canceledAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    throw error;
  }
}

export async function getSalesByPeriod(
  startDate: Date,
  endDate: Date,
  status: string = 'completed'
): Promise<SaleRecord[]> {
  try {
    const salesRef = collection(db, 'sales');
    
    let q;
    if (status === 'all') {
      q = query(
        salesRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        salesRef,
        where('status', '==', status),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const sales: SaleRecord[] = [];

    querySnapshot.forEach((docSnap) => {
      sales.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SaleRecord, 'id'>),
      });
    });

    return sales;
  } catch (error) {
    console.error("Erro ao buscar histórico de vendas:", error);
    throw error;
  }
}