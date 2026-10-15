const { contextBridge, ipcRenderer } = require('electron');
const invoke = async (name, ...args) => {
  const result = await ipcRenderer.invoke(name, ...args);
  if (!result.ok) throw new Error(result.error);
  return result.data;
};
contextBridge.exposeInMainWorld('aerodub', {
  bootstrap: () => invoke('bootstrap'),
  settings: changes => invoke('settings', changes),
  importVideo: () => invoke('import-video'),
  importSong: () => invoke('import-song'),
  transcribeSong: language => invoke('transcribe-song', language),
  romanizeSong: language => invoke('romanize-song', language),
  updateSong: changes => invoke('update-song', changes),
  saveSongTake: (bytes, timing) => invoke('save-song-take', bytes, timing),
  exportStems: options => invoke('export-stems', options),
  exportCover: format => invoke('export-cover', format),
  openProject: id => invoke('open-project', id),
  closeProject: () => invoke('close-project'),
  deleteProject: id => invoke('delete-project', id),
  saveProject: () => invoke('save-project'),
  saveTake: (bytes, timing) => invoke('save-take', bytes, timing),
  divideParts: options => invoke('divide-parts', options),
  editParts: change => invoke('edit-parts', change),
  timelineThumbnails: () => invoke('timeline-thumbnails'),
  previewTake: (id, individual = false) => invoke('preview-take', id, individual),
  previewSourceClip: id => invoke('preview-source-clip', id),
  previewPart: partId => invoke('preview-part', partId),
  previewReference: () => invoke('preview-reference'),
  updateProject: changes => invoke('update-project', changes),
  deleteTake: id => invoke('delete-take', id),
  previewMix: () => invoke('preview-mix'),
  exportVideo: () => invoke('export'),
  revealExport: () => invoke('reveal-export'),
  cancel: () => invoke('cancel'),
  onProgress: callback => { ipcRenderer.on('job-progress', (_event, data) => callback(data)); }
});
