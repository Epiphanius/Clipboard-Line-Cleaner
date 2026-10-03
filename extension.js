/* extension.js
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 2 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* SPDX-License-Identifier: GPL-2.0-or-later
*/
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
const ClipboardLineCleaner = GObject.registerClass(
class ClipboardLineCleaner extends PanelMenu.Button {
_init(extension) {
this._extension = extension;
super._init(0.0, _('Clipboard Line Cleaner'));
let icon = new St.Icon({
icon_name: 'edit-clear-symbolic',
style_class: 'system-status-icon',
});
this.add_child(icon);
// GNOME Standard: Direktes Laden der Settings ohne try-catch
this._settings = this._extension.getSettings();
// Menü aufbauen
this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
// 1. Schalter: Auto-Clean
this._enabledItem = new PopupMenu.PopupSwitchMenuItem(_('Auto-clean clipboard'), false);
this.menu.addMenuItem(this._enabledItem);
// 2. Schalter: Fließtext
this._removeNewlinesItem = new PopupMenu.PopupSwitchMenuItem(_('Convert to continuous text'), false);
this.menu.addMenuItem(this._removeNewlinesItem);
// Werte initialisieren
this._enabled = this._settings.get_boolean('enabled');
this._removeNewlines = this._settings.get_boolean('remove-newlines');
this._enabledItem.setToggleState(this._enabled);
this._removeNewlinesItem.setToggleState(this._removeNewlines);
// Signale sauber via connectObject an 'this' binden
this._enabledItem.connectObject('toggled', (item) => {
this._enabled = item.state;
this._settings.set_boolean('enabled', this._enabled);
}, this);
this._removeNewlinesItem.connectObject('toggled', (item) => {
this._removeNewlines = item.state;
this._settings.set_boolean('remove-newlines', this._removeNewlines);
}, this);
// Einstellungs-Änderungen von außen überwachen (z.B. aus den Prefs)
this._settings.connectObject(
'changed::enabled', () => {
this._enabled = this._settings.get_boolean('enabled');
this._enabledItem.setToggleState(this._enabled);
},
'changed::remove-newlines', () => {
this._removeNewlines = this._settings.get_boolean('remove-newlines');
this._removeNewlinesItem.setToggleState(this._removeNewlines);
},
this
);
this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
this._cleanNowItem = new PopupMenu.PopupMenuItem(_('Clean clipboard now'));
this._cleanNowItem.connectObject('activate', () => {
this._cleanClipboardNow();
}, this);
this.menu.addMenuItem(this._cleanNowItem);
this._clipboard = St.Clipboard.get_default();
this._clipboardTimeoutId = null;
this._lastClipboardText = '';
this._startMonitoring();
}
_startMonitoring() {
this._clipboardTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
if (this._enabled) {
this._checkClipboard();
}
return GLib.SOURCE_CONTINUE;
});
}
_checkClipboard() {
this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
if (text && text !== this._lastClipboardText) {
this._lastClipboardText = text;
let cleanedText = this._cleanText(text);
if (cleanedText !== text) {
this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
this._lastClipboardText = cleanedText;
Main.notify(_('Clipboard Line Cleaner'), 
this._removeNewlines ? _('Converted clipboard text to continuous text') : _('Removed empty lines from clipboard text'));
}
}
});
}
_cleanClipboardNow() {
this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
if (text) {
let cleanedText = this._cleanText(text);
if (cleanedText !== text) {
this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
this._lastClipboardText = cleanedText;
Main.notify(_('Clipboard Line Cleaner'), _('Cleaned clipboard text manually'));
} else {
Main.notify(_('Clipboard Line Cleaner'), _('Clipboard text is already clean'));
}
} else {
Main.notify(_('Clipboard Line Cleaner'), _('Clipboard is empty'));
}
});
}
_cleanText(text) {
// Überspringe die Bereinigung bei Texten über 1 MB, um das Einfrieren des GNOME-Shell-Threads zu verhindern
if (text.length > 1000000) {
return text;
}
// Entfernen von Leerzeilen und führenden Leerzeichen pro Zeile
let cleaned = text.split('\n')
.filter(line => line.trim() !== '')
.map(line => line.replace(/^\s+/, ''))
.join('\n');
// Wenn die Option 'Fließtext' aktiv ist, Worttrennungen auflösen und Zeilenumbrüche entfernen
if (this._removeNewlines) {
// 1. Trennstriche am Zeilenende entfernen und getrennte Wörter direkt zusammenfügen.
// Erfasst Bindestriche (-), bedingte Trennstriche (\u00AD) und Gedankenstriche (\u2010),
// gefolgt von optionalem Whitespace und einem Zeilenumbruch.
cleaned = cleaned.replace(/[-­\-]\s*\r?\n\s*/g, '');
// 2. Verbleibende Zeilenumbrüche durch ein einzelnes Leerzeichen ersetzen
cleaned = cleaned.replace(/\r?\n/g, ' ');
// 3. Mehrfache aufeinanderfolgende Leerzeichen zu einem einzigen Leerzeichen zusammenfassen
cleaned = cleaned.replace(/\s+/g, ' ');
}
return cleaned;
}
destroy() {
if (this._clipboardTimeoutId) {
GLib.source_remove(this._clipboardTimeoutId);
this._clipboardTimeoutId = null;
}
// Korrekte Methode: Jede Instanz trennt explizit die Signale, die auf 'this' verweisen
this._enabledItem.disconnectObject(this);
this._removeNewlinesItem.disconnectObject(this);
this._settings.disconnectObject(this);
this._cleanNowItem.disconnectObject(this);
super.destroy();
}
});
export default class ClipboardLineCleanerExtension extends Extension {
enable() {
this._indicator = new ClipboardLineCleaner(this);
Main.panel.addToStatusArea(this.uuid, this._indicator);
}
disable() {
if (this._indicator) {
this._indicator.destroy();
this._indicator = null;
}
}
}
