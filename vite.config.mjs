import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig( {
	base: './',
	resolve: {
		alias: {
			'three/addons/': path.resolve( import.meta.dirname, 'node_modules/three/examples/jsm/' ),
			'three/examples/': path.resolve( import.meta.dirname, 'node_modules/three/examples/' ),
			'three/webgpu': path.resolve( import.meta.dirname, 'node_modules/three/build/three.webgpu.js' ),
		}
	},
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true,
		fs: {
			// Allow serving files from node_modules
			allow: [ '.' ]
		}
	},
	build: {
		target: 'esnext',
		outDir: 'dist'
	}
} );
