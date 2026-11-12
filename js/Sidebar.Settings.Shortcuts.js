import { UIPanel, UIText, UIRow, UIInput } from './libs/ui.js';

import { Box3, Vector3, Raycaster, Quaternion, Euler } from 'three';

import { RemoveObjectCommand } from './commands/RemoveObjectCommand.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { MultiCmdsCommand } from './commands/MultiCmdsCommand.js';

import { clone } from 'three/addons/utils/SkeletonUtils.js';

function SidebarSettingsShortcuts( editor ) {

	const strings = editor.strings;

	const IS_MAC = navigator.platform.toUpperCase().indexOf( 'MAC' ) >= 0;

	function isValidKeyBinding( key ) {

		return key.match( /^[A-Za-z0-9]$/i ); // Can't use z currently due to undo/redo

	}

	const config = editor.config;
	const signals = editor.signals;

	const container = new UIPanel();

	const headerRow = new UIRow();
	headerRow.add( new UIText( strings.getKey( 'sidebar/settings/shortcuts' ).toUpperCase() ) );
	container.add( headerRow );

	const shortcuts = [ 'translate', 'rotate', 'scale', 'undo', 'focus' ];

	function createShortcutInput( name ) {

		const configName = 'settings/shortcuts/' + name;
		const shortcutRow = new UIRow();

		const shortcutInput = new UIInput().setWidth( '15px' ).setFontSize( '12px' );
		shortcutInput.setTextAlign( 'center' );
		shortcutInput.setTextTransform( 'lowercase' );
		shortcutInput.onChange( function () {

			const value = shortcutInput.getValue().toLowerCase();

			if ( isValidKeyBinding( value ) ) {

				config.setKey( configName, value );

			}

		} );

		// Automatically highlight when selecting an input field
		shortcutInput.dom.addEventListener( 'click', function () {

			shortcutInput.dom.select();

		} );

		// If the value of the input field is invalid, revert the input field
		// to contain the key binding stored in config
		shortcutInput.dom.addEventListener( 'blur', function () {

			if ( ! isValidKeyBinding( shortcutInput.getValue() ) ) {

				shortcutInput.setValue( config.getKey( configName ) );

			}

		} );

		// If a valid key binding character is entered, blur the input field
		shortcutInput.dom.addEventListener( 'keyup', function ( event ) {

			if ( isValidKeyBinding( event.key ) ) {

				shortcutInput.dom.blur();

			}

		} );

		if ( config.getKey( configName ) !== undefined ) {

			shortcutInput.setValue( config.getKey( configName ) );

		}

		shortcutInput.dom.maxLength = 1;
		shortcutRow.add( new UIText( strings.getKey( 'sidebar/settings/shortcuts/' + name ) ).setTextTransform( 'capitalize' ).setClass( 'Label' ) );
		shortcutRow.add( shortcutInput );

		container.add( shortcutRow );

	}

	for ( let i = 0; i < shortcuts.length; i ++ ) {

		createShortcutInput( shortcuts[ i ] );

	}

	document.addEventListener( 'keydown', function ( event ) {

		if ( event.altKey && event.code === 'KeyR' ) {

			event.preventDefault();
			if ( event.repeat ) return;

			const object = editor.selected;
			if ( object === null || object.parent === null ) return;

			const deltaQ = new Quaternion().setFromAxisAngle( new Vector3( 0, 1, 0 ), - Math.PI / 2 );
			const q = object.quaternion.clone().premultiply( deltaQ );
			const newRot = new Euler().setFromQuaternion( q, object.rotation.order );
			editor.execute( new SetRotationCommand( editor, object, newRot ) );
			return;

		}

		if ( event.altKey && event.code === 'KeyT' ) {

			event.preventDefault();
			if ( event.repeat ) return;

			const object = editor.selected;
			if ( object === null || object.parent === null ) return;

			const deltaQ = new Quaternion().setFromAxisAngle( new Vector3( 0, 0, 1 ), Math.PI / 2 );
			const q = object.quaternion.clone().premultiply( deltaQ );
			const newRot = new Euler().setFromQuaternion( q, object.rotation.order );
			editor.execute( new SetRotationCommand( editor, object, newRot ) );
			return;

		}

		switch ( event.key.toLowerCase() ) {

			case 'escape':

				editor.selector.deselect();

				break;

			case 'backspace':

				event.preventDefault(); // prevent browser back

				// fall-through

			case 'delete':

				if ( editor.selector.multiSelection.length > 0 ) {

					const objects = editor.selector.multiSelection.slice();
					editor.selector.clearMultiSelection();
					editor.selector.select( null );

					const cmds = [];
					for ( const obj of objects ) {

						if ( obj.parent !== null ) cmds.push( new RemoveObjectCommand( editor, obj ) );

					}

					if ( cmds.length > 0 ) editor.execute( new MultiCmdsCommand( editor, cmds ), 'Delete Selection' );

				} else {

					const object = editor.selected;

					if ( object === null ) return;

					const parent = object.parent;
					if ( parent !== null ) editor.execute( new RemoveObjectCommand( editor, object ) );

				}

				break;

			case 'd':

				if ( IS_MAC ? event.metaKey : event.ctrlKey ) {

					event.preventDefault();

					if ( editor.selector.multiSelection.length > 0 ) {

						const originals = editor.selector.multiSelection.slice();
						const clones = [];
						const cmds = [];

						for ( const obj of originals ) {

							if ( obj.parent === null ) continue;
							const c = clone( obj );
							cmds.push( new AddObjectCommand( editor, c ) );
							clones.push( c );

						}

						if ( cmds.length > 0 ) {

							editor.execute( new MultiCmdsCommand( editor, cmds ), 'Clone Selection' );

							editor.selector.clearMultiSelection();
							for ( const c of clones ) editor.selector.multiSelection.push( c );
							editor.selector.select( clones[ clones.length - 1 ] );
							signals.multiSelectionChanged.dispatch( editor.selector.multiSelection );

						}

					} else {

						let object = editor.selected;

						if ( object === null || object.parent === null ) break;

						object = clone( object );

						editor.execute( new AddObjectCommand( editor, object ) );

					}

				}

				break;

			case config.getKey( 'settings/shortcuts/translate' ):

				signals.transformModeChanged.dispatch( 'translate' );

				break;

			case config.getKey( 'settings/shortcuts/rotate' ):

				signals.transformModeChanged.dispatch( 'rotate' );

				break;

			case config.getKey( 'settings/shortcuts/scale' ):

				signals.transformModeChanged.dispatch( 'scale' );

				break;

			case config.getKey( 'settings/shortcuts/undo' ):

				if ( IS_MAC ? event.metaKey : event.ctrlKey ) {

					event.preventDefault();
					if ( event.shiftKey ) editor.redo();
					else editor.undo();

				}

				break;

			case 'x':

				if ( IS_MAC ? event.metaKey : event.ctrlKey ) {

					event.preventDefault();
					editor.redo();

				}

				break;

			case 'g':

				{

					const object = editor.selected;

					if ( object === null || object.parent === null ) break;

					const aabb = new Box3().setFromObject( object );
					const center = aabb.getCenter( new Vector3() );
					const newPosition = new Vector3();

					newPosition.x = object.position.x - center.x;
					newPosition.y = object.position.y - center.y;
					newPosition.z = object.position.z - center.z;

					editor.execute( new SetPositionCommand( editor, object, newPosition ) );

				}

				break;

			case 'y':

				{

					const object = editor.selected;

					if ( object === null || object.parent === null ) break;

					const aabb = new Box3().setFromObject( object );
					const center = aabb.getCenter( new Vector3() );

					const raycaster = new Raycaster( new Vector3( center.x, aabb.min.y, center.z ), new Vector3( 0, - 1, 0 ) );

					const meshes = [];
					editor.scene.traverse( function ( child ) {

						if ( child.isMesh && child !== object && ! object.getObjectById( child.id ) ) {

							meshes.push( child );

						}

					} );

					const intersects = raycaster.intersectObjects( meshes, false );

					if ( intersects.length === 0 ) break;

					const groundY = intersects[ 0 ].point.y;
					const newPosition = object.position.clone();
					newPosition.y = groundY + ( object.position.y - aabb.min.y );

					editor.execute( new SetPositionCommand( editor, object, newPosition ) );

				}

				break;

			case config.getKey( 'settings/shortcuts/focus' ):

				if ( editor.selected !== null ) {

					editor.focus( editor.selected );

				}

				break;

		}

	} );

	return container;

}

export { SidebarSettingsShortcuts };
