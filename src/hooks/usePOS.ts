import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../firebase/services/firebase';
import type { Product } from '../types';

interface ParsedScaleBarcode {
  productCode: string;
  rawValue: number; // Inteiro exato lido dos 6 dígitos (AAAAAA)
}

/**
 * Função  para remover acentos e converter para minúsculas
 */
export function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Processa etiquetas de balança com payload fixo de 6 dígitos (AAAAAA)
 * EAN-13 (13 dígitos): 2 + CCCCC + AAAAAA + D (Código do produto com 5 dígitos)
 * EAN-12 (12 dígitos): 2 + CCCC  + AAAAAA + D (Código do produto com 4 dígitos)
 */
export function parseScaleBarcode(input: string): ParsedScaleBarcode | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Verifica se inicia com '2' e possui 12 ou 13 dígitos
  if (!trimmed.startsWith('2') || (trimmed.length !== 12 && trimmed.length !== 13)) {
    return null;
  }

  // Remove o prefixo '2' e o Dígito Verificador final 'D'
  const body = trimmed.substring(1, trimmed.length - 1); // Sobram 10 dígitos (EAN-12) ou 11 dígitos (EAN-13)

  // Payload é SEMPRE os últimos 6 dígitos (AAAAAA)
  const valueLength = 6;
  const rawValueStr = body.slice(-valueLength);          // Ex: "000002" ou "001250"
  const rawProductCode = body.slice(0, -valueLength);    // Sobram 4 dígitos (CCCC) ou 5 dígitos (CCCCC)

  // Remove zeros à esquerda do código para bater com o cadastro no BD (ex: "00514" -> "514")
  const productCode = rawProductCode.replace(/^0+/, '') || rawProductCode;

  // Retorna o valor numérico inteiro puro sem dividir por 100
  const rawValue = parseInt(rawValueStr, 10) || 0;

  return {
    productCode,
    rawValue,
  };
}

export function extractProductCode(input: string): string {
  const parsed = parseScaleBarcode(input);
  if (parsed) return parsed.productCode;
  return input.trim();
}

interface UsePOSProps {
  addToCart: (product: Product, quantity?: number, isWeightedPrice?: boolean) => void;
  isPaymentModalOpen?: boolean;
}

export function usePOS({ addToCart, isPaymentModalOpen }: UsePOSProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    const productsRef = collection(db, 'products');

    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const docsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Product[];

        setProducts(docsData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar produtos:', error);
        toast.error('Erro ao carregar lista de produtos.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) {
        cats.add(p.category.trim());
      }
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [products]);

  // Filtragem corrigida com suporte a acentos, case-insensitive e busca por subtermo
  const filteredProducts = useMemo(() => {
    const rawQuery = barcodeInput.trim();
    if (!rawQuery) return [];

    const query = rawQuery.includes('*') ? rawQuery.split('*')[1].trim() : rawQuery;
    const normalizedQuery = normalizeText(query);
    const extractedCode = normalizeText(extractProductCode(rawQuery));

    if (!normalizedQuery) return [];

    return products.filter((p) => {
      const normalizedName = normalizeText(p.name);
      const normalizedCode = normalizeText(p.code);

      const codeMatch = 
        normalizedCode.includes(normalizedQuery) || 
        normalizedCode === extractedCode;

      const nameMatch = normalizedName.includes(normalizedQuery);

      return codeMatch || nameMatch;
    });
  }, [products, barcodeInput]);

  const productsInSelectedCategory = useMemo(() => {
    if (barcodeInput.trim().length > 0) {
      return filteredProducts;
    }

    if (!selectedCategory) {
      return products;
    }

    return products.filter(
      (p) => normalizeText(p.category) === normalizeText(selectedCategory)
    );
  }, [products, selectedCategory, barcodeInput, filteredProducts]);

  const focusInput = () => {
    if (!isPaymentModalOpen) {
      barcodeInputRef.current?.focus();
    }
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawInput = barcodeInput.trim();
    if (!rawInput) return;

   
    // ETIQUETA DE BALANÇA (12 ou 13 DÍGITOS INICIANDO EM '2')
  
    const scaleData = parseScaleBarcode(rawInput);

    if (scaleData) {
      const { productCode, rawValue } = scaleData;

      // Busca o produto pelo código extraído
      const matchedProduct = products.find((p) => {
        const pCode = normalizeText(p.code);
        const targetCode = normalizeText(productCode);
        return pCode === targetCode || pCode === targetCode.padStart(pCode.length || 0, '0');
      });

      if (matchedProduct) {
        const unitType = normalizeText(
          (matchedProduct.unit || (matchedProduct as any).unidade || 'un').toString()
        );

        const isWeighted = unitType === 'kg' || unitType === 'g' || unitType === 'kilo';

        if (isWeighted) {
          // Em etiquetas de valor/peso, divide por 100 para obter o valor total em R$ (ex: 001250 -> R$ 12,50)
          const totalPaid = rawValue / 100;
          
          // Preço cadastrado por KG no Firebase
          const pricePerKg = matchedProduct.price || 0;

          // Calcula o peso em KG
          const calculatedWeight = pricePerKg > 0 ? totalPaid / pricePerKg : 0;
          const formattedWeight = Number(calculatedWeight.toFixed(3));

          addToCart(
            {
              ...matchedProduct,
              price: totalPaid,
            },
            formattedWeight,
            true
          );

          const displayWeight = formattedWeight < 1 
            ? `${Math.round(formattedWeight * 1000)}g` 
            : `${formattedWeight.toFixed(3)}kg`;

          toast.success(`${matchedProduct.name} - ${displayWeight} (R$ ${totalPaid.toFixed(2)}) adicionado!`);
        } else {
          // Produto UNIDADE: o valor da etiqueta já é a quantidade inteira (ex: 000002 -> 2 unidades)
          const quantity = Math.max(1, rawValue);
          addToCart(matchedProduct, quantity, false);
          toast.success(`${quantity}x ${matchedProduct.name} adicionado(s)!`);
        }

        setBarcodeInput('');
        setShowDropdown(false);
        focusInput();
        return;
      }

      toast.error(`Produto da balança (código "${productCode}") não encontrado.`);
      focusInput();
      return;
    }

  
    // FLUXO PADRÃO (CÓDIGO DE BARRAS NORMAL / TECLADO OU MULTIPLICADOR *)
  
    let quantity = 1;
    let cleanCode = rawInput;

    if (rawInput.includes('*')) {
      const parts = rawInput.split('*');
      const parsedQty = parseFloat(parts[0]);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        quantity = parsedQty;
        cleanCode = parts[1].trim();
      }
    }

    const normalizedCleanCode = normalizeText(cleanCode);

    let matchedProduct = products.find(
      (p) => normalizeText(p.code) === normalizedCleanCode
    );

    if (!matchedProduct) {
      const sortedProducts = [...products].sort(
        (a, b) => (b.code?.length || 0) - (a.code?.length || 0)
      );

      for (const product of sortedProducts) {
        const prodCode = product.code?.trim();
        if (prodCode && rawInput.length > prodCode.length && rawInput.endsWith(prodCode)) {
          const prefix = rawInput.slice(0, rawInput.length - prodCode.length);
          const parsedQty = parseFloat(prefix);

          if (!isNaN(parsedQty) && parsedQty > 0) {
            quantity = parsedQty;
            matchedProduct = product;
            break;
          }
        }
      }
    }

    if (matchedProduct) {
      addToCart(matchedProduct, quantity);
      toast.success(`${quantity}x ${matchedProduct.name} adicionado!`);
      setBarcodeInput('');
      setShowDropdown(false);
    } else {
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0], quantity);
        toast.success(`${quantity}x ${filteredProducts[0].name} adicionado!`);
        setBarcodeInput('');
        setShowDropdown(false);
      } else {
        toast.warn(`Produto "${rawInput}" não encontrado.`);
        setShowDropdown(true);
      }
    }
    focusInput();
  };

  const handleSelectProduct = (product: Product) => {
    addToCart(product, 1);
    setBarcodeInput('');
    setShowDropdown(false);
    focusInput();
  };

  return {
    products,
    productsInSelectedCategory,
    categories,
    filteredProducts,
    loading,
    selectedCategory,
    setSelectedCategory,
    barcodeInput,
    setBarcodeInput,
    showDropdown,
    setShowDropdown,
    barcodeInputRef,
    focusInput,
    handleBarcodeSubmit,
    handleSelectProduct,
  };
}