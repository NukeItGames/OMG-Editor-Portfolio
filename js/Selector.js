import * as THREE from 'three';

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

class Selector {

	constructor( editor ) {

		const signals = editor.signals;

		this.editor = editor;
		this.signals = signals;
		this.multiSelection = [];
		this._objectsCacheDirty = true;
		this._objectsCache = [];

		// Invalidate cache when scene changes
		signals.objectAdded.add( () => { this._objectsCacheDirty = true; } );
		signals.objectRemoved.add( () => { this._objectsCacheDirty = true; } );
		signals.sceneGraphChanged.add( () => { this._objectsCacheDirty = true; } );

		// signals

		signals.intersectionsDetected.add( ( intersects, event ) => {

			if ( intersects.length > 0 ) {

				// Resolve helpers to their actual objects

				const objects = [];

				for ( let i = 0; i < intersects.length; i ++ ) {

					let object = intersects[ i ].object;

					if ( object.userData.object !== undefined ) {

						object = object.userData.object;

					}

					if ( objects.indexOf( object ) === - 1 ) {

						objects.push( object );

					}

				}

				const clickedObject = objects[ 0 ];

				// Click selected object again: deselect
				if ( clickedObject === editor.selected && ! ( event && event.altKey ) ) {

					this.clearMultiSelection();
					this.select( null );
					return;

				}

				// Alt+click: add/remove from multi-selection
				if ( event && event.altKey ) {

					const idx = this.multiSelection.indexOf( clickedObject );

					if ( idx === - 1 ) {

						// Add to selection
						if ( editor.selected !== null && this.multiSelection.indexOf( editor.selected ) === - 1 ) {

							this.multiSelection.push( editor.selected );

						}

						this.multiSelection.push( clickedObject );

					} else {

						// Remove from selection
						this.multiSelection.splice( idx, 1 );

					}

					// Select the last one for transform controls
					if ( this.multiSelection.length > 0 ) {

						const last = this.multiSelection[ this.multiSelection.length - 1 ];

						// Force reselect even if same object
						this.editor.selected = null;
						this.select( last );

					} else {

						this.select( null );

					}

					signals.multiSelectionChanged.dispatch( this.multiSelection );

					return;

				}

				// Normal click: clear multi-selection

				this.clearMultiSelection();

				// Cycle through objects if the first one is already selected

				const index = objects.indexOf( editor.selected );

				if ( index !== - 1 && index < objects.length - 1 ) {

					this.select( objects[ index + 1 ] );

				} else {

					this.select( objects[ 0 ] );

				}

			} else {

				this.clearMultiSelection();
				this.select( null );

			}

		} );

	}

	getIntersects( raycaster ) {

		if ( this._objectsCacheDirty ) {

			this._objectsCache.length = 0;

			this.editor.scene.traverseVisible( ( child ) => {

				this._objectsCache.push( child );

			} );

			this._objectsCacheDirty = false;

		}

		// Always rebuild picker list (helpers may change visibility)
		const objects = this._objectsCache.slice();

		this.editor.sceneHelpers.traverseVisible( function ( child ) {

			if ( child.name === 'picker' ) objects.push( child );

		} );

		return raycaster.intersectObjects( objects, false );

	}

	getPointerIntersects( point, camera ) {

		mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );

		raycaster.setFromCamera( mouse, camera );

		return this.getIntersects( raycaster );

	}

	select( object ) {

		if ( this.editor.selected === object ) return;

		let uuid = null;

		if ( object !== null ) {

			uuid = object.uuid;

		}

		this.editor.selected = object;
		this.editor.config.setKey( 'selected', uuid );

		this.signals.objectSelected.dispatch( object );

	}

	clearMultiSelection() {

		if ( this.multiSelection.length > 0 ) {

			this.multiSelection = [];
			this.signals.multiSelectionChanged.dispatch( this.multiSelection );

		}

	}

	deselect() {

		this.clearMultiSelection();
		this.select( null );

	}

}

export { Selector };
