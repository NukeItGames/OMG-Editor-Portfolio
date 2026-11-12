import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function check( directory ) {
	for ( const entry of await readdir( directory, { withFileTypes: true } ) ) {
		const path = `${ directory }/${ entry.name }`;
		if ( entry.isDirectory() ) {
			if ( path !== 'js/libs' ) await check( path );
		} else if ( /\.(js|mjs)$/.test( path ) ) {
			const result = spawnSync( process.execPath, [ '--check', path ], { stdio: 'inherit' } );
			if ( result.status !== 0 ) process.exit( result.status ?? 1 );
		}
	}
}
await check( 'js' );
await check( 'scripts' );
await check( 'tests' );
console.log( 'Application and script JavaScript syntax checked.' );
