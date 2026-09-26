#define MyAppName "{{APP_NAME}}"
#define MyAppVersion "{{APP_VERSION}}"
#define MyAppPublisher "LeptonJS"
#define ReleaseDir "{{SOURCE_DIR}}"
#define NodeVersion "{{NODE_VERSION}}"
#define NodeMajor {{NODE_MAJOR}}
#define NodeDist "{{NODE_DIST}}"
#define NodeArchiveName "{{NODE_ARCHIVE_NAME}}"
#define NodeArchiveUrl "{{NODE_ARCHIVE_URL}}"
#define NodeSha256 "{{NODE_SHA256}}"
#define BundleRuntime {{BUNDLE_RUNTIME}}
#define EnableBytecode {{ENABLE_BYTECODE}}
#define AppIcon "{{APP_ICON}}"

[Setup]
AppId=LeptonJS_{#MyAppName}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir={{OUTPUT_DIR}}
OutputBaseFilename={#MyAppName}-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\runtime\{#MyAppName}.exe
DisableProgramGroupPage=yes
#if AppIcon != ""
SetupIconFile={#AppIcon}
#endif

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "{#ReleaseDir}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#ReleaseDir}\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#ReleaseDir}\runtime\{#MyAppName}.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#ReleaseDir}\runtime-manifest.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#ReleaseDir}\runtime\*.dll"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#ReleaseDir}\runtime\*.node"; DestDir: "{app}\runtime"; Flags: ignoreversion
#if BundleRuntime
Source: "{#ReleaseDir}\runtime\{#MyAppName}-runtime.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
#endif

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\runtime\{#MyAppName}.exe"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\runtime\{#MyAppName}.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\runtime\{#MyAppName}.exe"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\runtime"
Type: filesandordirs; Name: "{app}\*.WebView2"
Type: files; Name: "{app}\lepton-host.log"
Type: filesandordirs; Name: "{localappdata}\LeptonJS\{#MyAppName}"

[Code]
var
  NodePage: TInputOptionWizardPage;
  DownloadPage: TDownloadWizardPage;
  DetectedMajor: Integer;

function IsBundleRuntime: Boolean;
begin
  Result := {#BundleRuntime} = 1;
end;

function IsBytecode: Boolean;
begin
  Result := {#EnableBytecode} = 1;
end;

function DetectedNodeMajor: Integer;
var
  TmpFile: String;
  OutV: AnsiString;
  Version: String;
  ResultCode: Integer;
  DotPos: Integer;
begin
  Result := 0;
  TmpFile := ExpandConstant('{tmp}\lepton-node-ver.txt');
  if Exec('cmd.exe', '/C node -v > "' + TmpFile + '" 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if LoadStringFromFile(TmpFile, OutV) then
    begin
      Version := Trim(String(OutV));
      if (Length(Version) > 0) and (Version[1] = 'v') then
        Delete(Version, 1, 1);
      DotPos := Pos('.', Version);
      if DotPos > 0 then
        Result := StrToIntDef(Copy(Version, 1, DotPos - 1), 0)
      else
        Result := StrToIntDef(Version, 0);
    end;
  end;
end;

function NeedPrivateRuntime: Boolean;
begin
  if IsBundleRuntime then
  begin
    Result := False;
    Exit;
  end;
  if IsBytecode then
  begin
    Result := True;
    Exit;
  end;
  Result := True;
  if Assigned(NodePage) and (DetectedMajor = {#NodeMajor}) then
    Result := NodePage.SelectedValueIndex = 1;
end;

procedure ExtractNodeArchive;
var
  Zip, Dest, Inner: String;
  ResultCode: Integer;
begin
  Zip := ExpandConstant('{tmp}\{#NodeArchiveName}');
  Dest := ExpandConstant('{tmp}\node-extract');
  ForceDirectories(Dest);
  Exec(
    'tar.exe',
    '-xf "' + Zip + '" -C "' + Dest + '"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if ResultCode <> 0 then
    RaiseException('Failed to extract Node.js archive (tar exit ' + IntToStr(ResultCode) + ').');
  Inner := Dest + '\node-v{#NodeVersion}-{#NodeDist}\node.exe';
  if not FileExists(Inner) then
    RaiseException('Extracted node.exe not found: ' + Inner);
  ForceDirectories(ExpandConstant('{app}\runtime'));
  if not FileCopy(Inner, ExpandConstant('{app}\runtime\node.exe'), False) then
    RaiseException('Failed to copy node.exe into the app folder.');
  if not RenameFile(
    ExpandConstant('{app}\runtime\node.exe'),
    ExpandConstant('{app}\runtime\{#MyAppName}-runtime.exe')
  ) then
    RaiseException('Failed to rename node.exe to {#MyAppName}-runtime.exe.');
end;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  if Progress = ProgressMax then
    Log(Format('Downloaded %s (%d bytes)', [FileName, Progress]))
  else if ProgressMax > 0 then
    DownloadPage.SetText('Downloading Node.js {#NodeVersion}', Format('%d / %d bytes', [Progress, ProgressMax]));
  Result := True;
end;

procedure InitializeWizard;
begin
  DetectedMajor := DetectedNodeMajor;
  DownloadPage := CreateDownloadPage(SetupMessage(msgWizardPreparing), SetupMessage(msgPreparingDesc), @OnDownloadProgress);

  if (not IsBundleRuntime) and (not IsBytecode) then
  begin
    NodePage := CreateInputOptionPage(
      wpSelectDir,
      'Node.js runtime',
      'How should {#MyAppName} run?',
      'This app needs Node.js {#NodeMajor}.x (V8 must match the packed bytecode).' + #13#10 +
      'A private copy is stored only in this app folder and is not added to PATH.',
      True,
      False);
    NodePage.Add('Use Node.js already installed on this computer');
    NodePage.Add('Download a private Node.js {#NodeVersion} into this app folder');

    if DetectedMajor = {#NodeMajor} then
      NodePage.SelectedValueIndex := 0
    else
      NodePage.SelectedValueIndex := 1;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if not IsBundleRuntime and Assigned(NodePage) and (PageID = NodePage.ID) then
  begin
    if DetectedMajor <> {#NodeMajor} then
    begin
      NodePage.SelectedValueIndex := 1;
      NodePage.CheckListBox.ItemEnabled[0] := False;
    end;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if not IsBundleRuntime and Assigned(NodePage) and (CurPageID = NodePage.ID) then
  begin
    if (DetectedMajor <> {#NodeMajor}) and (NodePage.SelectedValueIndex = 0) then
    begin
      MsgBox(
        'Installed Node.js is not version {#NodeMajor}.x. A private runtime will be downloaded.',
        mbInformation, MB_OK);
      NodePage.SelectedValueIndex := 1;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if NeedPrivateRuntime then
    begin
      DownloadPage.Clear;
      DownloadPage.Add('{#NodeArchiveUrl}', '{#NodeArchiveName}', '{#NodeSha256}');
      DownloadPage.Show;
      try
        try
          DownloadPage.Download;
          ExtractNodeArchive;
        except
          SuppressibleMsgBox(GetExceptionMessage, mbCriticalError, MB_OK, IDOK);
          RaiseLastException;
        end;
      finally
        DownloadPage.Hide;
      end;
    end;
  end;
end;
