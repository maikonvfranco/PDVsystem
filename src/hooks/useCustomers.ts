import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { dbClients } from '../firebase/services/firebase';

export default async function addPurchaseToCustomer(customerId: string, totalAmount: number) {
  const customerRef = doc(dbClients, 'users', customerId);

  // Formata a data atual (ex: "26/09/26, 10:35")
  const now = new Date();
  const dateFormatted = `${now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })}, ${now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  await updateDoc(customerRef, {
    purchase: arrayUnion({
      date: dateFormatted,
      price: totalAmount,
    }),
  });
}