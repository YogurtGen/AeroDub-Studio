#ifndef AppVersion
  #error AppVersion must be supplied by scripts/build-setup.ps1
#endif

[Setup]
AppId=studio.aerodub.desktop
AppName=AeroDub Studio
AppVersion={#AppVersion}
AppPublisher=AeroDub Studio
VersionInfoVersion={#AppVersion}.0
DefaultDirName={localappdata}\Programs\AeroDub Studio
DefaultGroupName=AeroDub Studio
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
WizardStyle=modern
SetupIconFile=..\src\renderer\app-icon.ico
UninstallDisplayIcon={app}\AeroDub Studio.exe
LicenseFile=..\LICENSE
OutputDir={#SetupOutput}
OutputBaseFilename=AeroDubStudio-OfflineSetup-{#AppVersion}-x64
Compression=zip/3
SolidCompression=no
DiskSpanning=yes
DiskSliceSize=2000000000
SlicesPerDisk=1
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
Uninstallable=yes

[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked

[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\THIRD_PARTY_NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#CompilerDir}\license.txt"; DestDir: "{app}\installer-notices"; DestName: "InnoSetup-license.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\AeroDub Studio"; Filename: "{app}\AeroDub Studio.exe"; WorkingDir: "{app}"; AppUserModelID: "studio.aerodub.desktop"
Name: "{autodesktop}\AeroDub Studio"; Filename: "{app}\AeroDub Studio.exe"; WorkingDir: "{app}"; Tasks: desktopicon; AppUserModelID: "studio.aerodub.desktop"

[Run]
Filename: "{app}\AeroDub Studio.exe"; Description: "Open AeroDub Studio"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent
