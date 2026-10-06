export interface UpdateStatusData {
  status: 'available' | 'not-available' | 'downloaded' | 'error';
  message: string;
  info?: any;
}

export interface IElectronAPI {
  checkForUpdates: () => Promise<void>;
  startDownload: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (data: UpdateStatusData) => void) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}