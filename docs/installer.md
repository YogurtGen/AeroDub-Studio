# Windows installer 0.5.2

The recommended download is **AeroDubStudio-Setup-0.5.2-x64.exe**. It is a standalone installer executable: the user downloads one file, and it obtains the full application, Python runtime, audio/GPU libraries and AI models automatically. After setup, the installed application works offline. The application EXE inside a folder build still requires its surrounding files.

## Installation

1. Run the Setup EXE with an internet connection. The welcome page explains the package size and temporary storage requirements.
2. Click Install. Setup downloads the version-pinned data slices from `YogurtGen/AeroDub-Studio`, displaying progress and checking a compiled-in SHA256 for each file. GitHub redirects are supported by Inno's native downloader.
3. The application wizard opens after verification. Choose a destination and optionally create a desktop shortcut. A Start menu entry and uninstaller are installed per user, without requiring administrator access.

A failed or cancelled download stops before application installation. Click Install again to retry within the same open wizard; verified completed files are reused. Closing the wizard removes its temporary package. Resuming a partially downloaded file across separate runs is not implemented. Allow free space on the Windows temporary drive and the destination drive. The destination wizard checks installation space.

The offline alternative is **AeroDubStudio-OfflineSetup-0.5.2-x64.exe** with every matching `.bin` file beside it. Download/copy the entire set before running it. No model download is performed by the offline wizard. These same slices serve the online installer, so the model/runtime set is identical.

Projects, recordings and preferences remain in AeroDub's existing user-data directory, separate from installed files. The uninstaller does not delete that directory. Do not keep personal projects inside the application folder. Migration of historical 0.2.x NSIS uninstall registrations is not implemented.

## Build

Prepare the pinned runtime described in [music engine](music-engine.md), then build a versioned folder:

```powershell
npm run build:win -- --config.electronDist=node_modules/electron/dist --config.directories.output=dist/0.5.2
npm run build:setup
npm run test:installer
```

`scripts/build-setup.ps1` defaults to `dist/<package-version>/win-unpacked`. Its `-AppSource` parameter can select another folder. It checks the EXE version, app integrity/current-source entries, reading dictionaries and four model hashes. The offline compiler uses ZIP compression with 2,000,000,000-byte slices. Each GitHub asset remains below its 2 GiB limit. A large all-in-one offline installer is not used because Windows executable size limits apply; the small online EXE downloads the data instead.

The builder then runs `scripts/build-download-setup.js`. It calculates slice hashes, embeds the offline installer executable in `installer/download.iss`, and pins download URLs to **v0.5.2-preview.1**. No moving latest-release URL is used. The generated output under `dist/setup-0.5.2` contains:

- `AeroDubStudio-Setup-0.5.2-x64.exe`: recommended one-file download installer.
- `AeroDubStudio-OfflineSetup-0.5.2-x64.exe` and matching `.bin` files: complete offline installation set.
- `AeroDubStudio-Source-0.5.2.zip`: application source, dependency locks, tests, installer scripts and documentation; excludes local projects, models, node_modules and build output.
- `SHA256SUMS.txt`, `release-manifest.json`, `RELEASE_NOTES.md` and `README-INSTALL.txt`: verification and English installation/preview notes.
- `download-config.iss` and `download-build.iss`: generated compiler inputs for local inspection, not release assets.

Compiler: official Inno Setup 7.1.0 x64 in portable mode under `test-output/build-tools`. The build script checks its download SHA256 `0362a383ed217d4c4239b5933866dd96d3eb2102737da92f80f6057a4b40df2f` and valid Pyrsys B.V. signatures. Its license is retained under the installed app's `installer-notices`. If Windows PowerShell inherits incompatible PowerShell 7 module paths, set the child process's PSModulePath to `%WINDIR%\System32\WindowsPowerShell\v1.0\Modules`; do not disable signature checks.

## Publish to GitHub

All data slices must be uploaded to the matching release even though users manually download only the Setup EXE. The installer cannot download until that release is public. Never replace a public slice with different bytes; publish a new pinned version instead.

Sign in to the official GitHub CLI using `gh auth login --hostname github.com --web`. A verified portable CLI is also available on this build machine at `test-output/build-tools/github-cli/bin/gh.exe`. The publisher uses your configured Git author, or the signed-in account's GitHub noreply identity for this commit if no author is configured. It does not change the global author configuration. Then run:

```powershell
npm run release:github
```

The publisher validates the local manifest/assets, stages the project's explicit source/documentation directories, commits changes and pushes `main` to **https://github.com/YogurtGen/AeroDub-Studio** without force. It creates a prerelease draft, uploads all assets, checks GitHub's reported SHA256 and size against the local manifest, then publishes it. Failed uploads leave a draft that can be retried; existing public releases are never overwritten. The source repository and release notes include actual application previews and test limits.

For manual publication, push the same source to `main`, create the tag **v0.5.2-preview.1** as a prerelease, attach every asset listed in `release-manifest.json` plus the manifest and checksum file, and use `RELEASE_NOTES.md` as the description. Keep it a draft until all assets are present.

## Verification and limits

`tests/installer.test.js` compiles the production download script around a small, isolated three-slice installation fixture. A local HTTP server verifies successful downloading and exact payload installation, a destination containing spaces, invalid SHA256 rejection, missing asset rejection and propagation of the inner installer's failure code. URL/manifest checks reject other repositories, unpinned tags, unsafe names, invalid hashes and oversized assets. Fixture installation writes only to a new test-output directory and has no shortcuts or uninstall registration.

The production folder/runtime/model integrity is checked before packaging; release SHA256s are calculated after compilation. The full application installer is not run on the owner's system. Interactive installation/uninstallation, a clean Windows machine, real GitHub downloads and physical-microphone latency remain unverified. The preview binaries are unsigned. Existing corresponding-source and GPU redistribution review remains documented in [third-party notices](../THIRD_PARTY_NOTICES.md). App verification is in [release status](release-status.md).

Official implementation references: [Inno download example](https://github.com/jrsoftware/issrc/blob/main/Examples/CodeDownloadFiles.iss), [download verification](https://jrsoftware.org/ishelp/topic_isxfunc_downloadtemporaryfile.htm), [disk spanning](https://jrsoftware.org/ishelp/topic_setup_diskspanning.htm), [GitHub release limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
