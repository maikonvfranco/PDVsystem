// src/services/checkoutService.ts
import { doc, setDoc, collection, addDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase/services/firebase';

export async function openCheckoutSession(initialCash: number, operatorName: string) {
  try {
    const sessionRef = await addDoc(collection(db, 'checkout_sessions'), {
      initialCash,
      operatorName,
      openedAt: serverTimestamp(),
      status: 'open',
    });

    const openCheckoutRef = doc(db, 'checkout', 'open');
    
    await setDoc(openCheckoutRef, {
      isOpen: true,
      status: 'open',
      cash: initialCash,
      activeSessionId: sessionRef.id,
      openedAt: serverTimestamp(),
      operatorName,
    }, { merge: true });

    return sessionRef.id;
  } catch (error) {
    console.error("Erro ao abrir caixa no BD:", error);
    throw error;
  }
}

export async function closeCheckoutSession(sessionId: string, finalCash: number) {
  try {
    if (sessionId && sessionId !== 'desconhecido') {
      const sessionRef = doc(db, 'checkout_sessions', sessionId);
      await updateDoc(sessionRef, {
        status: 'closed',
        finalCash,
        closedAt: serverTimestamp(),
      });
    }

    const openRef = doc(db, 'checkout', 'open');
    await updateDoc(openRef, { 
      isOpen: false, 
      activeSessionId: null 
    });
  } catch (error) {
    console.error("Erro ao fechar caixa no BD:", error);
    throw error;
  }
}

/**
 * 🟢 NOVO: Registra Sangria ou Suprimento e atualiza a gaveta em tempo real
 */
export async function registerCashMovement(
  type: 'sangria' | 'suprimento',
  amount: number,
  reason: string,
  sessionId?: string | null
) {
  try {
    // 1. O valor a ser incrementado ou decrementado no saldo em caixa
    const delta = type === 'suprimento' ? amount : -amount;

    // 2. Atualiza o saldo acumulado em checkout/open
    const openCheckoutRef = doc(db, 'checkout', 'open');
    await updateDoc(openCheckoutRef, {
      cash: increment(delta),
    });

    // 3. Registra o histórico da movimentação na coleção 'cash_movements'
    await addDoc(collection(db, 'cash_movements'), {
      type,
      amount,
      reason: reason || (type === 'sangria' ? 'Sangria de caixa' : 'Suprimento de caixa'),
      sessionId: sessionId || null,
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(`Erro ao registrar ${type}:`, error);
    throw error;
  }
}