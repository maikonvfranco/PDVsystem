import { app, BrowserWindow, ipcMain } from 'electron';
import pkg from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';

const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configuração exclusiva para testes em ambiente de Desenvolvimento
if (!app.isPackaged) {
  import('dotenv').then(dotenv => dotenv.config()).catch(() => { });
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.updateConfigPath = path.join(__dirname, "dev-app-update.yml");
}

// Configurações padrão do AutoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let updateInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Em Desenvolvimento: carrega a URL do Vite
  // Em Produção: carrega o index.html compilado
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Opcional para depurar em dev
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build-react/index.html'));
  }

  // Dispara a checagem inicial assim que a janela estiver pronta
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Erro na checagem inicial de atualização:', err);
    });
  });
}

function startPeriodicUpdateCheck() {
  const THIRTY_MINUTES = 5 * 60 * 1000;

  if (updateInterval) clearInterval(updateInterval);

  updateInterval = setInterval(() => {
    console.log('Verificando novas atualizações...');
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Erro na verificação periódica:', err);
    });
  }, THIRTY_MINUTES);
}

// --- Eventos do AutoUpdater ---
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-status', {
    status: 'available',
    message: 'Nova atualização disponível!',
    info
  });
});

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update-status', {
    status: 'not-available',
    message: 'Seu app está atualizado.'
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-status', {
    status: 'downloaded',
    message: 'Download concluído! Pronto para instalar.'
  });
});

autoUpdater.on('error', (err) => {
  console.error('Erro no AutoUpdater:', err);
  mainWindow?.webContents.send('update-status', {
    status: 'error',
    message: `Erro ao buscar atualização: ${err.message}`
  });
});

// --- Handlers IPC ---
ipcMain.handle('check-for-updates', () => autoUpdater.checkForUpdates());
ipcMain.handle('start-download', () => autoUpdater.downloadUpdate());
ipcMain.handle('quit-and-install', () => autoUpdater.quitAndInstall());

// --- Ciclo de Vida do App ---
app.whenReady().then(() => {
  createWindow();
  startPeriodicUpdateCheck();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (updateInterval) clearInterval(updateInterval);
});