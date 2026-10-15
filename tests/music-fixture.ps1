param([Parameter(Mandatory=$true)][string]$Ffmpeg)
$ErrorActionPreference = 'Stop'
$fixtureRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'test-output\music'
New-Item -ItemType Directory -Path $fixtureRoot -Force | Out-Null
$voiceFile = Join-Path $fixtureRoot 'voice.wav'
$speaker = New-Object -ComObject SAPI.SpVoice
$stream = New-Object -ComObject SAPI.SpFileStream
try {
    $stream.Open($voiceFile, 3, $false)
    $speaker.AudioOutputStream = $stream
    $speaker.Speak('This is my song. We are singing in the sunlight. Let the blue sky carry our voices.') | Out-Null
} finally { $stream.Close() }
& $Ffmpeg '-y' '-v' 'error' '-i' $voiceFile '-f' 'lavfi' '-i' 'sine=frequency=220:sample_rate=44100:duration=30' '-filter_complex' '[1:a]volume=0.35,tremolo=f=3:d=0.3[backing];[0:a][backing]amix=inputs=2:duration=first:normalize=0' '-ac' '2' '-ar' '44100' '-c:a' 'libmp3lame' '-b:a' '192k' (Join-Path $fixtureRoot 'source.mp3')
if ($LASTEXITCODE -ne 0) { throw 'Could not create the synthetic music fixture' }
