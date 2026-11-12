# Validation record

Prepared November 12, 2026. Commands ran against the separate portfolio copy; the original private repository was not edited.

| Check | Result |
| --- | --- |
| Fresh npm dependency installation | Passed using Node 24.22.1 and npm 11.9.0 |
| JavaScript syntax (`npm run check`) | Passed; application modules, scripts, and browser tests |
| Full lint / TypeScript checks | Not configured in the source; no TypeScript project |
| Vite production build | Passed with Vite 8.3.8; large-bundle and mixed-import warnings remain |
| npm audit | Zero known vulnerabilities after remediation |
| Rust lockfile / metadata | Resolved with Rust 1.100.0; declared minimum is 1.90 for current dependencies |
| Rust formatting | `cargo fmt --check` passed for the application |
| RustSec advisory scan | Zero vulnerabilities; one unmaintained build-macro warning, documented in AUDIT.md |
| Production browser acceptance suite | All 5 tests passed in 1.6 minutes using Chromium 156 and software WebGL |
| Screenshot and demo | Captured from the running production web build; the silent recording shows UI creation, manipulation, one-sided scaling, undo/redo, and JSON download |
| Local Cargo check / Tauri build | Attempted; blocked at missing system `glib-2.0` development library. GTK/WebKit prerequisites are also absent; no sudo/managed package installer is available |
| Native Windows installer / installation | Not run in this Linux preparation environment |

The browser tests run against a production Vite preview using headless Chromium and software WebGL at 1440 × 900. They exercise the actual editor UI, inspect scene state, and check downloaded files. Scene state setup and history round-trip assertions also use the editor API exposed by the application. This is browser evidence, not a Tauri WebView test.

The acceptance suite covers object creation, numeric transforms, clone, outliner multi-select, delete/undo/redo, a real one-sided gizmo drag with opposite-face bounds assertions, serialization of compound command history, browser JSON save/open, optional IndexedDB restore, OBJ import, GLB download header, standalone HTML ZIP output, bundled asset availability, and startup under the desktop CSP. See `tests/editor.spec.mjs` for executable assertions.

No benchmark, broad format compatibility result, physical-device test, WebGPU validation, native file-dialog execution, installer signature verification, or installer execution is implied. The supplied earlier Windows screenshot is user evidence only. The portfolio screenshot and demonstration are captured from the current production web build.

For a local rerun:

```sh
npm ci
npm run check
npm run build
npx playwright install --with-deps chromium
npm test
npm run demo
```

`npm run demo` starts its own loopback preview. Close any other preview using port 4173 first. The CI workflow has separate web acceptance and Windows Rust/NSIS build jobs; an unsigned installer artifact is not an installation test.
