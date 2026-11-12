import { UIPanel, UIRow } from './libs/ui.js';

function MenubarHelp( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/help' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// About

	let option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/about' ) );
	option.onClick( function () {

		showDialog(
			'😮 OMG Editor',
			'OMG Editor is a custom version of the Three.js Editor,\n' +
			'an open source 3D editor created by mrdoob and the\n' +
			'Three.js community under the MIT License.\n\n' +
			'https://threejs.org\n\n' +
			'This version has been modified and maintained\n' +
			'by Nuke It Games.\n\n' +
			'https://github.com/NukeItGames'
		);

	} );
	options.add( option );

	// Keybinds

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/keybinds' ) );
	option.onClick( function () {

		showDialog(
			'Keybinds',
			'Camera:\n\n' +
			'W / A / S / D — Move camera\n' +
			'Q / E — Move down / up\n' +
			'Shift — Speed boost\n' +
			'Left-click drag — Rotate view\n' +
			'Right-click drag — Pan\n' +
			'Scroll — Zoom\n' +
			'F — Focus on selected\n\n' +
			'Editing:\n\n' +
			'Ctrl+D — Clone\n' +
			'Ctrl+Z — Undo\n' +
			'Ctrl+X — Redo\n' +
			'Alt+Click — Multi-select\n' +
			'G — Center\n' +
			'Y — Snap to ground\n' +
			'Delete — Delete selected\n' +
			'Escape — Deselect'
		);

	} );
	options.add( option );

	// Documentation

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/documentation' ) );
	option.onClick( function () {

		showDialog(
			'Documentation',
			'3D map/scene editor built on Three.js + Tauri.\n\n' +
			'Components use a signal-based pub-sub system.\n' +
			'All edits are commands on a 200-level undo stack.\n\n' +
			'20 geometry types, multiple materials with texture\n' +
			'maps, 5 light types, 2 camera types.\n\n' +
			'Imports: GLTF, FBX, OBJ, Collada, STL, PLY, USDZ\n' +
			'Exports: JSON (editor format), GLTF\n\n' +
			'See Doc.md in the project root for full details.'
		);

	} );
	options.add( option );

	// Custom dialog

	function showDialog( title, message ) {

		const overlay = document.createElement( 'div' );
		overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

		const dialog = document.createElement( 'div' );
		dialog.style.cssText = 'background:#222;color:#eee;border-radius:8px;padding:24px;max-width:400px;min-width:280px;font-family:system-ui,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.5);';

		const titleEl = document.createElement( 'h3' );
		titleEl.textContent = title;
		titleEl.style.cssText = 'margin:0 0 12px 0;font-size:18px;';
		dialog.appendChild( titleEl );

		const msg = document.createElement( 'pre' );
		msg.innerHTML = message.replace( /(https?:\/\/[^\s<]+)/g, '<span style="color:#4488ff;">$1</span>' );
		msg.style.cssText = 'margin:0 0 16px 0;font-family:system-ui,sans-serif;font-size:13px;white-space:pre-wrap;line-height:1.5;color:#ccc;';
		dialog.appendChild( msg );

		const btn = document.createElement( 'button' );
		btn.textContent = 'OK';
		btn.style.cssText = 'background:#4488ff;color:white;border:none;padding:8px 24px;border-radius:4px;cursor:pointer;font-size:14px;display:block;margin:0 auto;';
		btn.onclick = function () { document.body.removeChild( overlay ); };
		dialog.appendChild( btn );

		overlay.appendChild( dialog );
		overlay.onclick = function ( e ) { if ( e.target === overlay ) document.body.removeChild( overlay ); };
		document.body.appendChild( overlay );

		btn.focus();

	}

	return container;

}

export { MenubarHelp };
