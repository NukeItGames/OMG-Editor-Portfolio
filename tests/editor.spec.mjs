import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function open( page ) {
	await page.goto( '/' );
	await page.waitForFunction( () => window.editor?.scene && document.querySelector( '#viewport canvas' ) );
}

async function addBox( page ) {
	await page.locator( '#menubar .title' ).getByText( 'Add', { exact: true } ).hover();
	await page.locator( '.submenu-title' ).filter( { hasText: /^Mesh/ } ).hover();
	await page.locator( '.option' ).getByText( 'Box', { exact: true } ).click();
	await expect.poll( () => page.evaluate( () => editor.selected?.name ) ).toBe( 'Box' );
}

async function menu( page, title, option ) {
	await page.locator( '#menubar .title' ).getByText( title, { exact: true } ).hover();
	await page.locator( '#menubar .menu' ).filter( { has: page.locator( '.title', { hasText: new RegExp( `^${ title }$` ) } ) } ).locator( '.option' ).filter( { hasText: new RegExp( `^${ option }(?:CTRL|Ctrl|$)` ) } ).click();
}

test( 'create, transform, clone, multi-select, undo and redo', async ( { page } ) => {
	const errors = [];
	page.on( 'pageerror', error => errors.push( error.message ) );
	await open( page );
	await addBox( page );
	const position = page.locator( '#sidebar .Row' ).filter( { has: page.locator( '.Label', { hasText: /^Position$/ } ) } ).locator( 'input' );
	await position.nth( 0 ).fill( '2' );
	await position.nth( 0 ).press( 'Tab' );
	await expect.poll( () => page.evaluate( () => editor.selected.position.x ) ).toBe( 2 );
	await menu( page, 'Edit', 'Undo' );
	await expect.poll( () => page.evaluate( () => editor.selected.position.x ) ).toBe( 0 );
	await menu( page, 'Edit', 'Redo' );
	await expect.poll( () => page.evaluate( () => editor.selected.position.x ) ).toBe( 2 );
	await page.locator( '#viewport' ).click( { position: { x: 20, y: 20 } } );
	await page.locator( '#outliner .option' ).filter( { hasText: 'Box' } ).first().click();
	await page.keyboard.press( 'Control+d' );
	await expect.poll( () => page.evaluate( () => editor.scene.children.filter( o => o.isMesh ).length ) ).toBe( 2 );
	const rows = page.locator( '#outliner .option' ).filter( { hasText: 'Box' } );
	await rows.first().click();
	await rows.last().click( { modifiers: [ 'Alt' ] } );
	await expect.poll( () => page.evaluate( () => editor.selector.multiSelection.length ) ).toBe( 2 );
	await page.keyboard.press( 'Delete' );
	await expect.poll( () => page.evaluate( () => editor.scene.children.filter( o => o.isMesh ).length ) ).toBe( 0 );
	await menu( page, 'Edit', 'Undo' );
	await expect.poll( () => page.evaluate( () => editor.scene.children.filter( o => o.isMesh ).length ) ).toBe( 2 );
	expect( errors ).toEqual( [] );
} );

test( 'one-sided gizmo scaling anchors the opposite face and survives serialized undo', async ( { page } ) => {
	await open( page );
	await addBox( page );
	await page.locator( '#toolbar button' ).nth( 2 ).click();
	// Project the visible positive-X scale handle into the real viewport.
	const handle = await page.evaluate( () => {
		const controls = editor.sceneHelpers.children.find( o => o.controls )?.controls;
		const mesh = controls._gizmo.gizmo.scale.children.find( o => o.name === 'X' && o.geometry?.type === 'BoxGeometry' &&
			new THREE.Box3().setFromObject( o ).getCenter( new THREE.Vector3() ).x > 0 );
		const point = new THREE.Box3().setFromObject( mesh ).getCenter( new THREE.Vector3() ).project( editor.camera );
		const rect = document.querySelector( '#viewport canvas' ).getBoundingClientRect();
		return { x: rect.x + ( point.x + 1 ) * rect.width / 2, y: rect.y + ( 1 - point.y ) * rect.height / 2 };
	} );
	await page.mouse.move( handle.x, handle.y );
	await page.mouse.down();
	await page.mouse.move( handle.x + 70, handle.y, { steps: 12 } );
	await page.mouse.up();
	console.log( 'Scale drag completed' );
	const scaled = await page.evaluate( () => ( { x: editor.selected.position.x, scale: editor.selected.scale.x } ) );
	console.log( 'Scaled bounds', scaled );
	expect( scaled.scale ).toBeGreaterThan( 1.05 );
	expect( scaled.x - scaled.scale / 2 ).toBeCloseTo( -.5, 4 );
	console.log( 'Testing history serialization' );
	await page.evaluate( async () => {
		editor.config.setKey( 'settings/history', true );
		editor.history.enableSerialization( editor.history.undos.at( - 1 ).id );
		const json = editor.toJSON();
		editor.clear();
		await editor.fromJSON( json );
		editor.select( editor.scene.children.find( o => o.isMesh ) );
		editor.undo();
	} );
	expect( await page.evaluate( () => editor.selected.position.x ) ).toBeCloseTo( 0 );
	expect( await page.evaluate( () => editor.selected.scale.x ) ).toBeCloseTo( 1 );
	await menu( page, 'Edit', 'Redo' );
	expect( await page.evaluate( () => editor.selected.scale.x ) ).toBeCloseTo( scaled.scale );
} );

test( 'browser JSON save/open and optional IndexedDB persistence', async ( { page } ) => {
	await open( page );
	await addBox( page );
	const pending = page.waitForEvent( 'download' );
	await menu( page, 'File', 'Save' );
	const download = await pending;
	const json = JSON.parse( await readFile( await download.path(), 'utf8' ) );
	expect( json.scene.object.children.some( o => o.name === 'Box' ) ).toBeTruthy();
	await page.evaluate( () => editor.clear() );
	await page.locator( 'input[type=file][accept=".json"]' ).setInputFiles( {
		name: 'project.json', mimeType: 'application/json', buffer: Buffer.from( JSON.stringify( json ) )
	} );
	await page.getByRole( 'button', { name: 'OK', exact: true } ).click();
	await expect.poll( () => page.evaluate( () => editor.scene.children.some( o => o.name === 'Box' ) ) ).toBeTruthy();
	await page.locator( '#menubar input[type=checkbox]' ).check();
	await expect.poll( () => page.evaluate( () => new Promise( resolve => {
		editor.storage.get( state => resolve( state?.scene?.object?.children?.map( object => object.name ) || [] ) );
	} ) ) ).toContain( 'Box' );
	await page.reload();
	await page.waitForFunction( () => window.editor?.scene.children.some( o => o.name === 'Box' ) );
} );

test( 'OBJ import, GLB export, examples, and standalone HTML assets', async ( { page } ) => {
	const errors = [];
	page.on( 'pageerror', error => errors.push( error.message ) );
	await open( page );
	await page.locator( 'input[type=file][multiple]' ).setInputFiles( {
		name: 'triangle.obj', mimeType: 'text/plain', buffer: Buffer.from( 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n' )
	} );
	await expect.poll( () => page.evaluate( () => editor.scene.children.some( o => o.name === 'triangle.obj' ) ) ).toBeTruthy();
	await page.locator( '#menubar .title' ).getByText( 'File', { exact: true } ).hover();
	await page.locator( '.submenu-title' ).filter( { hasText: /^Export/ } ).hover();
	let pending = page.waitForEvent( 'download' );
	await page.locator( '.option' ).getByText( 'GLB', { exact: true } ).click();
	const bytes = await readFile( await ( await pending ).path() );
	expect( bytes.toString( 'ascii', 0, 4 ) ).toBe( 'glTF' );
	await page.locator( '#sidebar' ).getByText( 'Project', { exact: true } ).click();
	pending = page.waitForEvent( 'download' );
	await page.getByRole( 'button', { name: 'Publish', exact: true } ).click();
	const zip = await readFile( await ( await pending ).path() );
	expect( zip.subarray( 0, 2 ).toString() ).toBe( 'PK' );
	for ( const file of [ '/examples/camera.app.json', '/fonts/helvetiker_bold.typeface.json', '/libs/draco/draco_decoder.wasm' ] ) {
		expect( ( await page.request.get( file ) ).ok() ).toBeTruthy();
	}
	expect( errors ).toEqual( [] );
} );

test( 'desktop CSP permits editor startup without unsafe eval', async ( { page } ) => {
	const config = JSON.parse( await readFile( new URL( '../src-tauri/tauri.conf.json', import.meta.url ), 'utf8' ) );
	const violations = [];
	page.on( 'console', message => { if ( message.type() === 'error' ) { violations.push( message.text() ); console.log( message.text() ); } } );
	page.on( 'pageerror', error => console.log( error.message ) );
	await page.route( 'http://127.0.0.1:4173/', async route => {
		const response = await route.fetch();
		await route.fulfill( { response, headers: { ...response.headers(), 'Content-Security-Policy': config.app.security.csp } } );
	} );
	await open( page );
	await addBox( page );
	expect( violations ).toEqual( [] );
} );
