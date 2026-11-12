import { UIPanel, UIRow, UISelect, UISpan, UIText, UINumber, UICheckbox } from './libs/ui.js';

import { SidebarSettingsShortcuts } from './Sidebar.Settings.Shortcuts.js';
import { SidebarSettingsHistory } from './Sidebar.Settings.History.js';

function SidebarSettings( editor ) {

	const config = editor.config;
	const strings = editor.strings;

	const container = new UISpan();

	const settings = new UIPanel();
	settings.setBorderTop( '0' );
	settings.setPaddingTop( '20px' );
	container.add( settings );

	// language

	const options = Object.fromEntries( [ 'en', 'fr', 'zh', 'ja', 'ko', 'fa' ].map( locale => {

		return [ locale, new Intl.DisplayNames( locale, { type: 'language' } ).of( locale ) ];

	} ) );

	const languageRow = new UIRow();
	const language = new UISelect().setWidth( '150px' );
	language.setOptions( options );

	if ( config.getKey( 'language' ) !== undefined ) {

		language.setValue( config.getKey( 'language' ) );

	}

	language.onChange( function () {

		const value = this.getValue();

		editor.config.setKey( 'language', value );

	} );

	languageRow.add( new UIText( strings.getKey( 'sidebar/settings/language' ) ).setClass( 'Label' ) );
	languageRow.add( language );

	settings.add( languageRow );

	// Camera Speed

	const cameraSpeedRow = new UIRow();
	cameraSpeedRow.add( new UIText( 'Camera Speed' ).setClass( 'Label' ) );

	const cameraSpeedSlider = document.createElement( 'input' );
	cameraSpeedSlider.type = 'range';
	cameraSpeedSlider.min = 0.5;
	cameraSpeedSlider.max = 10;
	cameraSpeedSlider.step = 0.5;
	cameraSpeedSlider.value = 5;
	cameraSpeedSlider.style.width = '100px';
	cameraSpeedSlider.style.verticalAlign = 'middle';

	const cameraSpeed = new UINumber( 5 ).setRange( 0.5, 10 ).setPrecision( 1 ).setWidth( '50px' );

	function updateCameraSpeed( value ) {

		if ( editor.controls ) editor.controls.flySpeed = value;

	}

	cameraSpeedSlider.addEventListener( 'input', function () {

		const val = parseFloat( this.value );
		cameraSpeed.setValue( val );
		updateCameraSpeed( val );

	} );

	cameraSpeed.onChange( function () {

		const val = cameraSpeed.getValue();
		cameraSpeedSlider.value = Math.min( val, 10 );
		updateCameraSpeed( val );

	} );

	cameraSpeedRow.dom.appendChild( cameraSpeedSlider );
	cameraSpeedRow.add( cameraSpeed );

	settings.add( cameraSpeedRow );

	// Boot Up Sound

	const bootUpSoundRow = new UIRow();
	bootUpSoundRow.add( new UIText( 'Boot Up Sound' ).setClass( 'Label' ) );

	const bootUpSoundCheckbox = new UICheckbox( config.getKey( 'settings/bootUpSound' ) !== false );
	bootUpSoundCheckbox.onChange( function () {

		config.setKey( 'settings/bootUpSound', this.getValue() );

	} );

	bootUpSoundRow.add( bootUpSoundCheckbox );
	settings.add( bootUpSoundRow );

	//

	container.add( new SidebarSettingsShortcuts( editor ) );
	container.add( new SidebarSettingsHistory( editor ) );

	return container;

}

export { SidebarSettings };
