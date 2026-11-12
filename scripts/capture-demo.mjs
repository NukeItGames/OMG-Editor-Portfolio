import { chromium } from '@playwright/test';
import { mkdir, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

// Run after a production build; starts its own loopback preview.
const server = spawn( process.execPath, [ 'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort' ], { stdio: 'inherit' } );
for ( let attempt = 0; attempt < 50; attempt ++ ) {
	try { if ( ( await fetch( 'http://127.0.0.1:4173/' ) ).ok() ) break; } catch {}
	await new Promise( resolve => setTimeout( resolve, 200 ) );
}
const browser = await chromium.launch( {
	executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
	args: [ '--use-angle=swiftshader', '--enable-unsafe-swiftshader' ]
} );
await mkdir( 'docs/screenshots', { recursive: true } );
await mkdir( 'test-results/demo', { recursive: true } );
const context = await browser.newContext( {
	viewport: { width: 1440, height: 900 }, colorScheme: 'dark',
	recordVideo: { dir: 'test-results/demo', size: { width: 1440, height: 900 } }
} );
const page = await context.newPage();
try {
	await page.goto( 'http://127.0.0.1:4173/' );
	await page.waitForFunction( () => window.editor?.scene && document.querySelector( '#viewport canvas' ) );
	await page.locator( '#menubar .title' ).getByText( 'Add', { exact: true } ).hover();
	await page.locator( '.submenu-title' ).filter( { hasText: /^Mesh/ } ).hover();
	await page.getByText( 'Box', { exact: true } ).click();
	await page.waitForTimeout( 700 );
	const position = page.locator( '#sidebar .Row' ).filter( { has: page.locator( '.Label', { hasText: /^Position$/ } ) } ).locator( 'input' );
	await position.nth( 1 ).fill( '0.5' );
	await position.nth( 1 ).press( 'Tab' );
	await page.waitForTimeout( 700 );
	await page.locator( '#toolbar button' ).nth( 2 ).click();
	const point = await page.evaluate( () => {
		const controls = editor.sceneHelpers.children.find( object => object.controls ).controls;
		const meshes = controls._gizmo.gizmo.scale.children.filter( o => o.name === 'X' && o.geometry?.type === 'BoxGeometry' );
		const mesh = meshes.find( o => new THREE.Box3().setFromObject( o ).getCenter( new THREE.Vector3() ).x > editor.selected.position.x );
		const point = new THREE.Box3().setFromObject( mesh ).getCenter( new THREE.Vector3() ).project( editor.camera );
		const rect = document.querySelector( '#viewport canvas' ).getBoundingClientRect();
		return { x: rect.x + ( point.x + 1 ) * rect.width / 2, y: rect.y + ( 1 - point.y ) * rect.height / 2 };
	} );
	await page.mouse.move( point.x, point.y );
	await page.mouse.down();
	await page.mouse.move( point.x + 85, point.y, { steps: 30 } );
	await page.mouse.up();
	await page.waitForTimeout( 700 );
	await page.keyboard.press( 'Control+z' );
	await page.waitForTimeout( 700 );
	await page.keyboard.press( 'Control+Shift+z' );
	await page.waitForTimeout( 700 );
	await page.locator( '#menubar .title' ).getByText( 'File', { exact: true } ).hover();
	const pending = page.waitForEvent( 'download' );
	await page.getByText( 'Save', { exact: true } ).click();
	await ( await pending ).saveAs( 'test-results/demo/project.json' );
	await page.mouse.move( 450, 470 );
	await page.waitForTimeout( 700 );
	// A fuller procedural scene for the static screenshot, using the running editor.
	await page.evaluate( () => {
		const selected = editor.selected;
		selected.name = 'Platform'; selected.material.color.set( '#edaa50' );
		const floor = new THREE.Mesh( new THREE.BoxGeometry( 8, .16, 6 ), new THREE.MeshStandardMaterial( { color: '#263343', roughness: .8 } ) );
		floor.name = 'Ground'; floor.position.y = -.1; editor.addObject( floor );
		for ( let i = 0; i < 3; i ++ ) {
			const mesh = new THREE.Mesh( new THREE.BoxGeometry( .6, 1.1 + i * .6, .6 ), new THREE.MeshStandardMaterial( { color: '#53b8cc' } ) );
			mesh.name = `Column ${ i + 1 }`; mesh.position.set( -2 + i * 1.7, ( 1.1 + i * .6 ) / 2, -1.5 ); editor.addObject( mesh );
		}
		const sphere = new THREE.Mesh( new THREE.SphereGeometry( .65, 32, 16 ), new THREE.MeshStandardMaterial( { color: '#cf6b91', roughness: .35 } ) );
		sphere.name = 'Sphere'; sphere.position.set( -1.8, .65, 1 ); editor.addObject( sphere );
		editor.camera.position.set( 7, 5.5, 9 ); editor.camera.lookAt( 0, .5, 0 );
		editor.signals.cameraChanged.dispatch(); editor.signals.objectChanged.dispatch( selected );
	} );
	await page.mouse.move( 450, 470 );
	await page.screenshot( { path: 'docs/screenshots/editor.png' } );
} finally {
	await context.close();
	await browser.close();
	server.kill();
}
await copyFile( await page.video().path(), 'docs/demo.webm' );
console.log( 'Captured docs/screenshots/editor.png and docs/demo.webm from the running production build.' );
