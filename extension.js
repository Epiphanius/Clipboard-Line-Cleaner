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
        // Create panel button icon
        let icon = new St.Icon({
            icon_name: 'edit-clear-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(icon);
        // Create menu items
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let enabledItem = new PopupMenu.PopupSwitchMenuItem(_('Auto-clean clipboard'), true);
        enabledItem.connect('toggled', (item) => {
            this._enabled = item.state;
            if (this.getSettings) {
                this.getSettings.set_boolean('enabled', this._enabled);
            }
        });
        this.menu.addMenuItem(enabledItem);
        let cleanNowItem = new PopupMenu.PopupMenuItem(_('Clean clipboard now'));
        cleanNowItem.connect('activate', () => {
            this._cleanClipboardNow();
        });
        this.menu.addMenuItem(cleanNowItem);
        // Initialize settings - use extension settings if available
        try {
            this.getSettings = this._extension.getSettings();
            this._enabled = this.getSettings.get_boolean('enabled');
        } catch (e) {
            // Fallback if schema is not found
            this.getSettings = null;
            this._enabled = true;
            log('Schema not found, using default settings');
        }
        enabledItem.setToggleState(this._enabled);
        // Set up clipboard monitoring
        this._clipboard = St.Clipboard.get_default();
        this._clipboardChangedId = null;
        this._lastClipboardText = '';
        this._startMonitoring();
    }
    _startMonitoring() {
        // Poll clipboard every 500ms when enabled
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
                let cleanedText = this._removeEmptyLines(text);
                if (cleanedText !== text) {
                    // Update clipboard with cleaned text
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
                    this._lastClipboardText = cleanedText;
                    // Show notification
                    Main.notify(_('Clipboard Line Cleaner'), 
                              _('Removed empty lines from clipboard text'));
                }
            }
        });
    }
    _cleanClipboardNow() {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (text) {
                let cleanedText = this._removeEmptyLines(text);
                if (cleanedText !== text) {
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
                    this._lastClipboardText = cleanedText;
                    Main.notify(_('Clipboard Line Cleaner'), 
                              _('Cleaned clipboard text manually'));
                } else {
                    Main.notify(_('Clipboard Line Cleaner'), 
                              _('No empty lines found in clipboard'));
                }
            } else {
                Main.notify(_('Clipboard Line Cleaner'), 
                          _('Clipboard is empty'));
            }
        });
    }
    _removeEmptyLines(text) {
        // Split text into lines, filter out empty lines, then rejoin
        return text.split('\n')
                  .filter(line => line.trim() !== '')
                  .join('\n');
    }
    destroy() {
        if (this._clipboardTimeoutId) {
            GLib.source_remove(this._clipboardTimeoutId);
            this._clipboardTimeoutId = null;
        }
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
