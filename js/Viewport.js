import * as THREE from 'three';
import { PMREMGenerator } from 'three/webgpu';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportControls } from './Viewport.Controls.js';
import { ViewportInfo } from './Viewport.Info.js';

import { ViewHelper } from './Viewport.ViewHelper.js';
import { XR } from './Viewport.XR.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';
import { MultiCmdsCommand } from './commands/MultiCmdsCommand.js';

import { ColorEnvironment } from 'three/addons/environments/ColorEnvironment.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function Viewport( editor ) {

	const selector = editor.selector;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportControls( editor ) );
	container.add( new ViewportInfo( editor ) );

	//

	let renderer = null;
	let pmremGenerator = null;

	const camera = editor.camera;
	const scene = editor.scene;
	const sceneHelpers = editor.sceneHelpers;


	// helpers

	const GRID_COLORS_LIGHT = [ 0x999999, 0x777777 ];
	const GRID_COLORS_DARK = [ 0x555555, 0x888888 ];

	const grid = new THREE.Group();

	const grid1 = new THREE.GridHelper( 30, 30 );
	grid1.material.color.setHex( GRID_COLORS_LIGHT[ 0 ] );
	grid1.material.vertexColors = false;
	grid.add( grid1 );

	const grid2 = new THREE.GridHelper( 30, 6 );
	grid2.material.color.setHex( GRID_COLORS_LIGHT[ 1 ] );
	grid2.material.vertexColors = false;
	grid.add( grid2 );

	const viewHelper = new ViewHelper( camera, container );

	// Default mode lights — ensures textures are visible without user-added lights

	const defaultLights = new THREE.Group();
	defaultLights.name = 'DefaultViewportLights';

	const ambientLight = new THREE.AmbientLight( 0xffffff, 0.6 );
	defaultLights.add( ambientLight );

	const directionalLight1 = new THREE.DirectionalLight( 0xffffff, 0.8 );
	directionalLight1.position.set( 1, 2, 3 );
	defaultLights.add( directionalLight1 );

	const directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.3 );
	directionalLight2.position.set( - 1, - 1, - 2 );
	defaultLights.add( directionalLight2 );

	//

	const box = new THREE.Box3();

	const selectionBox = new THREE.Box3Helper( box );
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	const objectPositionOnDown = new THREE.Vector3();
	const objectRotationOnDown = new THREE.Euler();
	const objectScaleOnDown = new THREE.Vector3();
	const _multiDelta = new THREE.Vector3();
	const _scaleOffset = new THREE.Vector3();
	const _localCenter = new THREE.Vector3();
	const _prevScale = new THREE.Vector3();
	let _scaleSign = 1;
	let _altKeyDown = false;

	document.addEventListener( 'keydown', function ( e ) { if ( e.key === 'Alt' ) _altKeyDown = true; } );
	document.addEventListener( 'keyup', function ( e ) { if ( e.key === 'Alt' ) _altKeyDown = false; } );
	window.addEventListener( 'blur', function () { _altKeyDown = false; } );

	const transformControls = new TransformControls( camera );
	transformControls.addEventListener( 'axis-changed', function () {

		if ( editor.viewportShading !== 'realistic' ) render();

	} );
	transformControls.addEventListener( 'objectChange', function () {

		const object = transformControls.object;

		// One-sided scale: offset position to keep opposite face fixed
		if ( transformControls.getMode() === 'scale' && transformControls.axis &&
			transformControls.axis.length === 1 && ! _altKeyDown ) {

			const axis = transformControls.axis; // "X", "Y", or "Z"
			const axisLower = axis.toLowerCase();

			const scaleDelta = object.scale[ axisLower ] - _prevScale[ axisLower ];

			if ( scaleDelta !== 0 ) {

				// Offset in local axis direction to keep opposite face fixed
				_scaleOffset.set( 0, 0, 0 );
				_scaleOffset[ axisLower ] = scaleDelta * _localCenter[ axisLower ] * _scaleSign;

				// Transform offset to world space
				_scaleOffset.applyQuaternion( object.quaternion );
				object.position.add( _scaleOffset );

			}

		}

		_prevScale.copy( object.scale );

		signals.objectChanged.dispatch( object );

	} );
	transformControls.addEventListener( 'mouseDown', function () {

		const object = transformControls.object;

		objectPositionOnDown.copy( object.position );
		objectRotationOnDown.copy( object.rotation );
		objectScaleOnDown.copy( object.scale );
		_prevScale.copy( object.scale );

		// Compute geometry half-extents for one-sided scaling
		if ( object.geometry ) {

			if ( ! object.geometry.boundingBox ) object.geometry.computeBoundingBox();
			const bb = object.geometry.boundingBox;
			_localCenter.set(
				( bb.max.x - bb.min.x ) / 2,
				( bb.max.y - bb.min.y ) / 2,
				( bb.max.z - bb.min.z ) / 2
			);

		} else {

			_localCenter.set( 0.5, 0.5, 0.5 );

		}

		// Determine which side of the object the user grabbed
		if ( transformControls.getMode() === 'scale' && transformControls.axis &&
			transformControls.axis.length === 1 ) {

			const axisLower = transformControls.axis.toLowerCase();
			const localPoint = transformControls.pointStart.clone()
				.applyQuaternion( object.quaternion.clone().invert() );
			_scaleSign = ( localPoint[ axisLower ] >= 0 ) ? 1 : - 1;

		}

		controls.enabled = false;

	} );
	transformControls.addEventListener( 'mouseUp', function () {

		const object = transformControls.object;

		if ( object !== undefined ) {

			switch ( transformControls.getMode() ) {

				case 'translate':

					if ( ! objectPositionOnDown.equals( object.position ) ) {

						const selection = editor.selector.multiSelection;

						if ( selection.length > 1 && multiSelectionOriginalPositions.length === selection.length ) {

							const cmds = [];
							for ( let i = 0; i < selection.length; i ++ ) {

								const obj = selection[ i ];
								const original = multiSelectionOriginalPositions[ i ];
								if ( ! original.equals( obj.position ) ) {

									cmds.push( new SetPositionCommand( editor, obj, obj.position.clone(), original.clone() ) );

								}

							}

							if ( cmds.length > 0 ) {

								editor.execute( new MultiCmdsCommand( editor, cmds ), 'Move Selection' );

							}

						} else {

							editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );

						}

					}

					break;

				case 'rotate':

					if ( ! objectRotationOnDown.equals( object.rotation ) ) {

						editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );

					}

					break;

				case 'scale':

					if ( ! objectScaleOnDown.equals( object.scale ) ) {

						if ( ! objectPositionOnDown.equals( object.position ) ) {

							// One-sided scale changed both scale and position — bundle as one undo
							const cmds = new MultiCmdsCommand( editor, [
								new SetPositionCommand( editor, object, object.position, objectPositionOnDown ),
								new SetScaleCommand( editor, object, object.scale, objectScaleOnDown )
							] );
							editor.execute( cmds );

						} else {

							editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

						}

					}

					break;

			}

		}

		controls.enabled = true;

	} );

	sceneHelpers.add( transformControls.getHelper() );

	//

	const xr = new XR( editor, transformControls ); // eslint-disable-line no-unused-vars

	// events

	function updateAspectRatio() {

		for ( const uuid in editor.cameras ) {

			const camera = editor.cameras[ uuid ];

			const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

			if ( camera.isPerspectiveCamera ) {

				camera.aspect = aspect;

			} else {

				camera.left = - aspect;
				camera.right = aspect;

			}

			camera.updateProjectionMatrix();

			const cameraHelper = editor.helpers[ camera.id ];
			if ( cameraHelper ) cameraHelper.update();

		}

	}

	const onDownPosition = new THREE.Vector2();
	const onUpPosition = new THREE.Vector2();
	const onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		const rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	let lastClickEvent = null;

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			const intersects = selector.getPointerIntersects( onUpPosition, camera );
			signals.intersectionsDetected.dispatch( intersects, lastClickEvent );

			render();

		}

	}

	function onMouseDown( event ) {

		// event.preventDefault();

		if ( event.target !== renderer.domElement ) return;

		lastClickEvent = event;

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp );

	}

	function onMouseUp( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp );

	}

	function onTouchStart( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd );

	}

	function onTouchEnd( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd );

	}

	function onDoubleClick() {

		// Disabled - use WASD to navigate instead

	}

	container.dom.addEventListener( 'mousedown', onMouseDown );
	container.dom.addEventListener( 'touchstart', onTouchStart, { passive: false } );
	container.dom.addEventListener( 'dblclick', onDoubleClick );

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	const controls = new EditorControls( camera );
	let sidebarRefreshPending = false;

	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );

		if ( ! sidebarRefreshPending ) {

			sidebarRefreshPending = true;

			requestAnimationFrame( function () {

				sidebarRefreshPending = false;
				signals.refreshSidebarObject3D.dispatch( camera );

			} );

		}

	} );
	viewHelper.center = controls.center;

	editor.controls = controls;

	// signals

	// Add default lights on startup

	scene.add( defaultLights );

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );
		signals.sceneEnvironmentChanged.dispatch( editor.environmentType );

		// Re-add default lights if in default mode

		if ( editor.viewportShading === 'default' ) {

			scene.add( defaultLights );

		}

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

		render();

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

		render();

	} );

	signals.rendererUpdated.add( function () {

		scene.traverse( function ( child ) {

			if ( child.material !== undefined ) {

				child.material.needsUpdate = true;

			}

		} );

		render();

	} );

	signals.rendererCreated.add( function ( newRenderer ) {

		if ( renderer !== null ) {

			renderer.setAnimationLoop( null );

			try {

				pmremGenerator.dispose();

			} catch ( e ) {

				console.warn( 'PMREMGenerator dispose error:', e );

			}

			renderer.dispose();

			container.dom.removeChild( renderer.domElement );

		}

		controls.connect( newRenderer.domElement );
		transformControls.connect( newRenderer.domElement );

		renderer = newRenderer;

		renderer.setAnimationLoop( animate );
		renderer.setClearColor( 0xaaaaaa );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			mediaQuery.addEventListener( 'change', function ( event ) {

				renderer.setClearColor( event.matches ? 0x333333 : 0xaaaaaa );
				updateGridColors( grid1, grid2, event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

				render();

			} );

			renderer.setClearColor( mediaQuery.matches ? 0x333333 : 0xaaaaaa );
			updateGridColors( grid1, grid2, mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

		}

		renderer.getClearColor( editor.viewportColor );

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		if ( renderer.isWebGLRenderer ) {

			pmremGenerator = new THREE.PMREMGenerator( renderer );
			pmremGenerator.compileEquirectangularShader();

		} else {

			pmremGenerator = new PMREMGenerator( renderer );

		}

		container.dom.appendChild( renderer.domElement );

		signals.sceneEnvironmentChanged.dispatch( editor.environmentType );

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		ktx2Loader.detectSupport( renderer );

	} );

	signals.sceneGraphChanged.add( function () {

		// Re-add default lights if needed

		if ( editor.viewportShading === 'default' && defaultLights.parent !== scene ) {

			scene.add( defaultLights );

		}

		// Refresh solid mode for new objects

		if ( editor.viewportShading === 'solid' ) {

			exitSolidMode();
			enterSolidMode();

		}

		render();

	} );

	let cameraRenderPending = false;

	signals.cameraChanged.add( function () {

		if ( cameraRenderPending ) return;
		cameraRenderPending = true;

		requestAnimationFrame( function () {

			cameraRenderPending = false;
			render();

		} );

	} );

	// Multi-selection support

	const multiSelectionBoxes = [];
	const multiSelectionMaterial = new THREE.LineBasicMaterial( { color: 0xff8800, depthTest: false, transparent: true } );
	let multiSelectionGroup = null;
	let multiSelectionOriginalPositions = [];

	signals.multiSelectionChanged.add( function ( selection ) {

		// Clear old multi-selection boxes
		for ( let i = 0; i < multiSelectionBoxes.length; i ++ ) {

			sceneHelpers.remove( multiSelectionBoxes[ i ] );
			multiSelectionBoxes[ i ].geometry.dispose();

		}

		multiSelectionBoxes.length = 0;

		// Create boxes for each selected object
		const _tempBox = new THREE.Box3();

		for ( let i = 0; i < selection.length; i ++ ) {

			const obj = selection[ i ];
			_tempBox.setFromObject( obj, true );

			if ( ! _tempBox.isEmpty() ) {

				const helper = new THREE.Box3Helper( _tempBox.clone(), 0xff8800 );
				helper.material = multiSelectionMaterial;
				sceneHelpers.add( helper );
				multiSelectionBoxes.push( helper );

			}

		}

		render();

	} );

	// When transform starts on multi-selection, save all positions
	transformControls.addEventListener( 'mouseDown', function () {

		const selection = editor.selector.multiSelection;

		if ( selection.length > 1 ) {

			multiSelectionOriginalPositions = selection.map( obj => obj.position.clone() );

		}

	} );

	function updateMultiSelectionBoxes() {

		const selection = editor.selector.multiSelection;

		for ( let i = 0; i < multiSelectionBoxes.length; i ++ ) {

			if ( i < selection.length ) {

				multiSelectionBoxes[ i ].box.setFromObject( selection[ i ], true );

			}

		}

	}

	// When transforming with multi-selection, move all objects together
	transformControls.addEventListener( 'objectChange', function () {

		const selection = editor.selector.multiSelection;

		if ( selection.length > 1 && transformControls.object ) {

			const active = transformControls.object;
			const activeOriginal = multiSelectionOriginalPositions[ selection.indexOf( active ) ];

			if ( activeOriginal ) {

				_multiDelta.copy( active.position ).sub( activeOriginal );

				for ( let i = 0; i < selection.length; i ++ ) {

					if ( selection[ i ] !== active && multiSelectionOriginalPositions[ i ] ) {

						selection[ i ].position.copy( multiSelectionOriginalPositions[ i ] ).add( _multiDelta );

					}

				}

			}

			updateMultiSelectionBoxes();

		}

	} );

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( object !== null && object !== scene && object !== camera ) {

			box.setFromObject( object, true );

			if ( box.isEmpty() === false ) {

				selectionBox.visible = true;

			}

			transformControls.attach( object );

		}

		render();

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			box.setFromObject( object, true );

		}

		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			box.setFromObject( object, true );

		}

		if ( object.isPerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		const helper = editor.helpers[ object.id ];

		if ( helper !== undefined && helper.isSkeletonHelper !== true ) {

			helper.update();

		}

		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		controls.enabled = true; // see #14180

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

	} );

	signals.materialChanged.add( function () {

		render();

	} );

	// background

	signals.sceneBackgroundChanged.add( function ( backgroundType, backgroundColor, backgroundTexture, backgroundEquirectangularTexture, backgroundColorSpace, backgroundBlurriness, backgroundIntensity, backgroundRotation ) {

		editor.backgroundType = backgroundType;

		scene.background = null;

		switch ( backgroundType ) {

			case 'Color':

				scene.background = new THREE.Color( backgroundColor );

				break;

			case 'Texture':

				if ( backgroundTexture ) {

					backgroundTexture.colorSpace = backgroundColorSpace;
					backgroundTexture.needsUpdate = true;

					scene.background = backgroundTexture;

				}

				break;

			case 'Equirectangular':

				if ( backgroundEquirectangularTexture ) {

					backgroundEquirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;
					backgroundEquirectangularTexture.colorSpace = backgroundColorSpace;
					backgroundEquirectangularTexture.needsUpdate = true;

					scene.background = backgroundEquirectangularTexture;
					scene.backgroundBlurriness = backgroundBlurriness;
					scene.backgroundIntensity = backgroundIntensity;
					scene.backgroundRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

				}

				break;

		}

		if ( useBackgroundAsEnvironment ) {

			signals.sceneEnvironmentChanged.dispatch( editor.environmentType );

		}

		render();

	} );

	// environment

	let useBackgroundAsEnvironment = false;

	signals.sceneEnvironmentChanged.add( function ( environmentType, environmentEquirectangularTexture ) {

		editor.environmentType = environmentType;

		scene.environment = null;

		useBackgroundAsEnvironment = false;

		switch ( environmentType ) {

			case 'Equirectangular':

				if ( environmentEquirectangularTexture ) {

					scene.environment = environmentEquirectangularTexture;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

				}

				break;

			case 'Default':

				useBackgroundAsEnvironment = true;

				if ( scene.background !== null ) {

					if ( scene.background.isColor ) {

						scene.environment = pmremGenerator.fromScene( new ColorEnvironment( scene.background ), 0.04 ).texture;

					} else if ( scene.background.isTexture ) {

						scene.environment = scene.background;
						scene.environment.mapping = THREE.EquirectangularReflectionMapping;
						scene.environmentRotation.y = scene.backgroundRotation.y;

					}

				} else {

					scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

				}

				break;

		}

		render();

	} );

	// fog

	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'None':
				scene.fog = null;
				break;
			case 'Fog':
				scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
				break;
			case 'FogExp2':
				scene.fog = new THREE.FogExp2( fogColor, fogDensity );
				break;

		}

		render();

	} );

	signals.sceneFogSettingsChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'Fog':
				scene.fog.color.setHex( fogColor );
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;
				break;
			case 'FogExp2':
				scene.fog.color.setHex( fogColor );
				scene.fog.density = fogDensity;
				break;

		}

		render();

	} );

	signals.viewportCameraChanged.add( function () {

		const viewportCamera = editor.viewportCamera;

		if ( viewportCamera.isPerspectiveCamera || viewportCamera.isOrthographicCamera ) {

			updateAspectRatio();

		}

		// disable EditorControls when setting a user camera

		controls.enabled = ( viewportCamera === editor.camera );

		render();

	} );

	const cachedOverrideMaterials = {
		normals: new THREE.MeshNormalMaterial(),
		wireframe: new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
	};

	// Solid mode: material color without textures

	const solidOriginalMaterials = new Map();
	const solidMaterialCache = new Map();
	const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'alphaMap', 'specularMap', 'displacementMap' ];

	const _avgCanvas = document.createElement( 'canvas' );
	_avgCanvas.width = 1;
	_avgCanvas.height = 1;
	const _avgCtx = _avgCanvas.getContext( '2d', { willReadFrequently: true } );

	function getAverageColor( texture ) {

		if ( ! texture || ! texture.image ) return null;

		try {

			const img = texture.image;
			_avgCtx.drawImage( img, 0, 0, 1, 1 );
			const data = _avgCtx.getImageData( 0, 0, 1, 1 ).data;
			return new THREE.Color( data[ 0 ] / 255, data[ 1 ] / 255, data[ 2 ] / 255 );

		} catch ( e ) {

			return null;

		}

	}

	function enterSolidMode() {

		scene.traverse( function ( child ) {

			if ( child.material === undefined ) return;

			const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
			const solidMaterials = [];

			for ( const mat of materials ) {

				if ( ! solidMaterialCache.has( mat ) ) {

					let color = mat.color ? mat.color.clone() : new THREE.Color( 0xaaaaaa );

					// If color is white and there's a diffuse map, sample the texture's average color

					if ( mat.map && color.r === 1 && color.g === 1 && color.b === 1 ) {

						const avg = getAverageColor( mat.map );
						if ( avg ) color.copy( avg );

					}

					const solid = new THREE.MeshBasicMaterial( {
						color: color,
						transparent: mat.transparent,
						opacity: mat.opacity,
						side: mat.side
					} );

					solid._solidOriginal = mat;

					solidMaterialCache.set( mat, solid );

				}

				solidMaterials.push( solidMaterialCache.get( mat ) );

			}

			solidOriginalMaterials.set( child, child.material );
			child.material = Array.isArray( child.material ) ? solidMaterials : solidMaterials[ 0 ];

		} );

	}

	function exitSolidMode() {

		for ( const [ child, original ] of solidOriginalMaterials ) {

			child.material = original;

		}

		solidOriginalMaterials.clear();
		solidMaterialCache.clear();

	}

	signals.viewportShadingChanged.add( function () {

		// Exit solid mode first if we were in it

		if ( solidOriginalMaterials.size > 0 ) exitSolidMode();

		const viewportShading = editor.viewportShading;

		switch ( viewportShading ) {

			case 'default':
				scene.overrideMaterial = null;
				scene.add( defaultLights );
				break;

			case 'solid':
				scene.overrideMaterial = null;
				scene.remove( defaultLights );
				enterSolidMode();
				break;

			case 'normals':
				scene.overrideMaterial = cachedOverrideMaterials.normals;
				scene.remove( defaultLights );
				break;

			case 'wireframe':
				scene.overrideMaterial = cachedOverrideMaterials.wireframe;
				scene.remove( defaultLights );
				break;

		}

		render();

	} );

	//

	signals.windowResize.add( function () {

		updateAspectRatio();

		if ( renderer === null ) return;

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );
		render();

	} );

	signals.showHelpersChanged.add( function ( appearanceStates ) {

		grid.visible = appearanceStates.gridHelper;

		sceneHelpers.traverse( function ( object ) {

			switch ( object.type ) {

				case 'CameraHelper':

				{

					object.visible = appearanceStates.cameraHelpers;
					break;

				}

				case 'PointLightHelper':
				case 'DirectionalLightHelper':
				case 'SpotLightHelper':
				case 'HemisphereLightHelper':

				{

					object.visible = appearanceStates.lightHelpers;
					break;

				}

				case 'SkeletonHelper':

				{

					object.visible = appearanceStates.skeletonHelpers;
					break;

				}

				default:

				{

					// not a helper, skip.

				}

			}

		} );


		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	// animations

	let prevActionsInUse = 0;

	const timer = new THREE.Timer(); // only used for animations

	function animate() {

		timer.update();

		const mixer = editor.mixer;
		const delta = timer.getDelta();

		let needsUpdate = false;

		// Animations

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );
			needsUpdate = true;

			if ( editor.selected !== null ) {

				editor.selected.updateWorldMatrix( false, true ); // avoid frame late effect for certain skinned meshes (e.g. Michelle.glb)
				selectionBox.box.setFromObject( editor.selected, true ); // selection box should reflect current animation state

			}

			signals.morphTargetsUpdated.dispatch();

		}

		// View Helper

		if ( viewHelper.animating === true ) {

			viewHelper.update( delta );
			needsUpdate = true;

		}

		if ( renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

	}

	//

	let startTime = 0;
	let endTime = 0;

	function render() {

		if ( renderer === null ) return;

		startTime = performance.now();

		renderer.setViewport( 0, 0, container.dom.offsetWidth, container.dom.offsetHeight );
		renderer.render( scene, editor.viewportCamera );

		if ( camera === editor.viewportCamera ) {

			renderer.autoClear = false;
			if ( grid.visible === true ) renderer.render( grid, camera );
			if ( sceneHelpers.visible === true ) renderer.render( sceneHelpers, camera );
			if ( renderer.xr.isPresenting !== true ) viewHelper.render( renderer );
			renderer.autoClear = true;

		}

		endTime = performance.now();
		editor.signals.sceneRendered.dispatch( endTime - startTime );

	}

	return container;

}

function updateGridColors( grid1, grid2, colors ) {

	grid1.material.color.setHex( colors[ 0 ] );
	grid2.material.color.setHex( colors[ 1 ] );

}

export { Viewport };
