window.aerodubVoiceStrings = {
  en: { voiceControls: 'Universal voice control', voiceHint: 'Applies to new recordings in Dubbing and Sing it! Earlier takes keep their sound.', voiceVolume: 'Voice volume', voiceGain: 'Gain', voiceBass: 'Bass', voiceTreble: 'Treble', voicePitch: 'Pitch', semitones: 'st', voiceMonitor: 'Hear my voice', voiceMonitorHint: 'Use headphones. Live processing can add a short delay.', voiceReset: 'Reset voice controls' },
  id: { voiceControls: 'Kontrol suara global', voiceHint: 'Berlaku untuk rekaman baru di Dubbing dan Sing it! Take lama tetap memakai suaranya.', voiceVolume: 'Volume suara', voiceGain: 'Gain', voiceBass: 'Bass', voiceTreble: 'Treble', voicePitch: 'Pitch', semitones: 'st', voiceMonitor: 'Dengar suaraku sendiri', voiceMonitorHint: 'Pakai headphone. Proses live bisa memberi sedikit jeda.', voiceReset: 'Reset pengaturan suara' },
  'zh-CN': { voiceControls: '全局人声控制', voiceHint: '用于配音和 Sing it! 的新录音。已有录音保持原来的声音。', voiceVolume: '人声音量', voiceGain: '增益', voiceBass: '低音', voiceTreble: '高音', voicePitch: '音高', semitones: '半音', voiceMonitor: '监听自己的声音', voiceMonitorHint: '请使用耳机。实时处理可能会有轻微延迟。', voiceReset: '重置人声设置' },
  ja: { voiceControls: '共通の声の調整', voiceHint: '吹き替えと Sing it! の新しい録音に適用します。既存のテイクは変わりません。', voiceVolume: '声の音量', voiceGain: 'ゲイン', voiceBass: '低音', voiceTreble: '高音', voicePitch: 'ピッチ', semitones: '半音', voiceMonitor: '自分の声を聴く', voiceMonitorHint: 'ヘッドホンを使ってください。リアルタイム処理には少し遅延が生じる場合があります。', voiceReset: '声の設定をリセット' },
  ko: { voiceControls: '공통 음성 조절', voiceHint: '더빙과 Sing it! 의 새 녹음에 적용됩니다. 이전 테이크의 소리는 유지됩니다.', voiceVolume: '목소리 음량', voiceGain: '게인', voiceBass: '저음', voiceTreble: '고음', voicePitch: '피치', semitones: '반음', voiceMonitor: '내 목소리 듣기', voiceMonitorHint: '헤드폰을 사용하세요. 실시간 처리로 약간의 지연이 생길 수 있습니다.', voiceReset: '음성 설정 초기화' }
};
const inputLevelLabels = {
  en: { autoInputLevel: 'Auto microphone level', autoInputLevelHint: 'Helps quiet microphones stay audible. Turn off to keep the original input dynamics.' },
  id: { autoInputLevel: 'Level mikrofon otomatis', autoInputLevelHint: 'Membantu mikrofon pelan tetap terdengar. Matikan untuk menjaga dinamika input aslinya.' },
  'zh-CN': { autoInputLevel: '自动调节麦克风音量', autoInputLevelHint: '让较轻的麦克风输入更清晰可闻。关闭可保留原始输入的动态。' },
  ja: { autoInputLevel: 'マイク音量を自動調整', autoInputLevelHint: '小さなマイク入力を聴きやすくします。元の音量変化を保つにはオフにしてください。' },
  ko: { autoInputLevel: '마이크 음량 자동 조절', autoInputLevelHint: '작은 마이크 입력도 잘 들리도록 돕습니다. 원래 입력의 강약을 유지하려면 끄세요.' }
};
for (const [code, values] of Object.entries(inputLevelLabels)) Object.assign(window.aerodubVoiceStrings[code], values);
const cutLabels = {
  en: { editCuts: 'Adjust this part', manualCutHint: 'Adjust before recording. Applying automatic cuts again replaces these edits.', cutStart: 'Start (s)', cutEnd: 'End (s)', saveCut: 'Save timing', splitHere: 'Split at playhead', mergeNext: 'Join next part' },
  id: { editCuts: 'Perbaiki part ini', manualCutHint: 'Atur sebelum merekam. Terapkan potongan otomatis lagi akan mengganti editan ini.', cutStart: 'Mulai (d)', cutEnd: 'Selesai (d)', saveCut: 'Simpan timing', splitHere: 'Pisah di posisi video', mergeNext: 'Gabung part berikutnya' },
  'zh-CN': { editCuts: '调整当前片段', manualCutHint: '请在录制前调整。重新自动分段将替换这些修改。', cutStart: '开始（秒）', cutEnd: '结束（秒）', saveCut: '保存时间', splitHere: '在播放位置拆分', mergeNext: '合并下一段' },
  ja: { editCuts: 'このパートを調整', manualCutHint: '録音前に調整してください。自動分割を再適用すると編集内容が置き換わります。', cutStart: '開始（秒）', cutEnd: '終了（秒）', saveCut: '時間を保存', splitHere: '再生位置で分割', mergeNext: '次のパートと結合' },
  ko: { editCuts: '현재 파트 조정', manualCutHint: '녹음 전에 조정하세요. 자동 분할을 다시 적용하면 편집 내용을 바꿉니다.', cutStart: '시작 (초)', cutEnd: '종료 (초)', saveCut: '시간 저장', splitHere: '재생 위치에서 나누기', mergeNext: '다음 파트와 합치기' }
};
for (const code of Object.keys(cutLabels)) Object.assign(window.aerodubVoiceStrings[code], cutLabels[code]);
for (const [code, checkCut] of Object.entries({ en: 'Check this boundary', id: 'Periksa batas ini', 'zh-CN': '请检查此边界', ja: 'この境界を確認', ko: '이 경계 확인' })) window.aerodubVoiceStrings[code].checkCut = checkCut;
