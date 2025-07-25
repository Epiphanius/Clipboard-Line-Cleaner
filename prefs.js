import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ClipboardLineCleanerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Create a preferences group
        const group = new Adw.PreferencesGroup({
            title: _('Clipboard Line Cleaner Settings'),
            description: _('Configure how the extension handles clipboard text'),
        });
        page.add(group);

        // Create the enable/disable row
        const enableRow = new Adw.SwitchRow({
            title: _('Enable automatic cleaning'),
            subtitle: _('Automatically remove empty lines from clipboard text when it changes'),
        });
        group.add(enableRow);

        // Bind the switch to the setting
        settings.bind(
            'enabled',
            enableRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
}
