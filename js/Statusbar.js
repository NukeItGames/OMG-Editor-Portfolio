import { UIPanel, UIText } from './libs/ui.js';

function Statusbar( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'statusbar' );

	const messageText = new UIText( '' );
	messageText.setColor( '#888' );
	messageText.setFontSize( '12px' );
	messageText.dom.style.transition = 'opacity 0.3s ease';
	container.add( messageText );

	let timeout;
	let lastMessageTime = 0;

	function showMessage( text, priority ) {

		const now = Date.now();

		// Low priority messages don't overwrite recent high priority ones
		if ( priority === 'low' && ( now - lastMessageTime ) < 2000 ) return;

		clearTimeout( timeout );
		messageText.setValue( text );
		messageText.setOpacity( '1' );

		if ( priority !== 'low' ) lastMessageTime = now;

		timeout = setTimeout( function () {

			messageText.setOpacity( '0' );

		}, 3000 );

	}

	signals.savingFinished.add( function () { showMessage( 'Saved', 'low' ); } );
	signals.savingFailed.add( function () { showMessage( 'Autosave failed — save a JSON backup' ); } );
	signals.objectAdded.add( function () { showMessage( 'Object added' ); } );
	signals.objectRemoved.add( function () { showMessage( 'Object removed' ); } );
	signals.editorCleared.add( function () { showMessage( 'Scene cleared' ); } );

	return container;

}

export { Statusbar };
