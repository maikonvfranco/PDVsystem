import type { Product } from '../types/index';
import { db } from '../firebase/services/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit
} from 'firebase/firestore';

const COLLECTION_NAME = 'products';

export const api = {
  /**
    * Busca todos os produtos. 
    * Se estiver sem internet, traz do cache local instantaneamente.
    */
  getProducts: async (): Promise<Product[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));

    return querySnapshot.docs.map(doc => {
      const objetoFormatado = {
        id: doc.id,
        ...doc.data()
      };
      // Convertemos para unknown primeiro e depois para Product para o TS aceitar
      return objetoFormatado as unknown as Product;
    });
  },

  /**
   * Busca um produto específico pelo código (Leitor de Código de Barras).
   */
  getProductByCode: async (code: string): Promise<Product | undefined> => {
    const productsRef = collection(db, COLLECTION_NAME);
    const q = query(productsRef, where("code", "==", code), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return undefined;
    }

    const docSnapshot = querySnapshot.docs[0];

    const objetoFormatado = {
      id: docSnapshot.id,
      ...docSnapshot.data()
    };

    // Mesma conversão segura aqui
    return objetoFormatado as unknown as Product;
  },

  /**
   * Cadastra o produto localmente. O Firebase sincroniza com a nuvem em background.
   */
  createProduct: async (newProduct: Omit<Product, 'id'>): Promise<void> => {
    await addDoc(collection(db, COLLECTION_NAME), newProduct);
  },

  /**
   * Edita os valores de um produto usando o ID gerado pelo Firebase.
   */
  updateProduct: async (id: string | number, updatedData: Omit<Product, 'id'>): Promise<void> => {
    const productRef = doc(db, COLLECTION_NAME, String(id));
    await updateDoc(productRef, updatedData);
  },

  /**
   * Remove um produto do sistema.
   */
  deleteProduct: async (id: string | number): Promise<void> => {
    const productRef = doc(db, COLLECTION_NAME, String(id));
    await deleteDoc(productRef);
  }
};