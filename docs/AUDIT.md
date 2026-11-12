# Publication audit

Reviewed November 12, 2026. This is a bounded source, asset, and dependency review, not a guarantee against every vulnerability.

## Scope and source boundary

The source checkout was read only. A separate directory was created from a tracked-file snapshot; its Git repository was initialized with a fresh `main` branch. No private commits, remote configuration, credentials, local editor state, build output, dependency directories, or developer assistant configuration are part of the publication history. The original repository's visibility, remote refs, and clean source worktree are checked separately.

The review covered application modules, command classes, UI utilities, bundled classic libraries, import/export paths, sample JSON, font data, images and sound files, WebAssembly decoders, npm/Cargo manifests and lockfiles, Rust entry points, Tauri capabilities/CSP, build configuration, and documentation. Source claims were checked against implementation and upstream Three.js r183. The old internal architecture narrative was replaced because it described removed components and unverified workflows.

## Confidentiality

Gitleaks 8.30.1 was downloaded from the official release and its SHA-256 archive checksum verified. The original snapshot scan found no secrets. The final publication snapshot is scanned again, including documentation and media, before committing. Supplemental checks cover credentials, environment/configuration files, private keys, private repository links, personal contact information, machine-specific paths, symlinks, unexpected binary content, and image metadata.

The project requires no credentials or backend. Personal local paths and user state are not included. Copyright-holder names, public attribution email addresses, and test fixture literals in third-party code/notices are retained where appropriate; they are not application credentials. The only supplemental path-pattern matches were Emscripten's synthetic `/home/web_user` filesystem inside verified Rhino decoder code, not a developer's machine path. The supplied screenshot has no EXIF fields and shows no private filesystem path or credentials. Other supplied desktop photos/shortcut crops are excluded from the publication.

The reviewed publication snapshot contains 330 files. Its Gitleaks scan found no leaks. PNG captures and generated icons contain no EXIF/text metadata; the user-supplied JPEG contains no EXIF. The demo contains only the application, its procedural objects, and a browser JSON save workflow. Whitespace warnings are confined to inherited source/vendor/license text and are not rewritten wholesale.

## License discrepancy and ownership

The original README and npm manifest explicitly declared MIT, while LICENSE was a prefaced MIT text naming only Three.js authors; Rust metadata used placeholder authorship and no license. The public copy retains that existing license grant and copyright notice, adds the verified upstream notice separately, and clearly identifies the application as a Three.js editor derivative. It does not replace the Three.js notice with an ownership claim. The repository's contributor history identifies NukeItGames as the maintainer of its project-specific changes; that history itself is not published.

Rust and npm metadata now identify the actual project, public destination, version, and MIT terms consistently. Third-party assets and the user screenshot are not relicensed as application code. The generated cube icon and synthesized tones replace the unverified emoji artwork and recordings. Their generation source is included. Editable XCF files, duplicate library/image copies, an unused saved-map snapshot, and assistant configuration are excluded.

The bundled decoder JS/WASM files, SVG transform icons, font, example scenes, and most editor/vendor modules match Three.js r183. Modified modules remain MIT derivatives. The font embeds MAGENTA's redistribution conditions, also preserved separately. Draco and Basis use Apache-2.0; Rhino/OpenNURBS and their component notices are retained. No purchased model/texture packs are published. Examples contain procedural scenes and scripts inherited from Three.js. `THIRD_PARTY_NOTICES.md`, `LICENSES/`, and the dependency/provenance inventories record these boundaries. MPL dependency source links and license text are supplied; permissively multi-licensed dependencies retain their MIT/Apache options.

## Security remediation

- Removed unused `sharp`/`to-ico` tooling and its obsolete request/image-processing dependency tree. Compatible frontend updates include Vite 8.3.8 and patched transitive tooling. The initial npm audit reported 18 affected package entries (5 critical, 7 high, 6 moderate); the final tree reports zero known vulnerabilities.
- Updated compatible Rust dependencies. The initial RustSec scan reported three vulnerabilities affecting quick-xml and rkyv; the updated lockfile clears them. The Linux GLib 0.18.5 transitive dependency had an informational soundness advisory. Its vendored copy differs from the published crate only by the exact two-line upstream PR #1343 fix plus a separate patch note. Cargo resolves that local patch; Windows does not compile GLib. The final scan reports zero vulnerabilities and the remaining `proc-macro-error` unmaintained warning (RUSTSEC-2024-0370). There are no advisory suppressions.
- Removed the unconditional filesystem `**` scope. Native Save As extends filesystem scope to the user-selected file through Tauri's dialog plugin. No shell plugin, remote capability, custom unrestricted IPC command, or secret is configured. A separate app identifier avoids sharing desktop state with the original application.
- Added production/development CSPs. Acorn and Tern had small runtime-code-generation helpers; equivalent closures now allow the editor to run without `unsafe-eval`. WebAssembly compilation remains allowed for model decoders, and blob workers remain allowed for decoder workers. Remote desktop resource loads are restricted.
- Disabled legacy executable JavaScript model imports and removed the `postMessage`-based worker execution heuristic for JSON files. Kept data-only JSON import and object script editing. Standalone exported apps still execute trusted project scripts; variable shadowing in that runtime is explicitly documented as not being a sandbox.
- Used prototype-free import lookup dictionaries; escaped exported HTML titles; fixed production asset paths for standalone export; retained required license texts in the standalone package. Removed the nonfunctional service-worker registration.
- Fixed reloading compound history commands to use the actual module registry rather than `window` constructors. Fixed project-open error propagation, reset native save paths on project changes, and report native write failures. Autosave success waits for transaction completion and displays a failure message on rejection. Alt-state reset prevents a stuck modifier after losing focus.

## Remaining risk and validation boundary

The project is a local scene-authoring tool. Importers and synchronous archive parsers are not resource-isolated; oversized or malformed inputs can cause denial of service. Imported external references may cause browser requests; desktop CSP restricts those requests. Users should review scripts before running exported HTML projects. Local storage is unencrypted, has no cross-device sync, and is not a backup. There is no trusted server or telemetry endpoint.

No native desktop runtime or installer execution is claimed from a browser test. The preparation environment lacks GLib/GTK/WebKit development packages and privileged package installation, so local Rust compilation stops at the system-library check. Windows CI is configured to check Rust and build NSIS; its actual result is recorded in `VALIDATION.md` after publication. See that document for performed tests and explicit limitations.
