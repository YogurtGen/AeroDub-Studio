const $ = id => document.getElementById(id);
const api = window.aerodub;
const strings = {
  ...window.aerodubLocales,
  en: {
    newVideo: 'New video', projects: 'Projects', openProject: 'Open project', settings: 'Settings', language: 'Language', reduceMotion: 'Reduce motion',
    localStudio: 'Your local dubbing studio', welcomeTitle: 'One scene.\nYour voice.', welcomeCopy: 'Bring a video. Record it one part at a time. Watch it come together.', upload: 'Choose a video', formats: 'MP4, MOV, MKV, WebM, AVI · Files stay on this device',
    videoReady: 'Video ready', setupCopy: 'Check your scene, then enter Dubbing mode. We will line up the audible parts for you.', startDubbing: 'Start dubbing', dubbingMode: 'Dubbing mode', reviewMode: 'Full dub preview', save: 'Save', review: 'Watch full dub', backDubbing: 'Back to dubbing', export: 'Export MP4',
    parts: 'Your parts', partsHint: 'Record, check your take, then continue.', part: 'Part', of: 'of', recorded: 'recorded', notRecorded: 'Not recorded', recordedState: 'Recorded', smartCut: 'Smart cutting', padding: 'Quiet space before / after', applyCuts: 'Apply cuts', cutHint: 'Finds audible sections using quiet gaps. Continuous music may hide dialogue pauses.', fullVideoPart: 'Use the full video', noParts: 'No audible sections found. You can create one full-video part.',
    scene: 'The scene', play: 'Play video', pause: 'Pause', hearPart: 'Hear this part', position: 'Playhead', source: 'Original', yourVoice: 'Your dub', previous: 'Previous', next: 'Next part', ready: 'Ready to record', recording: 'Recording', record: 'Record this part', retake: 'Retake this part', stop: 'Stop recording', checkTake: 'Listen to your take', recordHint: 'Stops automatically. Listen to your take, retake if needed, then choose Next part.',
    dubVolume: 'Dubbing volume', volumeHint: 'Boost a quiet voice up to 400%. A limiter prevents digital clipping.', cleanMic: 'Noise cancelling', micSettings: 'Microphone settings', input: 'Microphone', defaultMic: 'Default microphone', enableMic: 'Test mic', micOff: 'Turn mic off', listen: 'Hear original while recording', headphoneHint: 'Use headphones so the original audio does not enter your microphone.',
    sourceVolume: 'Original volume', duckVolume: 'Original during dubbing', duckHint: 'All original sound lowers during your recordings, including music and effects.', takes: 'Takes for this part', emptyTakes: 'No recording yet. Press Record this part to begin.', selected: 'Use this take', audition: 'Listen', delete: 'Delete', offset: 'Alignment (ms)', trimStart: 'Trim start (s)', trimEnd: 'Trim end (s)', gain: 'Take gain (×)', mute: 'Mute', cleanTake: 'Noise cleanup', takeName: 'Take name', confirmDelete: 'Delete this take? This cannot be undone.',
    initialStatus: 'Choose a video to begin.', imported: 'Video ready. Click Start dubbing when you are ready.', modeReady: 'Hear the current part, then record your voice. Recording stops automatically.', takeSaved: 'Take saved. Listen to it, retake if needed, or go to the next part.', saved: 'Project saved locally.', mixReady: 'Playing your complete dub. Choose any part to retake it.', auditionReady: 'Playing your take with the current dubbing volume.', reviewMissing: 'Unrecorded parts keep their original audio.', reviewComplete: 'All parts are recorded. Choose a part on the left to retake it.', exported: 'Export complete: ', reveal: 'Show exported file', cancel: 'Cancel', cancelled: 'Processing cancelled. Your saved project is safe.', error: 'Could not finish: ', saveError: 'Changes could not be saved. Try Save again.', micReady: 'Microphone ready. Use headphones while recording.', micError: 'Microphone unavailable. Allow access in Windows Settings or choose another input.',
    prepare: 'Preparing video, waveform and smart cuts', clean: 'Saving your take and cleaning noise', mixJob: 'Preparing audio preview', exportJob: 'Combining your parts into MP4', sourceWaveLabel: 'Original waveform position', dubWaveLabel: 'Dub waveform position', micMeterLabel: 'Microphone input level',
    home: 'Home', savedProjects: 'Saved projects', searchProjects: 'Find a project', noProjects: 'No saved projects yet. Choose a video to create one.', noMatches: 'No projects match your search.', recordings: 'recordings', deleteProjectTitle: 'Delete this project?', deleteProject: 'Delete project', deleteProjectHint: 'The project and its recordings will go to the Recycle Bin. Your original video and exported MP4s are kept.', projectDeleted: 'Project moved to the Recycle Bin.', chosenMic: 'Saved microphone', currentProject: 'Current project',
    INVALID_VALUE: 'A timing or volume value is outside its allowed range.', INVALID_MEDIA: 'This file is unreadable or has no usable duration.', VIDEO_REQUIRED: 'Choose a file containing video.', NO_PROJECT: 'Choose a video first.', BUSY: 'Wait for processing or cancel it.', INVALID_RECORDING: 'No usable microphone audio was captured.', WRONG_SOURCE: 'The replacement video duration does not match.', SOURCE_OVERWRITE: 'Choose another filename to preserve the original video.', INVALID_PROJECT: 'This project is not supported.', PARTS_HAVE_TAKES: 'Keep existing cuts after recording so your takes stay aligned.', ONE_TAKE_PER_PART: 'Select one take for each part.', seekError: 'Video did not respond while seeking.', videoError: 'Video playback failed.', audioError: 'Audio playback failed.'
  },
  id: {
    newVideo: 'Video baru', projects: 'Proyek', openProject: 'Buka proyek', settings: 'Pengaturan', language: 'Bahasa', reduceMotion: 'Kurangi animasi',
    localStudio: 'Studio dubbing lokalmu', welcomeTitle: 'Satu adegan.\nSuaramu.', welcomeCopy: 'Pilih video. Isi suaranya per part. Lihat semuanya jadi satu.', upload: 'Pilih video', formats: 'MP4, MOV, MKV, WebM, AVI · File tetap di perangkat ini',
    videoReady: 'Video siap', setupCopy: 'Cek videonya, lalu masuk ke mode dubbing. Bagian yang terdengar akan disiapkan otomatis.', startDubbing: 'Mulai dubbing', dubbingMode: 'Mode dubbing', reviewMode: 'Preview dubbing lengkap', save: 'Simpan', review: 'Cek hasil gabungan', backDubbing: 'Kembali ke dubbing', export: 'Ekspor MP4',
    parts: 'Daftar part', partsHint: 'Rekam, cek hasil take, lalu lanjut.', part: 'Part', of: 'dari', recorded: 'terekam', notRecorded: 'Belum direkam', recordedState: 'Sudah direkam', smartCut: 'Smart cutting', padding: 'Jeda sebelum / sesudah', applyCuts: 'Terapkan potongan', cutHint: 'Mencari bagian bersuara lewat jeda sepi. Musik terus-menerus bisa menutupi jeda dialog.', fullVideoPart: 'Pakai seluruh video', noParts: 'Tidak ada bagian bersuara yang terdeteksi. Kamu bisa memakai satu part untuk seluruh video.',
    scene: 'Adegan', play: 'Putar video', pause: 'Jeda', hearPart: 'Dengar part ini', position: 'Posisi pemutar', source: 'Asli', yourVoice: 'Dubbingmu', previous: 'Sebelumnya', next: 'Part berikutnya', ready: 'Siap merekam', recording: 'Merekam', record: 'Rekam part ini', retake: 'Retake part ini', stop: 'Stop rekaman', checkTake: 'Dengar hasil take', recordHint: 'Rekaman berhenti otomatis. Dengar hasilnya, retake kalau perlu, lalu pilih Part berikutnya.',
    dubVolume: 'Volume dubbing', volumeHint: 'Perbesar suara hingga 400%. Limiter mencegah clipping digital.', cleanMic: 'Noise cancelling', micSettings: 'Pengaturan mikrofon', input: 'Mikrofon', defaultMic: 'Mikrofon bawaan', enableMic: 'Tes mikrofon', micOff: 'Matikan mikrofon', listen: 'Dengar suara asli saat rekam', headphoneHint: 'Pakai headphone agar suara asli tidak ikut masuk ke mikrofon.',
    sourceVolume: 'Volume asli', duckVolume: 'Suara asli saat dubbing', duckHint: 'Seluruh suara asli diturunkan saat rekamanmu, termasuk musik dan efek.', takes: 'Daftar take part ini', emptyTakes: 'Belum ada rekaman. Tekan Rekam part ini untuk mulai.', selected: 'Pakai take ini', audition: 'Dengarkan', delete: 'Hapus', offset: 'Pergeseran (ms)', trimStart: 'Potong awal (d)', trimEnd: 'Potong akhir (d)', gain: 'Gain take (×)', mute: 'Bisukan', cleanTake: 'Bersihkan noise', takeName: 'Nama take', confirmDelete: 'Hapus take ini? Tindakan ini tidak bisa dibatalkan.',
    initialStatus: 'Pilih video untuk mulai.', imported: 'Video siap. Klik Mulai dubbing kalau sudah siap.', modeReady: 'Dengar part aktif, lalu rekam suaramu. Rekaman berhenti otomatis.', takeSaved: 'Take tersimpan. Dengar hasilnya, retake kalau perlu, atau lanjut ke part berikutnya.', saved: 'Proyek tersimpan lokal.', mixReady: 'Memutar dubbing lengkap. Pilih part mana pun untuk retake.', auditionReady: 'Memutar hasil take dengan volume dubbing saat ini.', reviewMissing: 'Part yang belum direkam memakai audio asli.', reviewComplete: 'Semua part sudah direkam. Pilih part di kiri untuk retake.', exported: 'Ekspor selesai: ', reveal: 'Buka lokasi hasil', cancel: 'Batalkan', cancelled: 'Proses dibatalkan. Proyek tersimpan tetap aman.', error: 'Proses gagal: ', saveError: 'Perubahan belum tersimpan. Coba tombol Simpan lagi.', micReady: 'Mikrofon siap. Pakai headphone saat merekam.', micError: 'Mikrofon tidak tersedia. Izinkan akses di Pengaturan Windows atau pilih input lain.',
    prepare: 'Menyiapkan video, waveform, dan smart cutting', clean: 'Menyimpan take dan membersihkan noise', mixJob: 'Menyiapkan preview audio', exportJob: 'Menggabungkan part ke MP4', sourceWaveLabel: 'Posisi waveform asli', dubWaveLabel: 'Posisi waveform dubbing', micMeterLabel: 'Level input mikrofon',
    home: 'Home', savedProjects: 'Proyek tersimpan', searchProjects: 'Cari proyek', noProjects: 'Belum ada proyek. Pilih video untuk membuat proyek baru.', noMatches: 'Tidak ada proyek yang cocok dengan pencarian.', recordings: 'rekaman', deleteProjectTitle: 'Hapus proyek ini?', deleteProject: 'Hapus proyek', deleteProjectHint: 'Proyek dan rekamannya dipindahkan ke Recycle Bin. Video asli dan MP4 hasil ekspor tetap disimpan.', projectDeleted: 'Proyek dipindahkan ke Recycle Bin.', chosenMic: 'Mikrofon tersimpan', currentProject: 'Proyek aktif',
    INVALID_VALUE: 'Nilai waktu atau volume di luar rentang yang diizinkan.', INVALID_MEDIA: 'File tidak terbaca atau durasinya tidak valid.', VIDEO_REQUIRED: 'Pilih file yang berisi video.', NO_PROJECT: 'Pilih video dulu.', BUSY: 'Tunggu proses selesai atau batalkan.', INVALID_RECORDING: 'Rekaman mikrofon kosong atau tidak terbaca.', WRONG_SOURCE: 'Durasi video pengganti tidak cocok.', SOURCE_OVERWRITE: 'Pakai nama lain agar video asli tetap aman.', INVALID_PROJECT: 'Proyek ini tidak didukung.', PARTS_HAVE_TAKES: 'Potongan dikunci setelah rekam agar take tetap sejajar.', ONE_TAKE_PER_PART: 'Pilih satu take untuk tiap part.', seekError: 'Video tidak merespons saat pindah posisi.', videoError: 'Video gagal diputar.', audioError: 'Audio gagal diputar.'
  }
};
for (const code of Object.keys(strings)) Object.assign(strings[code], window.aerodubMusicStrings[code]);
for (const code of Object.keys(strings)) Object.assign(strings[code], window.aerodubVoiceStrings[code]);
for (const code of Object.keys(strings)) Object.assign(strings[code], window.aerodubTimelineStrings[code]);
const smartDubStrings = {
  en: { speaker: 'Speaker', detectSpeakers: 'Finding speaker changes', cutHint: 'Cuts at quiet gaps and changes of speaker. Overlapping voices stay together.', auditionReady: 'Playing your take with the video at its aligned position.' },
  id: { speaker: 'Suara', detectSpeakers: 'Mendeteksi pergantian pembicara', cutHint: 'Memotong di jeda sepi dan pergantian pembicara. Suara yang tumpang tindih tetap digabung.', auditionReady: 'Memutar take bersama video di posisi timing-nya.' },
  'zh-CN': { speaker: '说话人', detectSpeakers: '正在检测说话人切换', cutHint: '按静音间隔和说话人切换分段。重叠的人声保留在同一段。', auditionReady: '正在按对齐位置同步播放录音和视频。' },
  ja: { speaker: '話者', detectSpeakers: '話者の切り替わりを検出しています', cutHint: '無音の間隔と話者の切り替わりで分割します。重なる声は同じパートに残します。', auditionReady: 'テイクを位置調整に合わせて映像と同期再生しています。' },
  ko: { speaker: '화자', detectSpeakers: '화자 전환을 감지 중입니다', cutHint: '무음 구간과 화자 전환에서 나눕니다. 겹치는 목소리는 같은 파트에 남깁니다.', auditionReady: '정렬한 위치에서 테이크와 영상을 함께 재생 중입니다.' }
};
for (const code of Object.keys(strings)) Object.assign(strings[code], smartDubStrings[code]);
let language = 'en', mode = 'welcome', project = null, activeIndex = 0, busy = false, recording = false, saving = false, musicReady = false;
let recorder, stream, micContext, micVoiceSession, analyser, chunks = [], recordInfo, rangeEnd = null, mixURL = null, referenceMixURL = null;
let pendingSave = Promise.resolve();
let recentProjects = [], micDevices = [], selectedMicId = '';
const languageNames = { en: 'English', id: 'Bahasa Indonesia', 'zh-CN': '简体中文', ja: '日本語', ko: '한국어' };
const audio = new Audio(), audition = new Audio();
let auditionStart = null;
const t = key => strings[language][key] || strings.en[key] || key;
const time = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${(value % 60).toFixed(2).padStart(5, '0')}`;
const currentPart = () => project?.parts[activeIndex];
const partTake = part => project?.takes.find(take => take.partId === part?.id && take.selected && ((!take.muted && !take.removed) || take.splits?.some(clip => !clip.muted && !clip.removed)));
function status(key, error = false, suffix = '') { $('status').textContent = t(key) + suffix; $('status').classList.toggle('error', error); }
function showError(error) { status(error.message === 'CANCELLED' ? 'cancelled' : 'error', error.message !== 'CANCELLED', error.message === 'CANCELLED' ? '' : t(error.message)); }
function setMode(next) {
  mode = next; document.body.dataset.mode = mode;
  $('welcome').hidden = mode !== 'welcome'; $('setup').hidden = mode !== 'setup'; $('session').hidden = !['setup', 'dubbing', 'review'].includes(mode); $('music').hidden = !['music', 'sing'].includes(mode);
  $('song-workspace').hidden = mode !== 'music'; $('sing-room').hidden = mode !== 'sing';
  $('back-dubbing').hidden = mode !== 'review'; $('review').hidden = mode === 'review'; $('review-hint').hidden = mode !== 'review';
  $('mode-label').textContent = t(mode === 'review' ? 'reviewMode' : 'dubbingMode');
  if (typeof renderProfessional === 'function') renderProfessional();
  controls(); draw();
}
function translate() {
  document.documentElement.lang = language;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-placeholder]')) { node.placeholder = t(node.dataset.placeholder); node.setAttribute('aria-label', t(node.dataset.placeholder)); }
  $('play').textContent = t($('video').paused ? 'play' : 'pause');
  $('enable-mic').textContent = t(stream ? 'micOff' : 'enableMic');
  $('source-wave').setAttribute('aria-label', t('sourceWaveLabel')); $('dub-wave').setAttribute('aria-label', t('dubWaveLabel')); $('meter').setAttribute('aria-label', t('micMeterLabel'));
  $('parts').setAttribute('aria-label', t('parts'));
  renderParts(); renderTakes(); renderProjects(); renderMicrophones(); renderLanguages(); controls();
  if (typeof translateMusic === 'function') translateMusic();
  renderVoiceControls();
}
function controls() {
  const blocked = busy || recording || saving;
  for (const id of ['upload', 'import', 'home', 'projects-toggle', 'start-dubbing', 'enable-mic', 'mic-toggle', 'language-toggle', 'clean', 'listen']) $(id).disabled = blocked;
  for (const id of ['save', 'export', 'review', 'back-dubbing', 'play', 'seek', 'source-gain', 'duck-gain', 'dub-gain']) $(id).disabled = !project || blocked;
  for (const id of ['range-play', 'record', 'check-take']) $(id).disabled = !currentPart() || blocked;
  $('previous-part').disabled = blocked || activeIndex === 0;
  $('next-part').disabled = blocked || !project || activeIndex >= project.parts.length - 1;
  $('padding').disabled = blocked || !project || project.takes.length > 0;
  $('divide').disabled = $('padding').disabled;
  for (const id of ['cut-start', 'cut-end', 'cut-save', 'cut-split', 'cut-merge']) $(id).disabled = blocked || !currentPart() || project.takes.length > 0;
  $('cut-merge').disabled ||= !project || activeIndex >= project.parts.length - 1;
  $('full-video-part').disabled = blocked;
  $('stop').hidden = !recording; $('stop').disabled = !recording || busy; $('record').hidden = recording;
  $('record').textContent = t(partTake(currentPart()) ? 'retake' : 'record');
  $('check-take').hidden = !partTake(currentPart());
  $('record-indicator').textContent = t(recording ? 'recording' : 'ready');
  const timelineEdits = document.body.dataset.editor === 'professional' && (project?.sourceClips || project?.videoClips);
  $('review').disabled ||= !timelineEdits && !project?.takes.some(take => take.selected && (!take.muted || take.splits?.some(clip => !clip.muted && !clip.removed)));
  $('export').disabled ||= mode === 'setup' || (!timelineEdits && !project?.takes.some(take => take.selected && (!take.muted || take.splits?.some(clip => !clip.muted && !clip.removed))));
  for (const node of document.querySelectorAll('#parts button, #takes button, #takes input')) node.disabled = blocked;
  for (const node of document.querySelectorAll('#project-list button, #mic-options button, #language-options button')) node.disabled = blocked;
  document.body.classList.toggle('recording', recording);
  if (typeof musicControls === 'function') musicControls();
  voiceControls();
  if (typeof professionalControls === 'function') professionalControls();
}
async function action(callback) {
  if (busy || recording || saving) return;
  busy = true; controls();
  try { await pendingSave; await callback(); } catch (error) { showError(error); }
  finally { busy = false; controls(); }
}
function updateRecent(items) {
  recentProjects = items; renderProjects();
}
function renderProjects() {
  const query = $('project-search').value.trim().toLocaleLowerCase(language);
  const filtered = recentProjects.filter(item => item.name.toLocaleLowerCase(language).includes(query));
  $('project-list').replaceChildren(); $('project-count').textContent = recentProjects.length;
  $('projects-empty').hidden = filtered.length > 0;
  $('projects-empty').textContent = t(recentProjects.length ? 'noMatches' : 'noProjects');
  for (const item of filtered) {
    const row = document.createElement('div'); row.className = `project-row${item.id === project?.id ? ' current' : ''}`; row.dataset.projectId = item.id;
    const open = document.createElement('button'); open.className = 'project-open'; open.setAttribute('aria-label', `${t('openProject')}: ${item.name}`);
    const symbol = document.createElement('span'); symbol.className = 'project-symbol'; symbol.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.className = 'project-text'; const name = document.createElement('strong'); name.textContent = item.name;
    const metadata = document.createElement('small'); metadata.textContent = `${time(item.duration || 0)} · ${item.takeCount || 0} ${t('recordings')}`;
    const date = document.createElement('small'); const parsedDate = new Date(item.updatedAt); date.textContent = Number.isNaN(parsedDate.valueOf()) ? '' : new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(parsedDate);
    text.append(name, metadata, date); open.append(symbol, text);
    open.onclick = () => action(async () => { closeProjects(); await closeMusicSession(); stopPlayback(); const data = await api.openProject(item.id); if (data.kind === 'song') await loadSong(data); else { clearSong(); setProject(data, true); setMode(project.takes.length ? 'dubbing' : 'setup'); if (mode === 'dubbing' && currentPart()) await choosePart(0); else status('imported'); } renderProjects(); });
    const remove = document.createElement('button'); remove.className = 'project-delete'; remove.setAttribute('aria-label', `${t('deleteProject')}: ${item.name}`); remove.title = t('deleteProject');
    const trash = document.createElement('span'); trash.className = 'trash-icon'; trash.setAttribute('aria-hidden', 'true'); remove.append(trash);
    remove.onclick = () => action(async () => {
      if (!await confirmProjectDelete(item)) return;
      const active = project?.id === item.id || songData?.id === item.id;
      if (active) { await closeMusicSession(); releaseMedia(); }
      try { const result = await api.deleteProject(item.id); updateRecent(result.projects); if (result.activeDeleted) { resetHome(); closeProjects(); } status('projectDeleted'); }
      catch (error) { if (active) { const data = await api.openProject(item.id); if (data.kind === 'song') await loadSong(data); else setProject(data, true); } throw error; }
    });
    row.append(open, remove); $('project-list').append(row);
  }
  controls();
}
function confirmProjectDelete(item) {
  const dialog = $('delete-project-dialog'); dialog.returnValue = ''; $('delete-project-name').textContent = item.name;
  return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'delete'), { once: true }); dialog.showModal(); });
}
function releaseMedia() {
  stopPlayback(); for (const element of [$('video'), audio, audition]) { element.removeAttribute('src'); element.load(); }
}
function resetHome() {
  project = null; activeIndex = 0; mixURL = null; $('reveal').hidden = true; $('parts').replaceChildren(); $('takes').replaceChildren(); setMode('welcome'); renderProjects(); window.scrollTo(0, 0);
  if (typeof clearSong === 'function') clearSong();
}
function renderLanguages() {
  $('language-name').textContent = languageNames[language]; $('language-name').lang = language;
  $('language-options').replaceChildren();
  for (const [code, name] of Object.entries(languageNames)) {
    const option = document.createElement('button'); option.className = 'language-option'; option.dataset.language = code; option.lang = code; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(code === language));
    const label = document.createElement('span'); label.textContent = name;
    const abbreviation = document.createElement('small'); abbreviation.textContent = code.split('-')[0].toUpperCase(); abbreviation.setAttribute('aria-hidden', 'true'); option.append(label, abbreviation);
    option.onclick = () => action(async () => { language = code; closeLanguage(); translate(); status(mode === 'welcome' ? 'initialStatus' : mode === 'setup' ? 'imported' : mode === 'review' ? 'mixReady' : 'modeReady'); await preferences(); $('language-toggle').focus(); });
    $('language-options').append(option);
  }
}
function renderMicrophones() {
  $('mic-name').textContent = selectedMicId ? (micDevices.find(device => device.deviceId === selectedMicId)?.label || t('chosenMic')) : t('defaultMic');
  $('mic-options').replaceChildren();
  const devices = [{ deviceId: '', label: t('defaultMic') }, ...micDevices.filter(device => device.deviceId)];
  for (const device of devices) {
    const option = document.createElement('button'); option.className = 'mic-option'; option.setAttribute('role', 'option'); option.dataset.deviceId = device.deviceId; option.setAttribute('aria-selected', String(device.deviceId === selectedMicId));
    const text = document.createElement('span'); text.textContent = device.label || `${t('input')} ${devices.indexOf(device)}`; option.append(text);
    option.onclick = () => action(async () => { selectedMicId = device.deviceId; closeMic(); renderMicrophones(); await preferences(); if (stream) await enableMic(); $('mic-toggle').focus(); });
    $('mic-options').append(option);
  }
}
async function discoverMicrophones() {
  let temporary;
  try {
    if (!stream) temporary = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micDevices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'audioinput'); renderMicrophones();
  } finally { temporary?.getTracks().forEach(track => track.stop()); }
}
function stopPlayback() { $('video').pause(); audio.pause(); audition.pause(); rangeEnd = null; auditionStart = null; }
function invalidateMix() { mixURL = null; referenceMixURL = null; if (!recording) stopPlayback(); }
function setProject(data, replaceVideo = false) {
  project = data; activeIndex = Math.max(0, Math.min(activeIndex, data.parts.length - 1));
  if (replaceVideo) { stopPlayback(); mixURL = null; referenceMixURL = null; activeIndex = 0; $('video').src = data.videoURL; $('video').load(); }
  $('seek').max = data.duration; $('metadata').textContent = `${data.width} × ${data.height} · ${time(data.duration)}`;
  $('project-name').textContent = data.name; $('setup-name').textContent = data.name; $('padding').value = data.padding ?? 1.5;
  for (const [id, prop] of [['source-gain', 'sourceGain'], ['duck-gain', 'duckGain'], ['dub-gain', 'dubGain']]) { $(id).value = data[prop]; $(id + '-value').value = `${Math.round(data[prop] * 100)}%`; }
  renderParts(); renderTakes(); controls(); draw();
}
function snapshot() { return { sourceGain: project.sourceGain, duckGain: project.duckGain, dubGain: project.dubGain, dubTracks: project.dubTracks, sourceClips: project.sourceClips, videoClips: project.videoClips, takes: project.takes.map(({ audioURL, peaks, ...take }) => take) }; }
function persist() {
  if (typeof proInternalSave !== 'undefined' && !proInternalSave) clearProfessionalHistory();
  invalidateMix();
  const changes = snapshot();
  pendingSave = pendingSave.catch(() => {}).then(() => api.updateProject(changes));
  pendingSave.catch(() => status('saveError', true));
  return pendingSave;
}
async function seekTo(position) {
  const video = $('video'); position = Math.min(project.duration - .001, Math.max(0, position));
  const wait = (eventName, trigger) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('seekError')); }, 5000);
    const cleanup = () => { clearTimeout(timeout); video.removeEventListener(eventName, done); video.removeEventListener('error', fail); };
    const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('videoError')); };
    video.addEventListener(eventName, done, { once: true }); video.addEventListener('error', fail, { once: true }); trigger?.();
  });
  if (video.readyState < 1) await wait('loadedmetadata');
  if (Math.abs(video.currentTime - position) < .001) return;
  await wait('seeked', () => { video.currentTime = position; });
}
async function startPlayback(useMix = false) {
  audition.pause(); auditionStart = null; const video = $('video');
  if (!recording || $('listen').checked) { audio.src = useMix ? mixURL : referenceMixURL || project.referenceURL; audio.volume = useMix || referenceMixURL ? 1 : Math.min(1, project.sourceGain); audio.currentTime = video.currentTime; await audio.play(); }
  await video.play();
}
async function choosePart(index) {
  stopPlayback(); activeIndex = index; setMode('dubbing'); renderParts(); renderTakes();
  await seekTo(currentPart().start); draw(); status('modeReady');
}
function renderParts() {
  $('parts').replaceChildren();
  if (!project) return;
  let complete = 0;
  project.parts.forEach((part, index) => {
    const done = Boolean(partTake(part)); if (done) complete++;
    const button = document.createElement('button'); button.className = `part-button${index === activeIndex ? ' active' : ''}${done ? ' done' : ''}`; button.dataset.partId = part.id;
    button.setAttribute('aria-current', index === activeIndex ? 'step' : 'false');
    const number = document.createElement('span'); number.className = 'part-index'; number.textContent = index + 1;
    const description = document.createElement('span'); description.className = 'part-description';
    const title = document.createElement('span'); title.textContent = `${t('part')} ${index + 1}`;
    const timing = document.createElement('small'); timing.textContent = `${time(part.start)} – ${time(part.end)}`;
    const state = document.createElement('small'); state.textContent = t(done ? 'recordedState' : 'notRecorded'); description.append(title, timing, state); button.append(number, description);
    if (part.speakers?.length) { const speaker = document.createElement('small'); speaker.textContent = `${t('speaker')} ${part.speakers.join(' + ')}`; description.append(speaker); }
    if (part.review) { const review = document.createElement('small'); review.textContent = t('checkCut'); description.append(review); }
    button.onclick = () => action(() => choosePart(index)); $('parts').append(button);
  });
  if (!project.parts.length) { const text = document.createElement('p'); text.className = 'hint'; text.textContent = t('noParts'); $('parts').append(text); }
  $('completion').textContent = `${complete}/${project.parts.length} ${t('recorded')}`;
  $('part-total').textContent = project.parts.length;
  $('active-number').textContent = currentPart() ? `${t('part')} ${activeIndex + 1} ${t('of')} ${project.parts.length}` : '';
  $('active-title').textContent = currentPart() ? `${t('part')} ${activeIndex + 1}` : t('noParts');
  $('active-time').textContent = currentPart() ? `${time(currentPart().start)} – ${time(currentPart().end)}` : '';
  if (currentPart()) { $('cut-start').value = currentPart().start.toFixed(3); $('cut-end').value = currentPart().end.toFixed(3); }
  $('full-video-part').hidden = project.parts.length > 0;
  $('review-hint').textContent = t(complete === project.parts.length ? 'reviewComplete' : 'reviewMissing');
  controls();
}
async function checkTake(id, individual = false) {
  stopPlayback();
  const take = (individual ? window.aerodubTimeline.clips(project.takes) : project.takes).find(take => take.id === id);
  if (!take) throw new Error('INVALID_VALUE');
  const clips = !individual && take.splits?.length ? window.aerodubTimeline.clips([take]).filter(clip => !clip.muted && !clip.removed) : [take];
  const start = Math.min(...clips.map(clip => clip.start + clip.offset)), end = Math.min(project.duration, Math.max(...clips.map(clip => clip.start + clip.offset + clip.trimEnd - clip.trimStart)));
  if (start >= project.duration || end <= 0) throw new Error('INVALID_VALUE');
  audition.src = await api.previewTake(id, individual); audition.volume = 1;
  await seekTo(Math.max(0, start));
  if (start < 0) { await new Promise((resolve, reject) => { if (audition.readyState >= 1) resolve(); else { audition.onloadedmetadata = resolve; audition.onerror = () => reject(new Error('audioError')); } }); audition.currentTime = -start; }
  auditionStart = start; rangeEnd = end;
  try { await Promise.all([audition.play(), $('video').play()]); }
  catch (error) { stopPlayback(); throw error; }
  status('auditionReady');
}
async function checkPartTakes() {
  stopPlayback();
  const result = await api.previewPart(currentPart().id); audition.src = result.url; audition.volume = 1;
  await seekTo(result.start); auditionStart = result.start; rangeEnd = result.end;
  try { await Promise.all([audition.play(), $('video').play()]); } catch (error) { stopPlayback(); throw error; }
  status('auditionReady');
}
function renderTakes() {
  $('takes').replaceChildren();
  const takes = project?.takes.filter(t => t.partId === currentPart()?.id) || [];
  $('take-count').textContent = takes.length ? `(${takes.length})` : ''; $('empty-takes').hidden = takes.length > 0;
  for (const take of takes) {
    const row = document.createElement('article'); row.className = 'take'; row.dataset.takeId = take.id;
    const top = document.createElement('div'); top.className = 'take-top';
    const choice = document.createElement('label'); choice.className = 'check';
    const selected = document.createElement('input'); selected.type = 'radio'; selected.name = 'selected-take'; selected.checked = take.selected;
    selected.name = `selected-take-${take.recordTrackId || take.trackId || 'dub-1'}`;
    selected.onchange = () => { for (const sibling of takes.filter(sibling => (sibling.recordTrackId || sibling.trackId || 'dub-1') === (take.recordTrackId || take.trackId || 'dub-1'))) sibling.selected = sibling.id === take.id; persist(); renderParts(); controls(); draw(); };
    choice.append(selected, document.createTextNode(t('selected')));
    const name = document.createElement('input'); name.type = 'text'; name.className = 'take-name'; name.value = take.name; name.maxLength = 120; name.setAttribute('aria-label', t('takeName')); name.onchange = () => { take.name = name.value; persist(); };
    const stamp = document.createElement('span'); stamp.className = 'take-time'; stamp.textContent = `${take.duration.toFixed(2)} s`;
    const button = (key, callback) => { const element = document.createElement('button'); element.textContent = t(key); element.onclick = callback; return element; };
    top.append(choice, name, stamp, button('audition', () => action(() => checkTake(take.id))), button('delete', () => action(async () => { if (window.confirm(t('confirmDelete'))) { invalidateMix(); setProject(await api.deleteTake(take.id)); } })));
    const fields = document.createElement('div'); fields.className = 'take-controls';
    for (const [key, prop, factor, min, max, step] of [['offset', 'offset', 1000, -Math.max(60, project.duration) * 1000, Math.max(60, project.duration) * 1000, 10], ['trimStart', 'trimStart', 1, 0, take.duration - .01, .01], ['trimEnd', 'trimEnd', 1, .01, take.duration, .01], ['gain', 'gain', 1, 0, 4, .05]]) {
      const label = document.createElement('label'); label.append(document.createTextNode(t(key)));
      const input = document.createElement('input'); input.type = 'number'; input.value = (take[prop] * factor).toFixed(factor === 1000 ? 0 : 2); Object.assign(input, { min, max, step });
      input.onchange = () => { const value = Number(input.value) / factor; if (!input.validity.valid || (prop === 'trimStart' && value >= take.trimEnd) || (prop === 'trimEnd' && value <= take.trimStart)) { showError(new Error('INVALID_VALUE')); input.value = (take[prop] * factor).toFixed(2); return; } take[prop] = value; persist(); draw(); };
      label.append(input); fields.append(label);
    }
    for (const [key, prop] of [['cleanTake', 'clean'], ['mute', 'muted']]) { const label = document.createElement('label'); label.className = 'check'; const input = document.createElement('input'); input.type = 'checkbox'; input.checked = take[prop]; input.onchange = () => { take[prop] = input.checked; persist(); renderParts(); controls(); draw(); }; label.append(input, document.createTextNode(t(key))); fields.append(label); }
    row.append(top, fields); $('takes').append(row);
  }
  if (typeof renderProfessional === 'function') renderProfessional();
  controls();
}
async function disableMic() {
  stream?.getTracks().forEach(track => track.stop()); stream = null;
  if (micVoiceSession) await micVoiceSession.close(); else if (micContext) await micContext.close(); micContext = null; micVoiceSession = null; analyser = null;
  $('meter').value = 0; $('enable-mic').textContent = t('enableMic');
}
async function enableMic() {
  await disableMic(); const clean = $('clean').checked, deviceId = selectedMicId;
  try {
  stream = await navigator.mediaDevices.getUserMedia(window.aerodubVoiceConfig.captureConstraints(deviceId, clean, $('auto-input-level').checked));
  stream.getAudioTracks()[0].addEventListener('ended', () => { if (recording) stopRecord(); status('micError', true); });
  micVoiceSession = await createVoiceSession(stream); micContext = micVoiceSession.context; analyser = micVoiceSession.analyser;
  micDevices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'audioinput'); renderMicrophones();
  $('enable-mic').textContent = t('micOff'); status('micReady');
  } catch (error) { await disableMic(); throw error; }
}
async function beginRecord() {
  if (busy || recording || saving || !currentPart()) return;
  busy = true; controls();
  try {
    await pendingSave; const part = currentPart(); stopPlayback(); if (document.body.dataset.editor === 'professional' && project.sourceClips) referenceMixURL ||= await api.previewReference(); await enableMic(); await seekTo(part.start);
    chunks = []; recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); }; recorder.onstop = finishRecord; recorder.onerror = () => { status('micError', true); stopRecord(); };
    recordInfo = { start: part.start, end: part.end, partId: part.id, trackId: document.body.dataset.editor === 'professional' ? proArmedTrack : 'dub-1', clean: $('clean').checked, lead: 0, voice: voiceSettingsSnapshot() };
    recording = true; controls();
    const startedAt = await new Promise(resolve => { recorder.onstart = () => resolve(performance.now()); recorder.start(100); });
    await startPlayback(); recordInfo.lead = Math.max(0, (performance.now() - startedAt) / 1000); rangeEnd = part.end; status('recording');
  } catch (error) { if (recorder?.state === 'recording') recorder.stop(); else { recording = false; await disableMic(); } showError(['NotAllowedError', 'NotFoundError'].includes(error.name) ? new Error('micError') : error); }
  finally { busy = false; controls(); }
}
function stopRecord() {
  if (!recording || recorder?.state !== 'recording') return;
  recordInfo.end = Math.min(recordInfo.end, Math.max(recordInfo.start + .1, $('video').currentTime)); stopPlayback(); recorder.stop(); saving = true; controls();
}
async function finishRecord() {
  recording = false; busy = true; saving = true; controls();
  try { await disableMic(); const bytes = new Uint8Array(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer()); setProject(await api.saveTake(bytes, recordInfo)); if (typeof professionalTakeRecorded === 'function') professionalTakeRecorded(); invalidateMix(); await seekTo(currentPart().start); status('takeSaved'); }
  catch (error) { showError(error); }
  finally { chunks = []; busy = false; saving = false; controls(); $('check-take').focus(); }
}
function drawTrack(id, isDub = false) {
  const canvas = $(id), width = canvas.clientWidth, height = 60, dpr = window.devicePixelRatio || 1;
  if (!width) return;
  if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr); if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
  const context = canvas.getContext('2d'); context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
  if (!project) return;
  const scale = width / project.duration, part = currentPart();
  if (part && mode !== 'review') { context.fillStyle = '#b2dfec'; context.fillRect(part.start * scale, 0, (part.end - part.start) * scale, height); }
  context.strokeStyle = '#ccdfe7'; context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
  function wave(values, start, length, color, gain = 1) {
    context.fillStyle = color; const span = length * scale, count = Math.max(1, Math.floor(span / 2));
    for (let i = 0; i < count; i++) { const peak = values[Math.min(values.length - 1, Math.floor(i / count * values.length))] || 0; const h = Math.max(1, Math.min(1, peak * gain) * 46); context.fillRect(start * scale + i * span / count, (height - h) / 2, 1.5, h); }
  }
  if (!isDub) wave(project.peaks, 0, project.duration, '#2486a8');
  else for (const take of window.aerodubTimeline.clips(project.takes).filter(t => t.selected && !t.muted && !t.removed)) { const first = Math.floor(take.trimStart / take.duration * take.peaks.length), last = Math.ceil(take.trimEnd / take.duration * take.peaks.length); wave(take.peaks.slice(first, last), take.start + take.offset, take.trimEnd - take.trimStart, '#176354', take.gain * project.dubGain); }
  context.fillStyle = '#15374c'; context.fillRect($('video').currentTime * scale, 0, 1.5, height);
  canvas.setAttribute('aria-valuemax', project.duration); canvas.setAttribute('aria-valuenow', $('video').currentTime.toFixed(2));
}
function draw() { drawTrack('source-wave'); drawTrack('dub-wave', true); if (typeof drawProfessionalPlayhead === 'function') drawProfessionalPlayhead(); }
function frame() {
  if (auditionStart !== null && !audition.paused && !$('video').paused && Math.abs(audition.currentTime - ($('video').currentTime - auditionStart)) > .09) audition.currentTime = Math.max(0, $('video').currentTime - auditionStart);
  if (project) { const video = $('video'); $('clock').value = `${time(video.currentTime)} / ${time(project.duration)}`; $('seek').value = video.currentTime; if (!video.paused) { if (rangeEnd !== null && video.currentTime >= rangeEnd) { if (recording) stopRecord(); else stopPlayback(); } if (!audio.paused && Math.abs(audio.currentTime - video.currentTime) > .09) audio.currentTime = video.currentTime; draw(); } }
  const voiceAnalyser = analyser || [...voiceSessions].at(-1)?.analyser;
  if (voiceAnalyser) { const values = new Float32Array(voiceAnalyser.fftSize); voiceAnalyser.getFloatTimeDomainData(values); $('meter').value = Math.min(1, Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length) * 4); }
  requestAnimationFrame(frame);
}
const importVideo = () => action(async () => { await closeMusicSession(); stopPlayback(); const result = await api.importVideo(); if (result) { clearSong(); setProject(result.project, true); setMode('setup'); updateRecent(result.projects); status('imported'); } });
$('upload').onclick = importVideo; $('import').onclick = importVideo;
$('start-dubbing').onclick = () => action(async () => { if (!project.takes.length && project.speakerAnalysis?.version !== 3) setProject(await api.divideParts({ padding: Number($('padding').value) })); setMode('dubbing'); if (currentPart()) await choosePart(0); else status('noParts'); });
$('home').onclick = () => action(async () => { closeProjects(); closeSettings(); await closeMusicSession(); await disableMic(); releaseMedia(); updateRecent(await api.closeProject()); resetHome(); status('initialStatus'); });
$('project-search').oninput = renderProjects;
$('projects-toggle').onclick = () => { const open = $('projects-panel').hidden; closeSettings(); if (open) { $('project-search').value = ''; renderProjects(); $('projects-panel').hidden = false; $('projects-toggle').setAttribute('aria-expanded', 'true'); positionPanel('projects-panel', 'projects-toggle'); $('project-search').focus(); } else closeProjects(); };
$('divide').onclick = () => action(async () => { setProject(await api.divideParts({ padding: Number($('padding').value) })); if (currentPart()) await choosePart(0); });
for (const [id, operation] of [['cut-save', 'trim'], ['cut-split', 'split'], ['cut-merge', 'merge']]) $(id).onclick = () => action(async () => { stopPlayback(); const index = activeIndex; setProject(await api.editParts({ partId: currentPart().id, operation, start: Number($('cut-start').value), end: Number($('cut-end').value), position: $('video').currentTime })); await choosePart(Math.min(index, project.parts.length - 1)); });
$('full-video-part').onclick = () => action(async () => { setProject(await api.divideParts({ padding: Number($('padding').value), fullVideo: true })); await choosePart(0); });
$('previous-part').onclick = () => action(() => choosePart(activeIndex - 1)); $('next-part').onclick = () => action(() => choosePart(activeIndex + 1));
$('save').onclick = () => action(async () => { setProject(await api.updateProject(snapshot())); updateRecent(await api.saveProject()); status('saved'); });
$('export').onclick = () => action(async () => { stopPlayback(); const file = await api.exportVideo(); if (file) { status('exported', false, file); $('reveal').hidden = false; } });
$('reveal').onclick = () => api.revealExport().catch(showError);
$('review').onclick = () => action(async () => { stopPlayback(); mixURL = await api.previewMix(); setMode('review'); renderParts(); await seekTo(0); await startPlayback(true); status('mixReady'); });
$('back-dubbing').onclick = () => action(() => choosePart(activeIndex));
$('play').onclick = () => action(async () => { if ($('video').paused) { if ($('video').currentTime >= project.duration - .05) await seekTo(0); const professional = document.body.dataset.editor === 'professional'; if (professional && !mixURL) mixURL = await api.previewMix(); await startPlayback((mode === 'review' || professional) && Boolean(mixURL)); } else stopPlayback(); });
$('range-play').onclick = () => action(async () => { stopPlayback(); const part = currentPart(); if (document.body.dataset.editor === 'professional' && project.sourceClips) referenceMixURL ||= await api.previewReference(); await seekTo(part.start); await startPlayback(); rangeEnd = part.end; });
$('record').onclick = beginRecord; $('stop').onclick = stopRecord;
$('check-take').onclick = () => action(checkPartTakes);
$('enable-mic').onclick = () => action(async () => { if (stream) await disableMic(); else { try { await enableMic(); } catch { throw new Error('micError'); } } });
$('clean').onchange = () => { if (stream) action(enableMic); };
$('mic-toggle').onclick = () => { closeLanguage(); if (!$('mic-options').hidden) { closeMic(); return; } action(async () => { try { await discoverMicrophones(); $('mic-options').hidden = false; $('mic-toggle').setAttribute('aria-expanded', 'true'); } catch { throw new Error('micError'); } }); };
$('mic-options').onkeydown = event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const options = [...$('mic-options').querySelectorAll('button')], index = options.indexOf(document.activeElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; options[next]?.focus(); } };
$('seek').oninput = () => { if (project && !recording && !busy) { $('video').currentTime = Number($('seek').value); if (!audio.paused) audio.currentTime = $('video').currentTime; draw(); } };
for (const id of ['source-wave', 'dub-wave']) {
  $(id).onclick = event => { if (project && !recording && !busy) { $('video').currentTime = (event.clientX - $(id).getBoundingClientRect().left) / $(id).clientWidth * project.duration; if (!audio.paused) audio.currentTime = $('video').currentTime; draw(); } };
  $(id).onkeydown = event => { if (project && !recording && !busy && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); $('video').currentTime = event.key === 'Home' ? 0 : event.key === 'End' ? project.duration - .01 : Math.max(0, Math.min(project.duration - .01, $('video').currentTime + (event.key === 'ArrowRight' ? .1 : -.1))); if (!audio.paused) audio.currentTime = $('video').currentTime; draw(); } };
}
for (const [id, prop] of [['source-gain', 'sourceGain'], ['duck-gain', 'duckGain'], ['dub-gain', 'dubGain']]) { $(id).oninput = () => { project[prop] = Number($(id).value); $(id + '-value').value = `${Math.round(project[prop] * 100)}%`; draw(); }; $(id).onchange = persist; }
async function preferences() { await api.settings({ language, reduceMotion: $('reduce-motion').checked, micDeviceId: selectedMicId, portalSfxEnabled: $('portal-sfx').checked, autoInputLevel: $('auto-input-level').checked, voice: voiceSettingsSnapshot(), shortcuts: typeof proShortcuts === 'undefined' ? undefined : proShortcuts }); }
$('language-toggle').onclick = () => { if (!$('language-options').hidden) { closeLanguage(); return; } closeMic(); $('language-options').hidden = false; $('language-toggle').setAttribute('aria-expanded', 'true'); $('language-options').querySelector('[aria-selected=true]')?.focus(); };
$('language-toggle').onkeydown = event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); $('language-toggle').click(); } };
$('language-options').onkeydown = event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const options = [...$('language-options').querySelectorAll('button')], index = options.indexOf(document.activeElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; options[next]?.focus(); } };
$('reduce-motion').onchange = () => { document.body.classList.toggle('reduce-motion', $('reduce-motion').checked); preferences().catch(showError); };
function closeLanguage() { $('language-options').hidden = true; $('language-toggle').setAttribute('aria-expanded', 'false'); }
function closeMic() { $('mic-options').hidden = true; $('mic-toggle').setAttribute('aria-expanded', 'false'); }
function closeProjects() { $('projects-panel').hidden = true; $('projects-toggle').setAttribute('aria-expanded', 'false'); }
function closeSettings() { closeLanguage(); closeMic(); $('settings-panel').hidden = true; $('settings-toggle').setAttribute('aria-expanded', 'false'); }
function positionPanel(panel, trigger) { const rect = $(trigger).getBoundingClientRect(); $(panel).style.top = `${rect.bottom + 8}px`; $(panel).style.maxHeight = `${Math.max(180, innerHeight - rect.bottom - 76)}px`; }
function openSettings() { closeProjects(); $('settings-panel').hidden = false; $('settings-toggle').setAttribute('aria-expanded', 'true'); positionPanel('settings-panel', 'settings-toggle'); }
$('settings-toggle').onclick = () => { if ($('settings-panel').hidden) openSettings(); else closeSettings(); };
$('record-settings').onclick = openSettings;
document.addEventListener('click', event => {
  const path = event.composedPath();
  if (!path.includes($('language-picker'))) closeLanguage();
  if (!path.includes($('settings-panel')) && !path.includes($('settings-toggle')) && !path.includes($('record-settings'))) closeSettings();
  if (!path.includes($('projects-panel')) && !path.includes($('projects-toggle')) && !path.includes($('delete-project-dialog'))) closeProjects();
});
window.addEventListener('resize', () => { if (!$('settings-panel').hidden) positionPanel('settings-panel', 'settings-toggle'); if (!$('projects-panel').hidden) positionPanel('projects-panel', 'projects-toggle'); });
$('cancel').onclick = () => api.cancel().catch(showError);
$('video').onplay = () => { $('play').textContent = t('pause'); }; $('video').onpause = () => { $('play').textContent = t('play'); audio.pause(); audition.pause(); };
audition.onended = () => { if (auditionStart !== null) stopPlayback(); };
$('video').onended = () => { if (recording) stopRecord(); stopPlayback(); }; $('video').onseeked = draw;
$('video').ontimeupdate = () => { if (rangeEnd !== null && $('video').currentTime >= rangeEnd) { if (recording) stopRecord(); else stopPlayback(); } };
audio.onerror = audition.onerror = () => status('error', true, t('audioError')); $('video').onerror = () => status('error', true, t('videoError'));
api.onProgress(data => { $('job').hidden = !data; if (data) { $('job-label').textContent = t({ prepare: 'prepare', clean: 'clean', mix: 'mixJob', export: 'exportJob' }[data.stage] || data.stage); $('progress').value = data.value; } });
new ResizeObserver(draw).observe($('source-wave'));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('delete-project-dialog').open) { if (!$('language-options').hidden) { closeLanguage(); $('language-toggle').focus(); } else if (!$('mic-options').hidden) { closeMic(); $('mic-toggle').focus(); } else { const trigger = !$('projects-panel').hidden ? $('projects-toggle') : !$('settings-panel').hidden ? $('settings-toggle') : null; closeSettings(); closeProjects(); trigger?.focus(); } } if (!['music', 'sing'].includes(mode) && event.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'SUMMARY'].includes(event.target.tagName)) { event.preventDefault(); if (recording) stopRecord(); else $('play').click(); } });
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    const editable = event.target.closest('input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable=true], .copyable');
    if (!editable) { event.preventDefault(); window.getSelection()?.removeAllRanges(); }
    else if (editable.classList.contains('copyable')) { event.preventDefault(); const range = document.createRange(); range.selectNodeContents(editable); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
  }
});
window.addEventListener('beforeunload', event => { if (recording || busy || saving) { event.preventDefault(); event.returnValue = ''; } });
api.bootstrap().then(data => { language = data.settings.language; selectedMicId = data.settings.micDeviceId || ''; musicReady = data.musicReady; setupVoiceControls(data.settings.voice); if (typeof loadProfessionalSettings === 'function') loadProfessionalSettings(data.settings); $('auto-input-level').checked = data.settings.autoInputLevel !== false; $('portal-sfx').checked = Boolean(data.settings.portalSfxEnabled); $('reduce-motion').checked = data.settings.reduceMotion; document.body.classList.toggle('reduce-motion', data.settings.reduceMotion); translate(); updateRecent(data.projects); setMode('welcome'); status('initialStatus'); }).catch(showError);
requestAnimationFrame(frame);
