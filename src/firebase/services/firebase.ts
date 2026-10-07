import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";

import { getAuth } from "firebase/auth";

// 1. CONFIGURAÇÃO DO PDV (PROJETO PRINCIPAL)

const pdvConfig = {
  apiKey: "AIzaSyAffrp1WedGgc0IOyVHEIjsQilx91_r4pk",
  authDomain: "pdv-padaria-cd2dc.firebaseapp.com",
  projectId: "pdv-padaria-cd2dc",
  storageBucket: "pdv-padaria-cd2dc.firebasestorage.app",
  messagingSenderId: "280636452347",
  appId: "1:280636452347:web:216c91d4d01123cbf5af5e",
  measurementId: "G-PGN6EM7SBC"
};

// Inicializa o app principal do PDV (evitando reinicialização em recarregamentos/HMR)
const pdvApp = !getApps().length ? initializeApp(pdvConfig) : getApp();

// Inicializa o Auth do PDV
export const auth = getAuth(pdvApp);

// Inicializa o Firestore do PDV com suporte OFFLINE e suporte a múltiplas abas
export const db = initializeFirestore(pdvApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});


// 2. CONFIGURAÇÃO DO SISTEMA ANTIGO (CLIENTES / FIADO)

const oldSystemConfig = {
  apiKey: "AIzaSyA1AR6jJqLgU5T0lPjd1p-Nd59rTvQiqEs",
  authDomain: "padaria-937f2.firebaseapp.com",
  projectId: "padaria-937f2",
  storageBucket: "padaria-937f2.firebasestorage.app",
  messagingSenderId: "807773909453",
  appId: "1:807773909453:web:891584e42725338c5fd484",
  measurementId: "G-B56VFGPHDH"
};

// Inicializa o segundo app com um nome único ("OLD_SYSTEM")
const oldApp = !getApps().some(app => app.name === "OLD_SYSTEM")
  ? initializeApp(oldSystemConfig, "OLD_SYSTEM")
  : getApp("OLD_SYSTEM");

// Exporta o banco do sistema antigo (para buscar os clientes)
export const dbClients = getFirestore(oldApp);