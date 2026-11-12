import { cp, mkdir } from 'node:fs/promises';

// Files fetched by the inherited standalone HTML exporter must also exist in dist.
const root = new URL( '../', import.meta.url );
const output = new URL( 'public/runtime/', root );
await mkdir( output, { recursive: true } );
await cp( new URL( 'LICENSES/', root ), new URL( 'public/licenses/', root ), { recursive: true } );
await cp( new URL( 'THIRD_PARTY_NOTICES.md', root ), new URL( 'public/licenses/THIRD_PARTY_NOTICES.md', root ) );
await cp( new URL( 'LICENSE', root ), new URL( 'public/licenses/LICENSE', root ) );
for ( const [ source, target ] of [
	[ 'js/libs/app.js', 'app.js' ],
	[ 'js/libs/app/index.html', 'app/index.html' ],
	[ 'node_modules/three/build/three.core.js', 'three.core.js' ],
	[ 'node_modules/three/build/three.module.js', 'three.module.js' ],
	[ 'node_modules/three/build/three.webgpu.js', 'three.webgpu.js' ],
	[ 'LICENSE', 'LICENSE' ],
	[ 'LICENSES/THREE.txt', 'THREE-LICENSE.txt' ]
] ) {
	const destination = new URL( target, output );
	await mkdir( new URL( '.', destination ), { recursive: true } );
	await cp( new URL( source, root ), destination );
}
