#ifndef ReleaseConfig
  #error ReleaseConfig must be supplied by scripts/build-download-setup.js
#endif
#include ReleaseConfig

[Setup]
AppId=studio.aerodub.downloader
AppName=AeroDub Studio
AppVersion={#AppVersion}
AppPublisher=AeroDub Studio
AppPublisherURL=https://github.com/YogurtGen/AeroDub-Studio
VersionInfoVersion={#AppVersion}.0
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
MinVersion=10.0
WizardStyle=modern
SetupIconFile={#AppIcon}
DefaultDirName={localappdata}\Programs\AeroDub Studio
UsePreviousAppDir=no
CreateAppDir=yes
Uninstallable=no
CreateUninstallRegKey=no
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=yes
DisableFinishedPage=no
LicenseFile={#AppLicense}
OutputDir={#SetupOutput}
OutputBaseFilename=AeroDubStudio-Setup-{#AppVersion}-x64
Compression=zip/3
SetupLogging=yes
CloseApplications=no

[Messages]
WelcomeLabel1=Install AeroDub Studio
WelcomeLabel2=Setup will install AeroDub Studio with its complete audio engine and AI models.%n%nChoose your installation folder first. Setup will then download and verify the package ({#DownloadSize}) before installing it in that folder. Keep your internet connection active.%n%nOnce installed, dubbing, singing and lyric readings work offline. The download uses temporary storage as well as the space required by the installed application.
ReadyLabel1=Ready to download AeroDub Studio
ReadyLabel2=Click Install to download and verify the package, then install AeroDub Studio in the folder shown below.

[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked

[Files]
Source: "{#OfflineSetup}"; Flags: dontcopy

[Run]
Filename: "{app}\AeroDub Studio.exe"; Description: "Open AeroDub Studio"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DownloadPage: TDownloadWizardPage;
  Installed: Boolean;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage('Downloading audio engine and AI models',
    'Keep this window open. Each file is checked before installation.', nil);
  DownloadPage.ShowBaseNameInsteadOfUrl := True;
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := 'Version: {#AppVersion}' + NewLine +
    'Install in: ' + WizardDirValue + NewLine +
    'Download: {#DownloadSize}' + NewLine +
    'Source: github.com/YogurtGen/AeroDub-Studio' + NewLine +
    MemoTasksInfo + NewLine + NewLine +
    'No separate Python installation or API key is required.';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  ErrorDetail: String;
begin
  Result := True;
  if CurPageID <> wpReady then Exit;
  Log('Selected installation folder before download: ' + WizardDirValue);
  DownloadPage.Clear;
  AddReleaseDownloads;
  DownloadPage.Show;
  try
    try
      DownloadPage.Download;
    except
      Result := False;
      if DownloadPage.AbortedByUser then
        Log('Download cancelled. No application files were changed.')
      else begin
        ErrorDetail := GetExceptionMessage;
        Log('Download failed: ' + ErrorDetail);
        if Pos('404', ErrorDetail) > 0 then
          ErrorDetail := ErrorDetail + #13#10#13#10 +
            'The required package is missing from this release:' + #13#10 +
            '{#ReleasePage}' + #13#10 +
            'The publisher must upload all matching .bin files to that release before setup can continue.'
        else
          ErrorDetail := ErrorDetail + #13#10#13#10 + 'Check your connection and free disk space.';
        SuppressibleMsgBox('The download could not be verified or completed.' + #13#10 +
          ErrorDetail + #13#10#13#10 +
          'Click Install to retry. ' +
          'Completed, verified files are reused while this wizard stays open.',
          mbError, MB_OK, IDOK);
      end;
    end;
  finally
    DownloadPage.Hide;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Params, TargetDir: String;
  ChildExitCode: Integer;
begin
  Result := '';
  if Installed then Exit;
  ExtractTemporaryFile('{#OfflineName}');
  Params := '/SP- /NORESTART /LOG /SUPPRESSMSGBOXES';
  if WizardSilent then Params := Params + ' /VERYSILENT'
  else Params := Params + ' /SILENT';
  TargetDir := WizardDirValue;
  if TargetDir <> '' then begin
    if Pos('"', TargetDir) <> 0 then begin
      Result := 'The installation folder cannot contain a quote character.';
      Exit;
    end;
    Params := Params + ' /DIR="' + TargetDir + '"';
  end;
  if WizardIsTaskSelected('desktopicon') then Params := Params + ' /TASKS="desktopicon"'
  else Params := Params + ' /TASKS=""';
  WizardForm.StatusLabel.Caption := 'Installing AeroDub Studio in ' + TargetDir + '...';
  WizardForm.CancelButton.Enabled := False;
  try
    if not Exec(ExpandConstant('{tmp}\{#OfflineName}'), Params,
      ExpandConstant('{tmp}'), SW_SHOWNORMAL, ewWaitUntilTerminated, ChildExitCode) then
      Result := 'Could not start the application installer: ' + SysErrorMessage(ChildExitCode)
    else if (ChildExitCode <> 0) and (ChildExitCode <> 3010) then
      Result := Format('The application installer did not finish (exit code %d). ' +
        'Click Install to try again, or Cancel to exit.', [ChildExitCode])
    else begin
      Installed := True;
      NeedsRestart := ChildExitCode = 3010;
    end;
  finally
    WizardForm.CancelButton.Enabled := True;
  end;
  if Result <> '' then Log(Result);
end;
