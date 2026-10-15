param([Parameter(Mandatory=$true)][string]$Ffmpeg)
$ErrorActionPreference = 'Stop'
$speakerRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'test-output\speakers'
New-Item -ItemType Directory -Path $speakerRoot -Force | Out-Null
$speakerVoice = New-Object -ComObject SAPI.SpVoice
$speakerVoices = $speakerVoice.GetVoices()
if ($speakerVoices.Count -lt 2) { throw 'Two installed SAPI voices are required for this fixture' }
for ($speakerIndex = 0; $speakerIndex -lt 2; $speakerIndex++) {
    $voiceFile = Join-Path $speakerRoot "voice-$speakerIndex.wav"
    $speakerStream = New-Object -ComObject SAPI.SpFileStream
    try {
        $speakerVoice.Voice = $speakerVoices.Item($speakerIndex)
        $speakerStream.Open($voiceFile, 3, $false)
        $speakerVoice.AudioOutputStream = $speakerStream
        $speakerVoice.Speak('The blue sky is clear. I will start speaking again.') | Out-Null
    } finally { $speakerStream.Close() }
    & $Ffmpeg '-y' '-v' 'error' '-i' $voiceFile '-af' 'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03,areverse' '-ar' '16000' '-ac' '1' (Join-Path $speakerRoot "trim-$speakerIndex.wav")
    if ($LASTEXITCODE -ne 0) { throw 'Could not trim the speaker fixture' }
}
& $Ffmpeg '-y' '-v' 'error' '-i' (Join-Path $speakerRoot 'trim-0.wav') '-i' (Join-Path $speakerRoot 'trim-1.wav') '-i' (Join-Path $speakerRoot 'trim-0.wav') '-filter_complex' '[0:a][1:a][2:a]concat=n=3:v=0:a=1' (Join-Path $speakerRoot 'conversation.wav')
if ($LASTEXITCODE -ne 0) { throw 'Could not combine the speaker fixture' }
& $Ffmpeg '-y' '-v' 'error' '-f' 'lavfi' '-i' 'testsrc2=size=320x180:rate=25:duration=60' '-i' (Join-Path $speakerRoot 'conversation.wav') '-c:v' 'libx264' '-preset' 'ultrafast' '-c:a' 'aac' '-shortest' (Join-Path $speakerRoot 'conversation.mp4')
if ($LASTEXITCODE -ne 0) { throw 'Could not create the speaker video' }
