// 화면(웹앱)에서 쓸 수 있는 데스크톱 기능: PDF 저장
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  savePdf: (filename) => ipcRenderer.invoke('save-pdf', { filename })
});
