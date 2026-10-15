const timelineTools = window.aerodubTimeline;
let professionalEnabled = false, proProjectId = null, proPartId = null, proSelection = null, proScale = 1, proWidth = 1;
let proUndo = [], proRedo = [], proDrag = null, proShortcutCapture = null;
let proInternalSave = false, proTakeIds = '';
let proArmedTrack = 'dub-1';
let proShortcuts = { ...window.aerodubShortcuts.defaults };
const proSelectedClip = () => project && proSelection ? timelineTools.trackClips(project, proSelection.track).find(clip => clip.id === proSelection.id) : null;
const proActive = () => professionalEnabled && project && ['dubbing', 'review'].includes(mode);
const proBlocked = () => busy || recording || saving;
const editableClipFields = ['offset', 'trimStart', 'trimEnd', 'gain', 'muted', 'effects', 'removed', 'trackId'];
$('session').querySelector('.studio-layout').append($('pro-inspector'));
function clearProfessionalHistory() { proUndo = []; proRedo = []; }
function proStatus(key, error = false) { $('pro-edit-status').dataset.i18n = key; $('pro-edit-status').textContent = t(key); $('pro-edit-status').classList.toggle('error', error); }

function proState() {
  return structuredClone({ takes: snapshot().takes, dubTracks: timelineTools.dubTracks(project), sourceClips: timelineTools.trackClips(project, 'original'), videoClips: timelineTools.trackClips(project, 'video') });
}
function applyProState(state) {
  project.sourceClips = structuredClone(state.sourceClips); project.videoClips = structuredClone(state.videoClips);
  project.dubTracks = structuredClone(state.dubTracks);
  for (const value of state.takes) Object.assign(project.takes.find(take => take.id === value.id), structuredClone(value), { splits: structuredClone(value.splits || []) });
}
function writeProClip(track, clip) {
  if (track !== 'dub') {
    const key = track === 'video' ? 'videoClips' : 'sourceClips';
    project[key] = timelineTools.trackClips(project, track).map(current => current.id === clip.id ? { ...clip } : current);
  } else {
    const parent = project.takes.find(take => take.id === clip.takeId);
    const target = parent.id === clip.id ? parent : parent.splits.find(value => value.id === clip.id);
    for (const key of editableClipFields) target[key] = clip[key];
  }
}
function proSave(mutator, history = true, afterSave) {
  if (!proActive() || proBlocked() || proDrag) return;
  return action(async () => {
    const before = proState(), selection = proSelection ? { ...proSelection } : null;
    const resume = !$('video').paused;
    stopPlayback(); proStatus('clipSaving');
    let committed = false;
    try {
      mutator();
      const after = proState(), position = $('video').currentTime;
      let data;
      proInternalSave = true;
      try { data = await persist(); } finally { proInternalSave = false; }
      const changedVideo = data.videoURL !== project.videoURL;
      committed = true;
      setProject(data);
      if (history && JSON.stringify(before) !== JSON.stringify(after)) { proUndo.push({ before, after, selection, afterSelection: proSelection ? { ...proSelection } : null }); if (proUndo.length > 80) proUndo.shift(); proRedo = []; }
      afterSave?.(); proStatus('clipSaved');
      if (changedVideo) { $('video').src = data.videoURL; $('video').load(); await seekTo(position); }
      if (resume) { await seekTo(position); mixURL = await api.previewMix(); await startPlayback(true); }
    } catch (error) {
      if (!committed) {
        applyProState(before); proSelection = selection; renderParts(); renderTakes();
        proStatus('clipSaveFailed', true);
      }
      throw error;
    }
    renderProfessional(); draw();
  });
}
function proUndoEdit(redo = false) {
  const source = redo ? proRedo : proUndo, destination = redo ? proUndo : proRedo, entry = source.at(-1);
  if (!entry) return;
  return proSave(() => { applyProState(redo ? entry.after : entry.before); proSelection = redo ? entry.afterSelection : entry.selection; }, false, () => { source.pop(); destination.push(entry); });
}
function proSelect(track, id, focus = false) {
  if (proBlocked() || proDrag) return;
  if (proSelection?.id !== id || proSelection?.track !== track) $('pro-inspector').scrollTop = 0;
  if (typeof setProInspectorTab === 'function' && (proSelection?.id !== id || proSelection?.track !== track)) setProInspectorTab(track === 'video' ? 'timing' : 'audio', false);
  proSelection = { track, id };
  const clip = proSelectedClip();
  if (track === 'dub' && clip) {
    proArmedTrack = clip.trackId;
    activeIndex = Math.max(0, project.parts.findIndex(part => part.id === clip.partId)); proPartId = currentPart()?.id;
    renderParts(); renderTakes();
  } else renderProfessional();
  if (focus) proFindElement(track, id)?.focus({ preventScroll: true });
}
function proFindElement(track, id) { return [...document.querySelectorAll('.pro-clip')].find(node => node.dataset.track === track && node.dataset.clipId === id); }
function professionalControls() {
  const blocked = proBlocked(), active = proActive();
  for (const id of ['easy-mode', 'pro-mode']) $(id).disabled = blocked;
  for (const node of document.querySelectorAll('#professional button, #professional input, #professional select, #pro-inspector input, #pro-inspector button, #pro-inspector select')) node.disabled = blocked;
  if ($('pro-fullscreen')) { $('pro-fullscreen').hidden = !active; $('pro-fullscreen').disabled = blocked; }
  if ($('pro-preview-seek')) $('pro-preview-seek').disabled = blocked;
  $('pro-undo').disabled ||= !proUndo.length; $('pro-redo').disabled ||= !proRedo.length;
  const clip = proSelectedClip(), range = clip && timelineTools.bounds(clip), playhead = $('video').currentTime;
  $('pro-split').disabled ||= !clip || playhead < range.start + .02 || playhead > range.end - .02;
  $('pro-delete').disabled ||= !clip;
  $('pro-record').disabled ||= !currentPart(); $('pro-previous').disabled ||= activeIndex <= 0;
  $('pro-next').disabled ||= !project || activeIndex >= project.parts.length - 1;
  $('pro-record').hidden = recording; $('pro-stop').hidden = !recording; $('pro-stop').disabled = !recording || busy;
  $('pro-record').textContent = t(project?.takes.some(take => take.partId === currentPart()?.id && (take.recordTrackId || take.trackId || 'dub-1') === proArmedTrack && take.selected) ? 'retake' : 'record');
  $('pro-add-track').disabled ||= !project || timelineTools.dubTracks(project).length >= 16;
  $('pro-part-context').textContent = currentPart() ? `${t('part')} ${activeIndex + 1}/${project.parts.length} · ${time(currentPart().start)} – ${time(currentPart().end)}${recording ? ` · ${t('recording')}` : ''}` : t('noParts');
  if (clip) {
    const video = proSelection.track === 'video';
    $('pro-name').disabled ||= proSelection.track !== 'dub'; $('pro-clean').disabled ||= proSelection.track !== 'dub';
    $('pro-gain').disabled ||= video; $('pro-listen').disabled ||= video || clip.muted;
  }
  for (const node of document.querySelectorAll('.pro-clip')) node.setAttribute('aria-disabled', String(blocked || !active));
  if (active) $('play').textContent = t($('video').paused ? 'proPlayback' : 'pause');
}
function proFillInspector(clip) {
  $('pro-inspector-empty').hidden = Boolean(clip); $('pro-inspector-fields').hidden = !clip;
  $('pro-clip-duration').textContent = clip ? `${(clip.trimEnd - clip.trimStart).toFixed(3)} s` : '';
  if (!clip) return;
  const range = timelineTools.bounds(clip);
  $('pro-name').value = proSelection.track === 'dub' ? project.takes.find(take => take.id === clip.takeId).name : t(proSelection.track === 'video' ? 'videoTrack' : 'source');
  for (const [id, value] of [['pro-position', range.start], ['pro-end', range.end], ['pro-trim-start', clip.trimStart], ['pro-trim-end', clip.trimEnd]]) $(id).value = value.toFixed(3);
  $('pro-position').max = Math.max(0, project.duration - (range.end - range.start)); $('pro-end').max = project.duration;
  $('pro-trim-start').max = clip.trimEnd - .01; $('pro-trim-end').max = clip.duration;
  $('pro-gain').value = clip.gain; $('pro-gain-value').value = `${Math.round(clip.gain * 100)}%`;
  $('pro-muted').checked = clip.muted; $('pro-clean').checked = Boolean(clip.clean);
  $('pro-gain').closest('label').hidden = proSelection.track === 'video';
  $('pro-clean').closest('label').hidden = proSelection.track !== 'dub';
  $('pro-listen').hidden = proSelection.track === 'video';
  $('pro-listen').textContent = t('soloClip');
  $('pro-clip-track-label').hidden = proSelection.track !== 'dub';
  $('pro-clip-track').replaceChildren();
  if (proSelection.track === 'dub') { for (const track of timelineTools.dubTracks(project)) { const option = new Option(track.name, track.id); $('pro-clip-track').append(option); } $('pro-clip-track').value = clip.trackId; }
  if (typeof renderClipAudioControls === 'function') renderClipAudioControls(clip);
}
function proDrawWave(canvas, peaks, clip, color) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.min(10000, Math.round(width * dpr)); canvas.height = Math.round(height * dpr);
  const context = canvas.getContext('2d'), ratio = canvas.width / width;
  context.setTransform(ratio, 0, 0, dpr, 0, 0); context.fillStyle = color;
  const count = Math.min(4000, Math.ceil(width / 3));
  for (let i = 0; i < count; i++) {
    const sourceTime = clip.trimStart + (i / count) * (clip.trimEnd - clip.trimStart);
    const peak = peaks?.[Math.min(peaks.length - 1, Math.floor(sourceTime / clip.duration * peaks.length))] || 0;
    const amplitude = Math.max(1, Math.min(1, peak * clip.gain * 1.6) * (height - 5));
    context.fillRect(i / count * width, (height - amplitude) / 2, Math.max(1, width / count - 1), amplitude);
  }
}
function proMakeClip(track, clip, container) {
  const range = timelineTools.bounds(clip), node = document.createElement('div');
  node.className = `pro-clip ${track}${clip.muted ? ' muted' : ''}`; node.tabIndex = 0; node.setAttribute('role', 'option');
  node.dataset.clipId = clip.id; node.dataset.track = track;
  node.setAttribute('aria-selected', String(proSelection?.track === track && proSelection.id === clip.id));
  node.style.left = `${range.start * proScale}px`; node.style.width = `${Math.max(3, (range.end - range.start) * proScale)}px`;
  const label = track === 'dub' ? clip.name : t(track === 'video' ? 'videoTrack' : 'source');
  node.setAttribute('aria-label', `${label}, ${time(range.start)} – ${time(range.end)}${clip.muted ? `, ${t('clipMuted')}` : ''}`);
  node.title = `${label} · ${time(range.start)} – ${time(range.end)}`;
  const name = document.createElement('span'); name.className = 'pro-clip-name'; name.textContent = `${clip.muted ? `${t('clipMuted')} · ` : ''}${label}`; node.append(name);
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); canvas.hidden = track === 'video'; node.append(canvas);
  if (track === 'video' && project.thumbnailDataURL?.startsWith('data:image/jpeg;base64,')) {
    node.style.backgroundImage = `url("${project.thumbnailDataURL}")`; node.style.backgroundSize = `${project.duration * proScale}px 100%`; node.style.backgroundPosition = `${-clip.trimStart * proScale}px center`;
  }
  for (const [edge, operation] of [['left', 'left'], ['right', 'right']]) {
    const handle = document.createElement('span'); handle.className = `pro-trim ${edge}`; handle.dataset.operation = operation; handle.title = t(edge === 'left' ? 'trimLeft' : 'trimRight'); handle.setAttribute('aria-hidden', 'true'); node.append(handle);
  }
  node.onpointerdown = event => proStartDrag(event, track, clip, node);
  node.onclick = () => { if (!proDrag) proSelect(track, clip.id); };
  node.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); proSelect(track, clip.id, true); } };
  container.append(node);
  proDrawWave(canvas, track === 'video' ? [] : track === 'dub' ? clip.peaks : project.peaks, clip, track === 'dub' ? '#226b71' : '#286f96');
}
function renderProfessional() {
  if (project?.id !== proProjectId) {
    proProjectId = project?.id || null; professionalEnabled = false; proUndo = []; proRedo = []; proSelection = null; proPartId = null; proArmedTrack = 'dub-1'; $('pro-zoom').value = 1;
  }
  const takeIds = project?.takes.map(take => take.id).join(',') || '';
  if (takeIds !== proTakeIds) { clearProfessionalHistory(); proTakeIds = takeIds; }
  if (project && proPartId !== currentPart()?.id) {
    proPartId = currentPart()?.id;
    const take = timelineTools.trackClips(project, 'dub').find(take => take.partId === proPartId && take.trackId === proArmedTrack);
    if (take) proSelection = { track: 'dub', id: take.id };
    else if (proSelection?.track === 'dub') proSelection = null;
  }
  const eligible = project && ['dubbing', 'review'].includes(mode), active = proActive();
  document.body.dataset.editor = active ? 'professional' : 'easy';
  $('editing-modes').hidden = !eligible; $('professional').hidden = !active; $('pro-inspector').hidden = !active;
  $('easy-mode').setAttribute('aria-pressed', String(!professionalEnabled)); $('pro-mode').setAttribute('aria-pressed', String(professionalEnabled));
  $('editing-mode-hint').textContent = t(professionalEnabled ? 'proModeHint' : 'easyModeHint');
  $('editing-modes').querySelector('.mode-switch').setAttribute('aria-label', t('dubbingMode'));
  if (!active || proDrag) return;
  const dubTracks = timelineTools.dubTracks(project);
  if (!dubTracks.some(track => track.id === proArmedTrack)) proArmedTrack = dubTracks[0].id;
  $('pro-record-track').replaceChildren(); for (const track of dubTracks) $('pro-record-track').append(new Option(track.name, track.id)); $('pro-record-track').value = proArmedTrack;
  if (proSelection && !proSelectedClip()) proSelection = null;
  const available = Math.max(200, $('pro-scroll').clientWidth);
  proWidth = available * Number($('pro-zoom').value); proScale = proWidth / project.duration;
  $('pro-canvas').style.width = `${proWidth}px`;
  const ruler = $('pro-ruler'); ruler.replaceChildren();
  const target = 90 / proScale, tick = [ .1, .2, .5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600 ].find(value => value >= target) || 3600;
  for (let position = 0; position < project.duration; position += tick) { const mark = document.createElement('span'); mark.style.left = `${position * proScale}px`; mark.textContent = time(position); ruler.append(mark); }
  const labels = $('pro-track-labels'); labels.replaceChildren();
  const label = (text, height, detail) => { const node = document.createElement('div'); node.style.height = `${height}px`; node.textContent = text; if (detail) { const small = document.createElement('small'); small.textContent = detail; node.append(small); } labels.append(node); };
  label('s', 34); label(t('videoTrack'), 60); label(t('source'), 60);
  $('pro-video-track').replaceChildren(); $('pro-original-wave').hidden = true;
  const original = $('pro-original-wave').parentElement; original.querySelectorAll('.pro-clip').forEach(node => node.remove());
  for (const clip of timelineTools.trackClips(project, 'video')) proMakeClip('video', clip, $('pro-video-track'));
  for (const clip of timelineTools.trackClips(project, 'original')) proMakeClip('original', clip, original);
  const clips = timelineTools.trackClips(project, 'dub'), tracks = $('pro-dub-tracks'); tracks.replaceChildren();
  for (const track of dubTracks) {
    const ownClips = clips.filter(clip => clip.trackId === track.id), arrangement = timelineTools.lanes(ownClips);
    const row = document.createElement('div'); row.className = `pro-dub-track${track.muted ? ' muted-track' : ''}`; row.dataset.trackId = track.id; row.setAttribute('role', 'group'); row.setAttribute('aria-label', track.name); tracks.append(row);
    const heading = document.createElement('div'); heading.className = 'pro-track-heading'; heading.style.height = `${arrangement.count * 76}px`;
    const arm = document.createElement('button'); arm.className = 'pro-arm-track'; arm.textContent = track.name; arm.setAttribute('aria-pressed', String(proArmedTrack === track.id)); arm.title = `${t('recordToTrack')} ${track.name}`; arm.onclick = () => armProTrack(track.id);
    const mute = document.createElement('button'); mute.className = 'pro-mute-track'; mute.textContent = t(track.muted ? 'unmuteTrack' : 'mute'); mute.setAttribute('aria-pressed', String(track.muted)); mute.onclick = () => proSave(() => { project.dubTracks = dubTracks.map(value => value.id === track.id ? { ...value, muted: !value.muted } : value); });
    heading.append(arm, mute); labels.append(heading);
    for (let i = 0; i < arrangement.count; i++) {
      const lane = document.createElement('div'); lane.className = 'pro-lane'; row.append(lane);
      for (const clip of ownClips.filter(clip => arrangement.positions.get(clip.id) === i)) proMakeClip('dub', clip, lane);
    }
  }
  $('pro-empty').hidden = clips.length > 0; $('pro-snap').title = t('snapHint');
  $('pro-scroll').setAttribute('aria-label', t('timelineTitle')); ruler.setAttribute('aria-label', t('position'));
  for (const [node, name] of [[$('pro-video-track'), 'videoTrack'], [original, 'source'], [tracks, 'yourVoice']]) { node.setAttribute('role', 'listbox'); node.setAttribute('aria-label', t(name)); }
  proFillInspector(proSelectedClip()); renderProShortcuts(); drawProfessionalPlayhead(); professionalControls();
}
function drawProfessionalPlayhead() {
  if (!proActive()) return;
  $('pro-playhead').style.left = `${$('video').currentTime * proScale}px`;
  const scroll = $('pro-scroll'), x = $('video').currentTime * proScale;
  if ($('pro-preview-seek')) { $('pro-preview-seek').max = project.duration; $('pro-preview-seek').value = $('video').currentTime; $('pro-preview-seek').setAttribute('aria-label', t('position')); }
  if (!$('video').paused && !proDrag && (x > scroll.scrollLeft + scroll.clientWidth - 24 || x < scroll.scrollLeft)) scroll.scrollLeft = Math.max(0, x - scroll.clientWidth * .2);
  $('pro-ruler').setAttribute('aria-valuemax', project.duration); $('pro-ruler').setAttribute('aria-valuenow', $('video').currentTime.toFixed(3));
  const clip = proSelectedClip(), range = clip && timelineTools.bounds(clip), value = $('video').currentTime;
  $('pro-split').disabled = proBlocked() || !range || value < range.start + .02 || value > range.end - .02;
}
function proStartDrag(event, track, clip, node) {
  if (event.button !== 0 || proBlocked()) return;
  event.preventDefault(); event.stopPropagation();
  proSelect(track, clip.id);
  node = proFindElement(track, clip.id); node.focus({ preventScroll: true });
  const operation = event.target.dataset.operation || 'move', range = timelineTools.bounds(clip);
  stopPlayback();
  proDrag = { track, clip: { ...clip }, node, operation, range, x: event.clientX, y: event.clientY, scroll: $('pro-scroll').scrollLeft, next: clip, moved: false };
  node.classList.add('dragging'); node.setPointerCapture(event.pointerId);
  node.onpointermove = proMoveDrag; node.onpointerup = proEndDrag;
  node.onpointercancel = () => proCancelDrag();
  node.onlostpointercapture = () => { if (proDrag) proCancelDrag(); };
}
function proMoveDrag(event) {
  if (!proDrag) return;
  const drag = proDrag, scroll = $('pro-scroll'), rect = scroll.getBoundingClientRect();
  if (event.clientX > rect.right - 35) scroll.scrollLeft += 14;
  if (event.clientX < rect.left + 35) scroll.scrollLeft -= 14;
  const trackViewport = document.querySelector('.pro-track-layout'), trackBounds = trackViewport.getBoundingClientRect();
  if (event.clientY > Math.min(innerHeight, trackBounds.bottom) - 24) trackViewport.scrollTop += 12;
  if (event.clientY < trackBounds.top + 24) trackViewport.scrollTop -= 12;
  const delta = (event.clientX - drag.x + scroll.scrollLeft - drag.scroll) / proScale;
  let position = (drag.operation === 'right' ? drag.range.end : drag.range.start) + delta;
  let snapped = null;
  if ($('pro-snap').getAttribute('aria-pressed') === 'true' && !event.altKey) {
    const targets = [0, project.duration, $('video').currentTime, ...project.parts.flatMap(part => [part.start, part.end]), ...['video', 'original', 'dub'].flatMap(track => timelineTools.trackClips(project, track).filter(clip => track !== drag.track || clip.id !== drag.clip.id).flatMap(clip => { const range = timelineTools.bounds(clip); return [range.start, range.end]; }))];
    const candidate = timelineTools.snap(position, targets, 8 / proScale);
    if (candidate !== position) { position = candidate; snapped = candidate; }
    else if (drag.operation === 'move') {
      const end = position + drag.range.end - drag.range.start, snapEnd = timelineTools.snap(end, targets, 8 / proScale);
      if (end !== snapEnd) { position += snapEnd - end; snapped = snapEnd; }
    }
  }
  drag.next = timelineTools.edit(drag.clip, drag.operation, position, project.duration);
  if (drag.track === 'dub') {
    const hovered = [...document.querySelectorAll('.pro-dub-track')].find(row => { const bounds = row.getBoundingClientRect(); return event.clientY >= bounds.top && event.clientY <= bounds.bottom; });
    if (hovered) { drag.next.trackId = hovered.dataset.trackId; drag.node.style.transform = `translateY(${hovered.getBoundingClientRect().top - drag.node.parentElement.getBoundingClientRect().top}px)`; }
  }
  const range = timelineTools.bounds(drag.next);
  drag.node.style.left = `${range.start * proScale}px`; drag.node.style.width = `${Math.max(3, (range.end - range.start) * proScale)}px`;
  drag.moved ||= Math.abs(event.clientX - drag.x) > 2 || Math.abs(event.clientY - drag.y) > 2 || Math.abs(scroll.scrollLeft - drag.scroll) > 2;
  proFillInspector(drag.next); proDrawWave(drag.node.querySelector('canvas'), drag.track === 'dub' ? drag.clip.peaks : drag.track === 'original' ? project.peaks : [], drag.next, '#226b71');
  $('pro-snap-line').hidden = snapped === null; if (snapped !== null) $('pro-snap-line').style.left = `${snapped * proScale}px`;
}
function proEndDrag(event) {
  const drag = proDrag; if (!drag) return;
  proDrag = null; drag.node.onlostpointercapture = null; drag.node.releasePointerCapture(event.pointerId); $('pro-snap-line').hidden = true;
  if (drag.moved) proSave(() => { writeProClip(drag.track, drag.next); if (drag.track === 'dub') proArmedTrack = drag.next.trackId; });
  else renderProfessional();
}
function proCancelDrag() { if (!proDrag) return; proDrag = null; $('pro-snap-line').hidden = true; renderProfessional(); }
function proSplit() {
  const clip = proSelectedClip(); if (!clip || $('pro-split').disabled) return;
  const track = proSelection.track, position = $('video').currentTime;
  proSave(() => {
    const [left, right] = timelineTools.split(clip, position); right.id = crypto.randomUUID();
    writeProClip(track, left);
    if (track === 'dub') {
      const parent = project.takes.find(take => take.id === clip.takeId);
      parent.splits ||= []; parent.splits.push(Object.fromEntries(['id', ...editableClipFields].map(key => [key, right[key]])));
    } else project[track === 'video' ? 'videoClips' : 'sourceClips'].push(right);
    proSelection = { track, id: right.id };
  });
}
function proDeleteClip() {
  const clip = proSelectedClip(); if (!clip) return;
  const track = proSelection.track;
  proSave(() => {
    if (track === 'dub') writeProClip(track, { ...clip, removed: true, muted: true });
    else project[track === 'video' ? 'videoClips' : 'sourceClips'] = timelineTools.trackClips(project, track).filter(item => item.id !== clip.id);
    proSelection = null;
  });
}
function proSeek(event) {
  if (!proActive() || proBlocked() || proDrag || event.target.closest('.pro-clip')) return;
  const position = (event.clientX - $('pro-canvas').getBoundingClientRect().left) / proScale;
  stopPlayback(); action(async () => { await seekTo(position); draw(); });
}
$('pro-ruler').onpointerdown = event => {
  if (event.button !== 0) return;
  proSeek(event);
  $('pro-ruler').setPointerCapture(event.pointerId);
};
$('pro-ruler').onpointermove = event => { if (event.buttons === 1) proSeek(event); };
$('pro-video-track').onclick = proSeek; $('pro-original-wave').parentElement.onclick = proSeek; $('pro-dub-tracks').onclick = proSeek;
$('pro-ruler').onkeydown = event => {
  if (!proActive() || proBlocked() || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? project.duration - .001 : $('video').currentTime + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 1 : .1);
  action(async () => { stopPlayback(); await seekTo(next); draw(); });
};
for (const [id, enabled] of [['easy-mode', false], ['pro-mode', true]]) $(id).onclick = () => {
  if (proBlocked()) return; stopPlayback(); professionalEnabled = enabled; renderProfessional();
  $('play').textContent = t(enabled ? 'proPlayback' : 'play'); controls(); draw();
  if (enabled && !project.thumbnailDataURL) action(async () => { setProject(await api.timelineThumbnails()); });
};
$('pro-zoom').oninput = () => {
  if (proDrag) return;
  const ratio = $('video').currentTime / project.duration; renderProfessional();
  $('pro-scroll').scrollLeft = Math.max(0, ratio * proWidth - $('pro-scroll').clientWidth / 2);
};
$('pro-fit').onclick = () => { $('pro-zoom').value = 1; renderProfessional(); $('pro-scroll').scrollLeft = 0; };
$('pro-snap').onclick = () => $('pro-snap').setAttribute('aria-pressed', String($('pro-snap').getAttribute('aria-pressed') !== 'true'));
$('pro-undo').onclick = () => proUndoEdit(); $('pro-redo').onclick = () => proUndoEdit(true); $('pro-split').onclick = proSplit;
$('pro-delete').onclick = proDeleteClip;
$('pro-record').onclick = beginRecord; $('pro-stop').onclick = stopRecord;
function armProTrack(id) { if (proBlocked()) return; proArmedTrack = id; proSelection = null; proPartId = null; renderProfessional(); }
function professionalTakeRecorded() { if (proActive()) { const take = project.takes.at(-1); proSelection = { track: 'dub', id: take.id }; proArmedTrack = take.trackId || 'dub-1'; renderProfessional(); } }
$('pro-record-track').onchange = () => armProTrack($('pro-record-track').value);
$('pro-add-track').onclick = () => proSave(() => {
  const tracks = timelineTools.dubTracks(project), number = Math.max(...tracks.map(track => Number(track.id.slice(4)))) + 1;
  proArmedTrack = `dub-${number}`; project.dubTracks = [...tracks, { id: proArmedTrack, name: `Dub ${number}`, gain: 1, muted: false }]; proSelection = null;
});
$('pro-clip-track').onchange = () => { const clip = proSelectedClip(), trackId = $('pro-clip-track').value; if (clip) proSave(() => { writeProClip('dub', { ...clip, trackId }); proArmedTrack = trackId; }); };
$('pro-previous').onclick = () => action(() => choosePart(activeIndex - 1)); $('pro-next').onclick = () => action(() => choosePart(activeIndex + 1));
for (const [id, operation] of [['pro-position', 'move'], ['pro-end', 'right'], ['pro-trim-start', 'sourceLeft'], ['pro-trim-end', 'sourceRight']]) $(id).onchange = () => {
  const clip = proSelectedClip(), value = Number($(id).value); if (!clip) return;
  if (!$(id).validity.valid || !Number.isFinite(value)) { proFillInspector(clip); showError(new Error('INVALID_VALUE')); return; }
  const range = timelineTools.bounds(clip);
  const position = operation === 'sourceLeft' ? range.start + value - clip.trimStart : operation === 'sourceRight' ? range.end + value - clip.trimEnd : value;
  const next = timelineTools.edit(clip, operation === 'sourceLeft' ? 'left' : operation === 'sourceRight' ? 'right' : operation, position, project.duration);
  proSave(() => writeProClip(proSelection.track, next));
};
$('pro-gain').oninput = () => { $('pro-gain-value').value = `${Math.round(Number($('pro-gain').value) * 100)}%`; };
for (const [id, field] of [['pro-gain', 'gain'], ['pro-muted', 'muted']]) $(id).onchange = () => {
  const clip = proSelectedClip(); if (!clip) return;
  const value = field === 'muted' ? $(id).checked : Number($(id).value);
  proSave(() => writeProClip(proSelection.track, { ...clip, [field]: value }));
};
$('pro-clean').onchange = () => { const clip = proSelectedClip(), value = $('pro-clean').checked; if (clip && proSelection.track === 'dub') proSave(() => writeProClip('dub', { ...clip, effects: { ...window.aerodubClipAudio.validate(clip.effects), cleanup: value ? 'clean' : 'raw' } })); };
$('pro-name').onchange = () => { const clip = proSelectedClip(), value = $('pro-name').value; if (clip && proSelection.track === 'dub') proSave(() => { project.takes.find(take => take.id === clip.takeId).name = value; }); };
$('pro-listen').onclick = () => {
  const clip = proSelectedClip(); if (!clip) return;
  if (proSelection.track === 'dub') action(() => checkTake(clip.id, true));
  else action(async () => {
    stopPlayback(); const range = timelineTools.bounds(clip);
    audition.src = await api.previewSourceClip(clip.id); audition.volume = 1;
    await seekTo(range.start); auditionStart = range.start; rangeEnd = range.end;
    try { await Promise.all([audition.play(), $('video').play()]); } catch (error) { stopPlayback(); throw error; }
    status('clipSoloReady');
  });
};
$('pro-reset').onclick = () => { const clip = proSelectedClip(); if (clip) proSave(() => writeProClip(proSelection.track, timelineTools.edit(clip, 'move', proSelection.track === 'dub' ? clip.start : clip.trimStart, project.duration))); };

function loadProfessionalSettings(settings) { proShortcuts = { ...(settings.shortcuts || window.aerodubShortcuts.defaults) }; renderProShortcuts(); }
function renderProShortcuts() {
  const list = $('pro-shortcut-list'); list.replaceChildren();
  const titles = { split: 'splitClip', play: 'proPlayback', undo: 'undoEdit', redo: 'redoEdit', nudgeLeft: 'nudgeLeft', nudgeRight: 'nudgeRight', deleteClip: 'deleteClip' };
  for (const [command, shortcut] of Object.entries(proShortcuts)) {
    const label = document.createElement('span'); label.textContent = t(titles[command]);
    const button = document.createElement('button'); button.className = 'shortcut-bind'; button.dataset.command = command; button.textContent = proShortcutCapture === command ? t('pressShortcut') : shortcut;
    button.setAttribute('aria-label', `${t(titles[command])}: ${shortcut}`); button.onclick = () => { proShortcutCapture = command; renderProShortcuts(); list.querySelector(`[data-command="${command}"]`).focus(); };
    const row = document.createElement('div'); row.append(label, button); list.append(row);
  }
  $('pro-key-hint').textContent = `${proShortcuts.split}: ${t('splitClip')} · ${proShortcuts.play}: ${t('proPlayback')} · ${proShortcuts.undo}: ${t('undoEdit')}`;
  $('pro-split').title = `${t('splitClip')} (${proShortcuts.split})`; $('pro-undo').title = proShortcuts.undo; $('pro-redo').title = proShortcuts.redo;
}
async function saveProShortcuts(next) {
  const previous = proShortcuts;
  try { proShortcuts = window.aerodubShortcuts.validate(next); await preferences(); $('pro-shortcut-message').textContent = t('shortcutsSaved'); }
  catch (error) { proShortcuts = previous; $('pro-shortcut-message').textContent = t(error.message === 'SHORTCUT_CONFLICT' ? 'shortcutConflict' : 'shortcutInvalid'); }
  proShortcutCapture = null; renderProShortcuts(); professionalControls();
}
$('pro-shortcut-reset').onclick = () => saveProShortcuts({ ...window.aerodubShortcuts.defaults });
document.addEventListener('keydown', event => {
  if (!proActive()) return;
  if (event.key === 'Escape') { if (proDrag) proCancelDrag(); if (proShortcutCapture) { proShortcutCapture = null; renderProShortcuts(); } return; }
  if (proShortcutCapture) {
    event.preventDefault(); event.stopImmediatePropagation();
    const combo = window.aerodubShortcuts.fromEvent(event); if (combo) saveProShortcuts({ ...proShortcuts, [proShortcutCapture]: combo }); return;
  }
  if (event.target.closest('input, textarea, select, [contenteditable=true], dialog, #settings-panel, #projects-panel, #pro-shortcuts') || proBlocked() || proDrag) return;
  const combo = window.aerodubShortcuts.fromEvent(event);
  if (event.target.closest('button') && combo === 'Space') return;
  let command = Object.keys(proShortcuts).find(command => proShortcuts[command] === combo);
  if (!command && event.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) command = Object.keys(proShortcuts).find(command => proShortcuts[command] === event.key);
  if (!command) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const focusedClip = event.target.closest('.pro-clip');
  if (focusedClip && (focusedClip.dataset.clipId !== proSelection?.id || focusedClip.dataset.track !== proSelection?.track)) proSelect(focusedClip.dataset.track, focusedClip.dataset.clipId);
  if (event.repeat && !command.startsWith('nudge')) return;
  if (command === 'split') proSplit();
  else if (command === 'deleteClip') proDeleteClip();
  else if (command === 'play') $('play').click();
  else if (command === 'undo' || command === 'redo') proUndoEdit(command === 'redo');
  else {
    const clip = proSelectedClip(); if (!clip) return;
    const track = proSelection.track, delta = (command === 'nudgeRight' ? 1 : -1) * (event.shiftKey ? .1 : .01);
    proSave(() => writeProClip(track, timelineTools.edit(clip, 'move', timelineTools.bounds(clip).start + delta, project.duration)));
  }
}, true);
new ResizeObserver(() => { if (proActive() && !proDrag) renderProfessional(); }).observe($('pro-scroll'));
