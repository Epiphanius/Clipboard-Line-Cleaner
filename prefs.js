import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
export default class ClipboardLineCleanerPreferences extends ExtensionPreferences {
fillPreferencesWindow(window) {
const settings = this.getSettings();
const page = new Adw.PreferencesPage({
title: _('General'),
icon_name: 'dialog-information-symbolic',
});
window.add(page);
const group = new Adw.PreferencesGroup({
title: _('Clipboard Line Cleaner Settings'),
description: _('Configure how the extension handles clipboard text'),
});
page.add(group);
// 1. Zeile: Auto-Clean
const enableRow = new Adw.SwitchRow({
title: _('Enable automatic cleaning'),
subtitle: _('Automatically remove empty lines from clipboard text when it changes'),
});
group.add(enableRow);
settings.bind(
'enabled',
enableRow,
'active',
Gio.SettingsBindFlags.DEFAULT
);
// 2. Zeile: Fließtext (Neu)
const removeNewlinesRow = new Adw.SwitchRow({
title: _('Remove all newlines'),
subtitle: _('Join lines together to create continuous running text'),
});
group.add(removeNewlinesRow);
settings.bind(
'remove-newlines',
removeNewlinesRow,
'active',
Gio.SettingsBindFlags.DEFAULT
);
}
}
