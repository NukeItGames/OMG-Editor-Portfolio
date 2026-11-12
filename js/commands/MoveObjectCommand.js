import { Command } from '../Command.js';

class MoveObjectCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {THREE.Object3D|null} [object=null]
	 * @param {THREE.Object3D|null} [newParent=null]
	 * @param {THREE.Object3D|null} [newBefore=null]
	 * @constructor
	 */
	constructor( editor, object = null, newParent = null, newBefore = null ) {

		super( editor );

		this.type = 'MoveObjectCommand';
		this.name = editor.strings.getKey( 'command/MoveObject' );

		this.object = object;
		this.oldParent = ( object !== null ) ? object.parent : null;
		this.oldIndex = ( this.oldParent !== null ) ? this.oldParent.children.indexOf( this.object ) : null;
		this.newParent = newParent;

		if ( newBefore !== null ) {

			this.newIndex = ( newParent !== null ) ? newParent.children.indexOf( newBefore ) : null;

		} else {

			this.newIndex = ( newParent !== null ) ? newParent.children.length : null;

		}

		if ( this.oldParent === this.newParent && this.newIndex > this.oldIndex ) {

			this.newIndex --;

		}

		this.newBefore = newBefore;

	}

	execute() {

		// Save original local transform so undo restores it exactly
		this.oldPosition = this.object.position.clone();
		this.oldQuaternion = this.object.quaternion.clone();
		this.oldScale = this.object.scale.clone();

		// attach() reparents while preserving world transform
		this.newParent.attach( this.object );

		// attach() appends; reorder children to the requested index
		const children = this.newParent.children;
		const currentIdx = children.indexOf( this.object );
		if ( currentIdx !== this.newIndex && this.newIndex !== null ) {

			children.splice( currentIdx, 1 );
			children.splice( this.newIndex, 0, this.object );

		}

		this.editor.signals.objectChanged.dispatch( this.object );
		this.editor.signals.objectChanged.dispatch( this.newParent );
		this.editor.signals.objectChanged.dispatch( this.oldParent );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	undo() {

		this.oldParent.attach( this.object );

		const children = this.oldParent.children;
		const currentIdx = children.indexOf( this.object );
		if ( currentIdx !== this.oldIndex && this.oldIndex !== null ) {

			children.splice( currentIdx, 1 );
			children.splice( this.oldIndex, 0, this.object );

		}

		// Restore exact original local transform
		this.object.position.copy( this.oldPosition );
		this.object.quaternion.copy( this.oldQuaternion );
		this.object.scale.copy( this.oldScale );
		this.object.updateMatrix();

		this.editor.signals.objectChanged.dispatch( this.object );
		this.editor.signals.objectChanged.dispatch( this.newParent );
		this.editor.signals.objectChanged.dispatch( this.oldParent );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.newParentUuid = this.newParent.uuid;
		output.oldParentUuid = this.oldParent.uuid;
		output.newIndex = this.newIndex;
		output.oldIndex = this.oldIndex;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldParent = this.editor.objectByUuid( json.oldParentUuid );
		if ( this.oldParent === undefined ) {

			this.oldParent = this.editor.scene;

		}

		this.newParent = this.editor.objectByUuid( json.newParentUuid );

		if ( this.newParent === undefined ) {

			this.newParent = this.editor.scene;

		}

		this.newIndex = json.newIndex;
		this.oldIndex = json.oldIndex;

	}

}

export { MoveObjectCommand };
