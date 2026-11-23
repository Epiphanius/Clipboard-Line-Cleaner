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
        this._settings = this._extension.getSettings();

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Switch 1: Remove empty lines
        this._removeEmptyLinesItem = new PopupMenu.PopupSwitchMenuItem(_('Remove empty lines'), false);
        this.menu.addMenuItem(this._removeEmptyLinesItem);

        // Switch 2: Convert to continuous text
        this._removeNewlinesItem = new PopupMenu.PopupSwitchMenuItem(_('Convert to continuous text'), false);
        this.menu.addMenuItem(this._removeNewlinesItem);

        this._removeEmptyLines = this._settings.get_boolean('remove-empty-lines');
        this._removeNewlines = this._settings.get_boolean('remove-newlines');

        this._removeEmptyLinesItem.setToggleState(this._removeEmptyLines);
        this._removeNewlinesItem.setToggleState(this._removeNewlines);

        this._removeEmptyLinesItem.connectObject('toggled', (item) => {
            this._removeEmptyLines = item.state;
            this._settings.set_boolean('remove-empty-lines', this._removeEmptyLines);
        }, this);

        this._removeNewlinesItem.connectObject('toggled', (item) => {
            this._removeNewlines = item.state;
            this._settings.set_boolean('remove-newlines', this._removeNewlines);
        }, this);

        this._settings.connectObject(
            'changed::remove-empty-lines', () => {
                this._removeEmptyLines = this._settings.get_boolean('remove-empty-lines');
                this._removeEmptyLinesItem.setToggleState(this._removeEmptyLines);
            },
            'changed::remove-newlines', () => {
                this._removeNewlines = this._settings.get_boolean('remove-newlines');
                this._removeNewlinesItem.setToggleState(this._removeNewlines);
            },
            this
        );

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Document Quick-Toggles (1 to 3)
        this._docItems = [];
        for (let i = 1; i <= 3; i++) {
            const prefix = `doc${i}`;
            const docSwitch = new PopupMenu.PopupSwitchMenuItem(
                this._getDocMenuLabel(i),
                this._settings.get_boolean(`${prefix}-enabled`)
            );

            docSwitch.connectObject('toggled', (item) => {
                const path = this._settings.get_string(`${prefix}-path`).trim();
                if (item.state && !path) {
                    item.setToggleState(false);
                    Main.notify(_('Clipboard Line Cleaner'), _(`Set a .txt file path for Document ${i} first.`));
                    this._extension.openPreferences();
                    return;
                }
                this._settings.set_boolean(`${prefix}-enabled`, item.state);
            }, this);

            this._settings.connectObject(
                `changed::${prefix}-enabled`, () => {
                    docSwitch.setToggleState(this._settings.get_boolean(`${prefix}-enabled`));
                },
                `changed::${prefix}-path`, () => {
                    docSwitch.label.set_text(this._getDocMenuLabel(i));
                },
                `changed::${prefix}-prepend`, () => {
                    docSwitch.label.set_text(this._getDocMenuLabel(i));
                },
                this
            );

            this.menu.addMenuItem(docSwitch);
            this._docItems.push(docSwitch);
        }

        this._prefsItem = new PopupMenu.PopupMenuItem(_('Configure .txt documents...'));
        this._prefsItem.connectObject('activate', () => {
            this._extension.openPreferences();
        }, this);
        this.menu.addMenuItem(this._prefsItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._cleanNowItem = new PopupMenu.PopupMenuItem(_('Clean & save clipboard now'));
        this._cleanNowItem.connectObject('activate', () => {
            this._cleanClipboardNow();
        }, this);
        this.menu.addMenuItem(this._cleanNowItem);

        this._composeEmailItem = new PopupMenu.PopupMenuItem(_('Compose email from clipboard'));
        this._composeEmailItem.connectObject('activate', () => {
            this._composeEmailFromClipboard();
        }, this);
        this.menu.addMenuItem(this._composeEmailItem);

        this._webNoteItem = new PopupMenu.PopupMenuItem(_('Send clipboard to web note'));
        this._webNoteItem.connectObject('activate', () => {
            this._sendClipboardToWebNote();
        }, this);
        this.menu.addMenuItem(this._webNoteItem);

        this._clipboard = St.Clipboard.get_default();
        this._clipboardTimeoutId = null;
        this._lastClipboardText = '';
        this._startMonitoring();
    }

    _getDocMenuLabel(index) {
        const prefix = `doc${index}`;
        const path = this._settings.get_string(`${prefix}-path`).trim();
        const isPrepend = this._settings.get_boolean(`${prefix}-prepend`);
        const modeTag = isPrepend ? _('Prepend') : _('Append');

        if (!path) {
            return _(`Doc ${index}: (Not set)`);
        }
        const basename = GLib.path_get_basename(path);
        return _(`Doc ${index}: ${basename} [${modeTag}]`);
    }

    _hasAnyDocumentEnabled() {
        for (let i = 1; i <= 3; i++) {
            if (this._settings.get_boolean(`doc${i}-enabled`)) {
                return true;
            }
        }
        return false;
    }

    _startMonitoring() {
        this._clipboardTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            if (this._removeEmptyLines || this._removeNewlines || this._hasAnyDocumentEnabled()) {
                this._checkClipboard();
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _checkClipboard() {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (text && text !== this._lastClipboardText) {
                this._lastClipboardText = text;
                if (text.length > 1000000) {
                    Main.notify(_('Clipboard Line Cleaner'), _('Skipped clipboard text larger than 1 MB'));
                    return;
                }
                let cleanedText = this._cleanText(text);

                if (cleanedText !== text) {
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
                    this._lastClipboardText = cleanedText;
                    Main.notify(_('Clipboard Line Cleaner'), _('Clipboard text cleaned'));
                }

                this._saveToEnabledDocuments(cleanedText);
            }
        });
    }

    _cleanClipboardNow() {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (text) {
                if (text.length > 1000000) {
                    Main.notify(_('Clipboard Line Cleaner'), _('Skipped clipboard text larger than 1 MB'));
                    return;
                }
                let cleanedText = this._cleanText(text);
                if (cleanedText !== text) {
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
                    this._lastClipboardText = cleanedText;
                    Main.notify(_('Clipboard Line Cleaner'), _('Cleaned clipboard text manually'));
                } else {
                    Main.notify(_('Clipboard Line Cleaner'), _('Clipboard text is already clean'));
                }
                this._saveToEnabledDocuments(cleanedText);
            } else {
                Main.notify(_('Clipboard Line Cleaner'), _('Clipboard is empty'));
            }
        });
    }

    _composeEmailFromClipboard() {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (!text || !text.trim()) {
                Main.notify(_('Clipboard Line Cleaner'), _('Clipboard is empty'));
                return;
            }

            if (text.length > 1000000) {
                Main.notify(_('Clipboard Line Cleaner'), _('Skipped clipboard text larger than 1 MB'));
                return;
            }

            const cleanFirst = this._settings.get_boolean('mailto-clean-first');
            const bodyText = cleanFirst ? this._cleanText(text) : text;

            const MAX_MAILTO_CHARS = 3500;
            if (bodyText.length > MAX_MAILTO_CHARS) {
                Main.notify(
                    _('Clipboard Line Cleaner'),
                    _('Clipboard text exceeds 3,500 chars for mailto — please paste manually with Ctrl+V')
                );
                return;
            }

            const recipient = this._settings.get_string('mailto-recipient').trim();
            let subject = this._settings.get_string('mailto-subject').trim();
            if (!subject) {
                const firstLine = bodyText.split(/\r?\n/)[0].replace(/[\x00-\x1F\x7F]/g, '').trim();
                subject = firstLine.slice(0, 80);
            }

            const encodedTo = encodeURIComponent(recipient);
            const queryParts = [];
            if (subject)
                queryParts.push(`subject=${encodeURIComponent(subject)}`);
            queryParts.push(`body=${encodeURIComponent(bodyText)}`);

            const mailtoUri = `mailto:${encodedTo}?${queryParts.join('&')}`;

            try {
                Gio.AppInfo.launch_default_for_uri(mailtoUri, null);
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed to launch mailto URI: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not open mail client: ${e.message}`));
            }
        });
    }

    _sendClipboardToWebNote() {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (!text || !text.trim()) {
                Main.notify(_('Clipboard Line Cleaner'), _('Clipboard is empty'));
                return;
            }

            if (text.length > 1000000) {
                Main.notify(_('Clipboard Line Cleaner'), _('Skipped clipboard text larger than 1 MB'));
                return;
            }

            const cleanFirst = this._settings.get_boolean('webnote-clean-first');
            const noteText = cleanFirst ? this._cleanText(text) : text;

            if (cleanFirst && noteText !== text) {
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, noteText);
                this._lastClipboardText = noteText;
            }

            const provider = this._settings.get_string('webnote-provider');
            let targetUrl = '';

            if (provider === 'onenote') {
                targetUrl = 'https://www.onenote.com/notebooks';
            } else if (provider === 'custom') {
                targetUrl = this._settings.get_string('webnote-custom-url').trim();
                if (!/^https?:\/\//i.test(targetUrl)) {
                    Main.notify(
                        _('Clipboard Line Cleaner'),
                        _('Please set a valid http:// or https:// URL in Preferences')
                    );
                    return;
                }
            } else {
                // Default: Google Keep (pre-fill title/text when short enough, plus clipboard ready for Ctrl+V)
                const firstLine = noteText.split(/\r?\n/)[0].replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 80);
                if (noteText.length <= 2500) {
                    const params = [];
                    if (firstLine)
                        params.push(`title=${encodeURIComponent(firstLine)}`);
                    params.push(`text=${encodeURIComponent(noteText)}`);
                    targetUrl = `https://keep.google.com/?${params.join('&')}`;
                } else {
                    targetUrl = 'https://keep.google.com/';
                }
            }

            try {
                Gio.AppInfo.launch_default_for_uri(targetUrl, null);
                Main.notify(_('Clipboard Line Cleaner'), _('Opened web note (cleaned text ready to paste)'));
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed to launch web note URL: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not open browser: ${e.message}`));
            }
        });
    }

    _cleanText(text) {
        if (text.length > 1000000) {
            return text;
        }

        let cleaned = text;

        // Option 1: Remove empty lines (and leading line indentation)
        if (this._removeEmptyLines) {
            cleaned = cleaned.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => line.replace(/^\s+/, ''))
                .join('\n');
        }

        // Option 2: Convert to continuous text (works with or without Option 1)
        if (this._removeNewlines) {
            cleaned = cleaned.replace(/[-­\-]\s*\r?\n\s*/g, '');
            cleaned = cleaned.replace(/\r?\n/g, ' ');
            cleaned = cleaned.replace(/\s+/g, ' ').trim();
        }

        return cleaned;
    }

    _formatEntryWithSeparator(text, existingContent, isPrepend) {
        const mode = this._settings.get_string('separator-mode');

        if (mode === 'timestamp') {
            const now = GLib.DateTime.new_now_local();
            const stamp = now.format('[%Y-%m-%d %H:%M:%S]');
            const stampedEntry = `${stamp}\n${text}`;

            if (!existingContent) {
                return stampedEntry;
            }
            if (isPrepend) {
                const gap = existingContent.startsWith('\n\n') ? '' : (existingContent.startsWith('\n') ? '\n' : '\n\n');
                return `${stampedEntry}${gap}${existingContent}`;
            } else {
                const gap = existingContent.endsWith('\n\n') ? '' : (existingContent.endsWith('\n') ? '\n' : '\n\n');
                return `${existingContent}${gap}${stampedEntry}`;
            }
        }

        if (!existingContent) {
            return text;
        }

        let sep = '\n';
        if (mode === 'double-newline') {
            sep = '\n\n';
        } else if (mode === 'custom') {
            const rawCustom = this._settings.get_string('custom-separator');
            sep = rawCustom.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        }

        if (isPrepend) {
            const cleanExisting = existingContent.replace(/^\n+/, '');
            return `${text}${sep}${cleanExisting}`;
        } else {
            const cleanExisting = existingContent.replace(/\n+$/, '');
            return `${cleanExisting}${sep}${text}`;
        }
    }

    async _writeToSingleDocument(index, text, decoder, encoder) {
        const prefix = `doc${index}`;
        const enabled = this._settings.get_boolean(`${prefix}-enabled`);
        const path = this._settings.get_string(`${prefix}-path`).trim();
        const isPrepend = this._settings.get_boolean(`${prefix}-prepend`);

        if (!enabled || !path) {
            return null;
        }

        if (!path.toLowerCase().endsWith('.txt')) {
            Main.notify(_('Clipboard Line Cleaner'), _(`Skipped Document ${index}: File must be a .txt file.`));
            return null;
        }

        const file = Gio.File.new_for_path(path);
        let existingContent = '';

        try {
            const [bytes] = await new Promise((resolve, reject) => {
                file.load_contents_async(null, (source, res) => {
                    try {
                        const [ok, contents] = source.load_contents_finish(res);
                        resolve([ok ? contents : new Uint8Array()]);
                    } catch (err) {
                        reject(err);
                    }
                });
            });
            existingContent = decoder.decode(bytes);
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
                throw e;
            }
        }

        const updatedContent = this._formatEntryWithSeparator(text, existingContent, isPrepend);

        await new Promise((resolve, reject) => {
            file.replace_contents_async(
                encoder.encode(updatedContent),
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null,
                (source, res) => {
                    try {
                        source.replace_contents_finish(res);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }
            );
        });

        return GLib.path_get_basename(path);
    }

    async _saveToEnabledDocuments(text) {
        if (!text) return;

        const decoder = new TextDecoder('utf-8');
        const encoder = new TextEncoder();
        const savedFiles = [];

        for (let i = 1; i <= 3; i++) {
            try {
                const savedName = await this._writeToSingleDocument(i, text, decoder, encoder);
                if (savedName) {
                    savedFiles.push(savedName);
                }
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed writing to Document ${i}: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Error saving to Document ${i}: ${e.message}`));
            }
        }

        if (savedFiles.length > 0) {
            Main.notify(
                _('Clipboard Line Cleaner'),
                _(`Added text to ${savedFiles.join(', ')}`)
            );
        }
    }

    destroy() {
        if (this._clipboardTimeoutId) {
            GLib.source_remove(this._clipboardTimeoutId);
            this._clipboardTimeoutId = null;
        }

        this._removeEmptyLinesItem.disconnectObject(this);
        this._removeNewlinesItem.disconnectObject(this);
        this._prefsItem.disconnectObject(this);
        this._cleanNowItem.disconnectObject(this);
        this._composeEmailItem.disconnectObject(this);
        this._webNoteItem.disconnectObject(this);

        for (const item of this._docItems) {
            item.disconnectObject(this);
        }

        this._settings.disconnectObject(this);
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
