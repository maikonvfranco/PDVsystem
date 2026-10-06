import { useEffect, useRef } from 'react';
import { toast, type Id } from 'react-toastify';
import { createSaleRecord } from '../services/salesService';
import type { CartItem } from '../types';

interface UseCartInactivityProps {
    cartItems: CartItem[];
    total: number;
    sessionId: string | null;
    clearCart: () => void;
    isCheckoutOpen: boolean;
    isAnyModalOpen: boolean;
}

const INACTIVITY_TIME = 60 * 1000; // 1 minuto parado
const TOAST_DURATION = 30 * 1000;  // 30 segundos de contagem regressiva no Toast

export function useCartInactivity({
    cartItems,
    total,
    sessionId,
    clearCart,
    isCheckoutOpen,
    isAnyModalOpen,
}: UseCartInactivityProps) {
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastIdRef = useRef<Id | null>(null);

    // Função para salvar no banco como pendente
    const saveAsPending = async () => {
        if (cartItems.length === 0) return;

        try {
            await createSaleRecord(
                {
                    sessionId,
                    total,
                    paymentMethod: 'Pendente Automatico',
                    paymentsDetails: [],
                    items: cartItems,
                    amountPaid: 0,
                    change: 0,
                },
                true // isPending = true
            );

            clearCart();
            toast.dismiss(toastIdRef.current || undefined);
            toast.info('⏳ Venda movida para Pendente por inatividade.');
        } catch (error) {
            console.error('Erro ao salvar venda pendente por inatividade:', error);
            toast.error('Erro ao salvar venda pendente automaticamente.');
        }
    };

    // Limpa todos os timers e fecha a notificação
    const resetTimers = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
    };

    // Dispara o alerta no Toast com a barra de progresso de 30s
    const startCountdown = () => {
        toastIdRef.current = toast.warning('⏳ Carrinho inativo! A venda será salva como PENDENTE.', {
            autoClose: TOAST_DURATION,
            closeOnClick: false,
            draggable: false,
            pauseOnHover: false,
        });

        // Timer de 30 segundos para efetivar a conversão para pendente
        autoSaveTimerRef.current = setTimeout(() => {
            saveAsPending();
        }, TOAST_DURATION);
    };

    useEffect(() => {
        // Se não houver itens ou o caixa estiver fechado ou houver algum modal aberto, não roda o timer
        if (cartItems.length === 0 || !isCheckoutOpen || isAnyModalOpen) {
            resetTimers();
            return;
        }

        const handleUserActivity = () => {
            // Se houver qualquer interação do usuário (mouse, teclado, touch), reinicia a contagem de 1 minuto
            resetTimers();

            inactivityTimerRef.current = setTimeout(() => {
                startCountdown();
            }, INACTIVITY_TIME);
        };

        // Registra os ouvintes globais de atividade
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('click', handleUserActivity);
        window.addEventListener('touchstart', handleUserActivity);

        // Inicia o timer inicial assim que o carrinho recebe itens
        inactivityTimerRef.current = setTimeout(() => {
            startCountdown();
        }, INACTIVITY_TIME);

        return () => {
            resetTimers();
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('touchstart', handleUserActivity);
        };
    }, [cartItems, isCheckoutOpen, isAnyModalOpen, total, sessionId]);
}