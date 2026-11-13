# OMG Editor

A 3D scene and map editor built on the **Three.js editor**, with a **Tauri desktop app** for Windows. Create environments, edit imported models, and save reusable projects.

![OMG Editor showing a scene with selected geometry](docs/screenshots/editor.png)

[Watch the short demo](docs/demo.webm) · [Earlier Windows screenshot](docs/screenshots/windows-earlier-version.jpg) · [Detailed guide](docs/GUIDE.md)

## Features

- Create meshes, lights, cameras, and groups; edit materials and textures.
- Select, move, rotate, clone, and delete objects, including multiple selections.
- **One-sided scaling:** drag an axis handle to keep the opposite face fixed. Hold Alt to scale around the origin.
- Undo/redo with command history and optional history persistence.
- Import models, save/open project JSON, and enable optional local autosave.
- Navigate with orbit controls or a WASD fly camera.

**Import:** GLTF/GLB, FBX, OBJ, DAE, STL, PLY, USD/USDZ, and [additional formats](docs/GUIDE.md#formats).

**Export:** project JSON, GLTF/GLB, OBJ, DRC, PLY, STL, and USDZ. Format coverage varies; OBJ import and GLB export are tested.

## Run locally

Requires **Node.js 24 LTS**, npm, and a browser with WebGL. No account or API key is needed.

```sh
git clone https://github.com/NukeItGames/OMG-Editor-Portfolio.git
cd OMG-Editor-Portfolio
npm ci
npm run dev
```

Open http://127.0.0.1:5173. For a production preview:

```sh
npm run build
npm run preview
```

## Windows desktop

Install [Tauri's Windows prerequisites](https://v2.tauri.app/start/prerequisites/), including C++ Build Tools, WebView2, and stable Rust **1.90+**. After `npm ci`:

```sh
npm run tauri -- dev
npm run tauri -- build --bundles nsis
```

The unsigned installer is generated in `src-tauri/target/release/bundle/nsis/`.

## Built with

**Three.js + JavaScript** handle scenes, rendering, editing, and reversible commands. **Vite** builds the frontend. **Tauri + Rust** provide the desktop window, native save dialogs, and file writes. See the [architecture guide](docs/GUIDE.md#architecture).

## Checks and limits

[Web validation and the Windows installer build passed in CI](https://github.com/NukeItGames/OMG-Editor-Portfolio/actions/runs/43333540090). Five browser tests cover core editing, scaling, persistence, and import/export. Installer execution has not been tested.

This is a scene editor without physics or an animation timeline. One-sided scaling works best with centered meshes; complex groups need manual checking. Autosave is off by default—keep JSON backups. Run only trusted exported scripts.

[Validation details](docs/VALIDATION.md) · [Security and asset audit](docs/AUDIT.md) · [Controls and limitations](docs/GUIDE.md#controls-and-a-quick-walkthrough)

## License and credits

Maintained by **NukeItGames** as a derivative of the Three.js editor. Application code retains the existing **MIT** license and Three.js attribution. Bundled libraries, fonts, and the user-supplied screenshot keep their separate terms.

[License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
