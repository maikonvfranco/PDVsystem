import { useState } from 'react';
import type { Product, CartItem } from '../types';

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (
    product: Product,
    amount?: number,
    isWeightedPrice: boolean = false
  ) => {
    const isKg = product.unit === 'kg' || isWeightedPrice;
    const initialAmount = amount ?? (isKg ? 0.1 : 1);

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) =>
          item.product.id === product.id &&
          item.isWeightedPrice === isWeightedPrice
      );

      if (existingItem) {
        return currentItems.map((item) => {
          if (item.cartItemId !== existingItem.cartItemId) return item;

          if (isWeightedPrice) {
            return {
              ...item,
              quantity: item.quantity + initialAmount,
              product: {
                ...item.product,
                price: item.product.price + product.price,
              },
            };
          }

          return {
            ...item,
            quantity: item.quantity + initialAmount,
          };
        });
      }

      return [
        ...currentItems,
        {
          cartItemId: `${product.id}-${Date.now()}-${Math.random()}`,
          product,
          quantity: initialAmount,
          isWeightedPrice,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.cartItemId !== cartItemId) return item;

        if (item.isWeightedPrice) {
          const unitPrice = item.product.price / item.quantity;
          return {
            ...item,
            quantity: newQuantity,
            product: {
              ...item.product,
              price: unitPrice * newQuantity,
            },
          };
        }

        return {
          ...item,
          quantity: newQuantity,
        };
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.cartItemId === cartItemId
      );

      if (!existingItem) return currentItems;

      const isKg = existingItem.product.unit === 'kg' || existingItem.isWeightedPrice;
      const step = isKg ? 0.1 : 1;

      if (existingItem.quantity > step) {
        return currentItems.map((item) => {
          if (item.cartItemId !== cartItemId) return item;

          if (item.isWeightedPrice) {
            const unitPrice = item.product.price / item.quantity;
            return {
              ...item,
              quantity: item.quantity - step,
              product: {
                ...item.product,
                price: item.product.price - unitPrice,
              },
            };
          }

          return {
            ...item,
            quantity: item.quantity - step,
          };
        });
      }

      return currentItems.filter((item) => item.cartItemId !== cartItemId);
    });
  };

  const clearCart = () => setCartItems([]);

  const total = cartItems.reduce((acc, item) => {
  if (item.isWeightedPrice) {
    return acc + Math.floor(item.product.price * 100) / 100;
  }
  // Corta as frações de centavo sem arredondar para cima
  const itemSubtotal = Math.floor(item.product.price * item.quantity * 100) / 100;
  return acc + itemSubtotal;
}, 0);

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    total,
  };
}