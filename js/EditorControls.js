import * as THREE from 'three';

class EditorControls extends THREE.EventDispatcher {

	constructor( object ) {

		super();

		// API

		this.enabled = true;
		this.center = new THREE.Vector3();
		this.panSpeed = 0.002;
		this.zoomSpeed = 0.1;
		this.rotationSpeed = 0.005;
		this.flySpeed = 3;

		// internals

		var scope = this;
		var vector = new THREE.Vector3();
		var delta = new THREE.Vector3();
		var box = new THREE.Box3();

		var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2 };
		var state = STATE.NONE;

		var center = this.center;
		var normalMatrix = new THREE.Matrix3();
		var pointer = new THREE.Vector2();
		var pointerOld = new THREE.Vector2();
		var spherical = new THREE.Spherical();
		var sphere = new THREE.Sphere();

		var pointers = [];
		var pointerPositions = {};

		var domElement = null;

		// events

		var changeEvent = { type: 'change' };

		this.focus = function ( target ) {

			var distance;

			box.setFromObject( target );

			if ( box.isEmpty() === false ) {

				box.getCenter( center );
				distance = box.getBoundingSphere( sphere ).radius;

			} else {

				// Focusing on an Group, AmbientLight, etc

				center.setFromMatrixPosition( target.matrixWorld );
				distance = 0.1;

			}

			delta.set( 0, 0, 1 );
			delta.applyQuaternion( object.quaternion );
			delta.multiplyScalar( Math.min( distance * 2, 20 ) );

			object.position.copy( center ).add( delta );

			scope.dispatchEvent( changeEvent );

		};

		this.pan = function ( delta ) {

			var distance = object.position.distanceTo( center );

			delta.multiplyScalar( distance * scope.panSpeed );
			delta.applyMatrix3( normalMatrix.getNormalMatrix( object.matrix ) );

			object.position.add( delta );
			center.add( delta );

			scope.dispatchEvent( changeEvent );

		};

		this.zoom = function ( delta ) {

			var distance = Math.max( object.position.distanceTo( center ), 1 );

			delta.multiplyScalar( distance * scope.zoomSpeed );

			if ( delta.length() > distance ) return;

			delta.applyMatrix3( normalMatrix.getNormalMatrix( object.matrix ) );

			object.position.add( delta );

			scope.dispatchEvent( changeEvent );

		};

		this.rotate = function ( delta ) {

			vector.copy( object.position ).sub( center );

			spherical.setFromVector3( vector );

			spherical.theta += delta.x * scope.rotationSpeed;
			spherical.phi += delta.y * scope.rotationSpeed;

			spherical.makeSafe();

			vector.setFromSpherical( spherical );

			object.position.copy( center ).add( vector );

			object.lookAt( center );

			scope.dispatchEvent( changeEvent );

		};

		//

		function onPointerDown( event ) {

			if ( scope.enabled === false ) return;

			if ( pointers.length === 0 ) {

				domElement.setPointerCapture( event.pointerId );

				domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove );
				domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp );

			}

			//

			if ( isTrackingPointer( event ) ) return;

			//

			addPointer( event );

			if ( event.pointerType === 'touch' ) {

				onTouchStart( event );

			} else {

				onMouseDown( event );

			}

		}

		function onPointerMove( event ) {

			if ( scope.enabled === false ) return;

			if ( event.pointerType === 'touch' ) {

				onTouchMove( event );

			} else {

				onMouseMove( event );

			}

		}

		function onPointerUp( event ) {

			removePointer( event );

			switch ( pointers.length ) {

				case 0:

					domElement.releasePointerCapture( event.pointerId );

					domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
					domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

					break;

				case 1:

					var pointerId = pointers[ 0 ];
					var position = pointerPositions[ pointerId ];

					// minimal placeholder event - allows state correction on pointer-up
					onTouchStart( { pointerId: pointerId, pageX: position.x, pageY: position.y } );

					break;

			}

		}

		// mouse — UNCHANGED: left=rotate, middle=zoom, right=pan

		function onMouseDown( event ) {

			if ( event.button === 0 ) {

				state = STATE.ROTATE;

			} else if ( event.button === 1 ) {

				state = STATE.ZOOM;

			} else if ( event.button === 2 ) {

				state = STATE.PAN;

			}

			pointerOld.set( event.clientX, event.clientY );

		}

		function onMouseMove( event ) {

			pointer.set( event.clientX, event.clientY );

			var movementX = pointer.x - pointerOld.x;
			var movementY = pointer.y - pointerOld.y;

			if ( state === STATE.ROTATE ) {

				scope.rotate( delta.set( - movementX, - movementY, 0 ) );

			} else if ( state === STATE.ZOOM ) {

				scope.zoom( delta.set( 0, 0, movementY ) );

			} else if ( state === STATE.PAN ) {

				scope.pan( delta.set( - movementX, movementY, 0 ) );

			}

			pointerOld.set( event.clientX, event.clientY );

		}

		function onMouseUp() {

			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			// Normalize deltaY due to https://bugzilla.mozilla.org/show_bug.cgi?id=1392460
			scope.zoom( delta.set( 0, 0, event.deltaY > 0 ? 1 : - 1 ) );

		}

		function contextmenu( event ) {

			event.preventDefault();

		}

		// WASD fly movement — works independently of mouse

		var keys = {};
		var flyDirection = new THREE.Vector3();
		var flyRight = new THREE.Vector3();
		var prevFlyTime = 0;
		var flyAnimationId = null;
		var flyRunning = false;

		function onKeyDownFly( event ) {

			// Don't capture keys when typing in inputs
			if ( event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' ) return;

			// Ignore modifier combos (e.g. Ctrl+D clone shouldn't trigger fly movement)
			if ( event.ctrlKey || event.metaKey || event.altKey ) return;

			keys[ event.code ] = true;

			if ( ! flyRunning && isMovementKey( event.code ) ) {

				flyRunning = true;
				prevFlyTime = performance.now();
				flyLoop();

			}

		}

		function onKeyUpFly( event ) {

			keys[ event.code ] = false;

			// Stop loop if no movement keys are held
			if ( flyRunning && ! anyMovementKeyHeld() ) {

				flyRunning = false;

				if ( flyAnimationId ) {

					cancelAnimationFrame( flyAnimationId );
					flyAnimationId = null;

				}

			}

		}

		function isMovementKey( code ) {

			return code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
				code === 'KeyQ' || code === 'KeyE';

		}

		function anyMovementKeyHeld() {

			return keys[ 'KeyW' ] || keys[ 'KeyA' ] || keys[ 'KeyS' ] || keys[ 'KeyD' ] ||
				keys[ 'KeyQ' ] || keys[ 'KeyE' ];

		}

		function flyLoop() {

			if ( ! flyRunning ) return;

			flyAnimationId = requestAnimationFrame( flyLoop );

			var now = performance.now();
			var dt = ( now - prevFlyTime ) / 1000;
			prevFlyTime = now;

			var speed = scope.flySpeed * ( keys[ 'ShiftLeft' ] || keys[ 'ShiftRight' ] ? 3 : 1 );
			var moved = false;

			// Forward/back
			flyDirection.set( 0, 0, - 1 ).applyQuaternion( object.quaternion );

			if ( keys[ 'KeyW' ] ) { object.position.addScaledVector( flyDirection, speed * dt ); center.addScaledVector( flyDirection, speed * dt ); moved = true; }
			if ( keys[ 'KeyS' ] ) { object.position.addScaledVector( flyDirection, - speed * dt ); center.addScaledVector( flyDirection, - speed * dt ); moved = true; }

			// Strafe left/right
			flyRight.set( 1, 0, 0 ).applyQuaternion( object.quaternion );

			if ( keys[ 'KeyD' ] ) { object.position.addScaledVector( flyRight, speed * dt ); center.addScaledVector( flyRight, speed * dt ); moved = true; }
			if ( keys[ 'KeyA' ] ) { object.position.addScaledVector( flyRight, - speed * dt ); center.addScaledVector( flyRight, - speed * dt ); moved = true; }

			// Up/down
			if ( keys[ 'KeyE' ] ) { object.position.y += speed * dt; center.y += speed * dt; moved = true; }
			if ( keys[ 'KeyQ' ] ) { object.position.y -= speed * dt; center.y -= speed * dt; moved = true; }

			if ( moved ) {

				// Keep orbit center a fixed distance in front of camera
				flyDirection.set( 0, 0, - 1 ).applyQuaternion( object.quaternion );
				center.copy( object.position ).addScaledVector( flyDirection, 5 );

				scope.dispatchEvent( changeEvent );

			}

		}

		this.connect = function ( element ) {

			if ( domElement !== null ) this.disconnect();

			domElement = element;

			domElement.addEventListener( 'contextmenu', contextmenu );
			domElement.addEventListener( 'dblclick', onMouseUp );
			domElement.addEventListener( 'wheel', onMouseWheel, { passive: false } );

			domElement.addEventListener( 'pointerdown', onPointerDown );

			// WASD listeners
			document.addEventListener( 'keydown', onKeyDownFly );
			document.addEventListener( 'keyup', onKeyUpFly );

		};

		this.disconnect = function () {

			domElement.removeEventListener( 'contextmenu', contextmenu );
			domElement.removeEventListener( 'dblclick', onMouseUp );
			domElement.removeEventListener( 'wheel', onMouseWheel );

			domElement.removeEventListener( 'pointerdown', onPointerDown );

			document.removeEventListener( 'keydown', onKeyDownFly );
			document.removeEventListener( 'keyup', onKeyUpFly );

			flyRunning = false;
			keys = {};

			if ( flyAnimationId ) {

				cancelAnimationFrame( flyAnimationId );
				flyAnimationId = null;

			}

			domElement = null;

		};

		// touch

		var touches = [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ];
		var prevTouches = [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ];
		var touchOffset0 = new THREE.Vector3();
		var touchOffset1 = new THREE.Vector3();

		var prevDistance = null;

		function onTouchStart( event ) {

			trackPointer( event );

			switch ( pointers.length ) {

				case 1:
					touches[ 0 ].set( event.pageX, event.pageY, 0 ).divideScalar( window.devicePixelRatio );
					touches[ 1 ].set( event.pageX, event.pageY, 0 ).divideScalar( window.devicePixelRatio );
					break;

				case 2:

					var position = getSecondPointerPosition( event );

					touches[ 0 ].set( event.pageX, event.pageY, 0 ).divideScalar( window.devicePixelRatio );
					touches[ 1 ].set( position.x, position.y, 0 ).divideScalar( window.devicePixelRatio );
					prevDistance = touches[ 0 ].distanceTo( touches[ 1 ] );
					break;

			}

			prevTouches[ 0 ].copy( touches[ 0 ] );
			prevTouches[ 1 ].copy( touches[ 1 ] );

		}


		function onTouchMove( event ) {

			trackPointer( event );

			function getClosest( touch, touches ) {

				var closest = touches[ 0 ];

				for ( var touch2 of touches ) {

					if ( closest.distanceTo( touch ) > touch2.distanceTo( touch ) ) closest = touch2;

				}

				return closest;

			}

			switch ( pointers.length ) {

				case 1:
					touches[ 0 ].set( event.pageX, event.pageY, 0 ).divideScalar( window.devicePixelRatio );
					touches[ 1 ].set( event.pageX, event.pageY, 0 ).divideScalar( window.devicePixelRatio );
					scope.rotate( touches[ 0 ].sub( getClosest( touches[ 0 ], prevTouches ) ).multiplyScalar( - 1 ) );
					break;

				case 2:

					var position = getSecondPointerPosition( event );

					touches[ 0 ].set( event.pageX, event.pageY, 0 ).divideScalar( window.devicePixelRatio );
					touches[ 1 ].set( position.x, position.y, 0 ).divideScalar( window.devicePixelRatio );
					// Divide by 10 to offset inherent over-sensitivity (https://github.com/mrdoob/three.js/issues/32442)
					var distance = touches[ 0 ].distanceTo( touches[ 1 ] ) / 10;
					scope.zoom( delta.set( 0, 0, prevDistance - distance ) );
					prevDistance = distance;


					touchOffset0.copy( touches[ 0 ] ).sub( getClosest( touches[ 0 ], prevTouches ) );
					touchOffset1.copy( touches[ 1 ] ).sub( getClosest( touches[ 1 ], prevTouches ) );
					touchOffset0.x = - touchOffset0.x;
					touchOffset1.x = - touchOffset1.x;

					scope.pan( touchOffset0.add( touchOffset1 ) );

					break;

			}

			prevTouches[ 0 ].copy( touches[ 0 ] );
			prevTouches[ 1 ].copy( touches[ 1 ] );

		}

		function addPointer( event ) {

			pointers.push( event.pointerId );

		}

		function removePointer( event ) {

			delete pointerPositions[ event.pointerId ];

			for ( var i = 0; i < pointers.length; i ++ ) {

				if ( pointers[ i ] == event.pointerId ) {

					pointers.splice( i, 1 );
					return;

				}

			}

		}

		function isTrackingPointer( event ) {

			for ( var i = 0; i < pointers.length; i ++ ) {

				if ( pointers[ i ] == event.pointerId ) return true;

			}

			return false;

		}

		function trackPointer( event ) {

			var position = pointerPositions[ event.pointerId ];

			if ( position === undefined ) {

				position = new THREE.Vector2();
				pointerPositions[ event.pointerId ] = position;

			}

			position.set( event.pageX, event.pageY );

		}

		function getSecondPointerPosition( event ) {

			var pointerId = ( event.pointerId === pointers[ 0 ] ) ? pointers[ 1 ] : pointers[ 0 ];

			return pointerPositions[ pointerId ];

		}

	}

	fromJSON( json ) {

		if ( json.center !== undefined ) this.center.fromArray( json.center );

	}

	toJSON() {

		return {
			center: this.center.toArray()
		};

	}

}

export { EditorControls };
