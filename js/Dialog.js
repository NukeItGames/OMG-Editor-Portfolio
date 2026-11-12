function createDialog( message, showCancel ) {

	return new Promise( ( resolve ) => {

		const dom = document.createElement( 'div' );
		dom.className = 'Dialog';

		const background = document.createElement( 'div' );
		background.className = 'Dialog-background';
		if ( showCancel ) {

			background.addEventListener( 'click', () => {

				dom.remove();
				resolve( false );

			} );

		}

		dom.appendChild( background );

		const content = document.createElement( 'div' );
		content.className = 'Dialog-content';
		dom.appendChild( content );

		const titleBar = document.createElement( 'div' );
		titleBar.className = 'Dialog-title';
		titleBar.textContent = 'OMG Editor';
		content.appendChild( titleBar );

		const body = document.createElement( 'div' );
		body.className = 'Dialog-body';
		body.textContent = message;
		content.appendChild( body );

		const buttons = document.createElement( 'div' );
		buttons.className = 'Dialog-buttons';
		content.appendChild( buttons );

		const okButton = document.createElement( 'button' );
		okButton.className = 'Button';
		okButton.textContent = 'OK';
		okButton.style.minWidth = '80px';
		okButton.addEventListener( 'click', () => {

			dom.remove();
			resolve( true );

		} );
		buttons.appendChild( okButton );

		if ( showCancel ) {

			const cancelButton = document.createElement( 'button' );
			cancelButton.className = 'Button';
			cancelButton.textContent = 'Cancel';
			cancelButton.style.minWidth = '80px';
			cancelButton.style.marginLeft = '8px';
			cancelButton.addEventListener( 'click', () => {

				dom.remove();
				resolve( false );

			} );
			buttons.appendChild( cancelButton );

		}

		document.body.appendChild( dom );
		okButton.focus();

	} );

}

function confirmDialog( message ) {

	return createDialog( message, true );

}

function alertDialog( message ) {

	return createDialog( message, false );

}

export { confirmDialog, alertDialog };
