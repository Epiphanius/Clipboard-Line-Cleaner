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
import Pango from 'gi://Pango';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const SOCIAL_CONFIGS = {
    mastodon: { label: 'Mastodon', iconName: 'mail-send-symbolic', maxChars: 500 },
    bluesky: { label: 'Bluesky', iconName: 'mail-send-symbolic', maxChars: 300 },
    x: { label: 'X', iconName: 'mail-send-symbolic', maxChars: 280 },
    linkedin: { label: 'LinkedIn', iconName: 'mail-send-symbolic', maxChars: 3000 },
    threads: { label: 'Threads', iconName: 'mail-send-symbolic', maxChars: 500 },
    custom: { label: 'Social', iconName: 'web-browser-symbolic', maxChars: 2000 },
};

const ClipboardLineCleaner = GObject.registerClass(
class ClipboardLineCleaner extends PanelMenu.Button {
    _init(extension) {
        this._extension = extension;
        super._init(0.0, _('Clipboard Line Cleaner'));

        const icon = new St.Icon({
            icon_name: 'edit-clear-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(icon);
        this._settings = this._extension.getSettings();

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._removeEmptyLinesItem = new PopupMenu.PopupSwitchMenuItem(_('Remove empty lines'), false);
        this.menu.addMenuItem(this._removeEmptyLinesItem);

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

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._socialRowItem = this._createCompactRowItem();
        this.menu.addMenuItem(this._socialRowItem);
        this._rebuildSocialRow();

        this._appsRowItem = this._createCompactRowItem();
        this.menu.addMenuItem(this._appsRowItem);
        this._rebuildAppsRow();

        this._scriptItem = new PopupMenu.PopupMenuItem('');
        this._scriptItem.connectObject('activate', () => {
            this._runCustomScript();
        }, this);
        this.menu.addMenuItem(this._scriptItem);
        this._updateScriptItem();

        this._quickActionSep = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(this._quickActionSep);
        this._updateQuickActionSeparator();

        this._settings.connectObject(
            'changed::social-slot-1', () => { this._rebuildSocialRow(); this._updateQuickActionSeparator(); },
            'changed::social-slot-2', () => { this._rebuildSocialRow(); this._updateQuickActionSeparator(); },
            'changed::social-slot-3', () => { this._rebuildSocialRow(); this._updateQuickActionSeparator(); },
            'changed::app-slot-1', () => { this._rebuildAppsRow(); this._updateQuickActionSeparator(); },
            'changed::app-slot-2', () => { this._rebuildAppsRow(); this._updateQuickActionSeparator(); },
            'changed::app-slot-3', () => { this._rebuildAppsRow(); this._updateQuickActionSeparator(); },
            'changed::custom-script-path', () => { this._updateScriptItem(); this._updateQuickActionSeparator(); },
            this
        );

        this._cleanNowItem = new PopupMenu.PopupMenuItem(_('Clean & save clipboard now'));
        this._cleanNowItem.connectObject('activate', () => { this._cleanClipboardNow(); }, this);
        this.menu.addMenuItem(this._cleanNowItem);

        this._composeEmailItem = new PopupMenu.PopupMenuItem(_('Compose email from clipboard'));
        this._composeEmailItem.connectObject('activate', () => { this._composeEmailFromClipboard(); }, this);
        this.menu.addMenuItem(this._composeEmailItem);

        this._webNoteItem = new PopupMenu.PopupMenuItem(_('Send clipboard to web note'));
        this._webNoteItem.connectObject('activate', () => { this._sendClipboardToWebNote(); }, this);
        this.menu.addMenuItem(this._webNoteItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._prefsItem = new PopupMenu.PopupMenuItem(_('Configure...'));
        this._prefsItem.connectObject('activate', () => { this._extension.openPreferences(); }, this);
        this.menu.addMenuItem(this._prefsItem);

        this._clipboard = St.Clipboard.get_default();
        this._clipboardTimeoutId = null;
        this._lastClipboardText = '';
        this._startMonitoring();
    }

    _createCompactRowItem() {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'clc-compact-row',
        });
        const box = new St.BoxLayout({ x_expand: true, style_class: 'clc-button-row' });
        item._box = box;
        item.add_child(box);
        return item;
    }

    _populateCompactRow(rowItem, slots) {
        rowItem._box.destroy_all_children();
        for (const slot of slots) {
            const btn = new St.Button({
                style_class: 'button clc-mini-btn',
                can_focus: true,
                x_expand: true,
            });
            const inner = new St.BoxLayout({
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            if (slot.gicon || slot.iconName) {
                inner.add_child(new St.Icon({
                    gicon: slot.gicon ?? null,
                    icon_name: slot.iconName ?? null,
                    icon_size: 15,
                    style_class: 'clc-btn-icon',
                }));
            }
            const label = new St.Label({ text: slot.label, y_align: Clutter.ActorAlign.CENTER });
            label.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
            inner.add_child(label);
            btn.set_child(inner);
            btn.connect('clicked', () => {
                this.menu.close();
                slot.onClick();
            });
            rowItem._box.add_child(btn);
        }
        rowItem.visible = slots.length > 0;
    }

    _rebuildSocialRow() {
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const id = this._settings.get_string(`social-slot-${i}`).trim();
            const cfg = SOCIAL_CONFIGS[id];
            if (cfg)
                slots.push({ label: cfg.label, iconName: cfg.iconName, onClick: () => this._postToSocial(id) });
        }
        this._populateCompactRow(this._socialRowItem, slots);
    }

    _rebuildAppsRow() {
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const desktopId = this._settings.get_string(`app-slot-${i}`).trim();
            if (!desktopId)
                continue;
            const appInfo = Gio.DesktopAppInfo.new(desktopId);
            const displayName = appInfo ? appInfo.get_display_name() : desktopId.replace(/\.desktop$/i, '');
            slots.push({
                label: displayName,
                gicon: appInfo ? appInfo.get_icon() : null,
                iconName: appInfo ? null : 'application-x-executable-symbolic',
                onClick: () => this._launchLocalApp(desktopId),
            });
        }
        this._populateCompactRow(this._appsRowItem, slots);
    }

    _parseCustomScriptCommand() {
        const rawCmd = this._settings.get_string('custom-script-path').trim();
        if (!rawCmd)
            return null;
        try {
            const [ok, argv] = GLib.shell_parse_argv(rawCmd);
            if (!ok || !argv || argv.length === 0)
                return null;
            if (argv[0].startsWith('~/'))
                argv[0] = GLib.build_filenamev([GLib.get_home_dir(), argv[0].slice(2)]);
            return argv;
        } catch (e) {
            return null;
        }
    }

    _updateScriptItem() {
        const argv = this._parseCustomScriptCommand();
        if (!argv) {
            const rawCmd = this._settings.get_string('custom-script-path').trim();
            if (!rawCmd) {
                this._scriptItem.visible = false;
                return;
            }
            this._scriptItem.label.set_text(_('Run script: (invalid command)'));
            this._scriptItem.visible = true;
            return;
        }
        this._scriptItem.label.set_text(_(`Run script: ${GLib.path_get_basename(argv[0])}`));
        this._scriptItem.visible = true;
    }

    _updateQuickActionSeparator() {
        this._quickActionSep.visible =
            this._socialRowItem.visible || this._appsRowItem.visible || this._scriptItem.visible;
    }

    _postToSocial(platformId) {
        const cfg = SOCIAL_CONFIGS[platformId];
        if (!cfg)
            return;
        this._withPreparedClipboardText(this._settings.get_boolean('social-clean-first'), (postText) => {
            const encoded = encodeURIComponent(postText);
            let targetUrl = '';
            if (platformId === 'mastodon') {
                const instance = this._settings.get_string('social-mastodon-instance').trim().replace(/\/+$/, '');
                if (!/^https?:\/\//i.test(instance)) {
                    Main.notify(_('Clipboard Line Cleaner'), _('Please set a valid Mastodon instance URL in Preferences'));
                    return;
                }
                targetUrl = `${instance}/share?text=${encoded}`;
            } else if (platformId === 'bluesky') {
                targetUrl = `https://bsky.app/intent/compose?text=${encoded}`;
            } else if (platformId === 'x') {
                targetUrl = `https://x.com/intent/tweet?text=${encoded}`;
            } else if (platformId === 'linkedin') {
                targetUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
            } else if (platformId === 'threads') {
                targetUrl = `https://www.threads.net/intent/post?text=${encoded}`;
            } else if (platformId === 'custom') {
                const template = this._settings.get_string('social-custom-url').trim();
                if (!/^https?:\/\//i.test(template)) {
                    Main.notify(_('Clipboard Line Cleaner'), _('Please set a valid custom social URL in Preferences'));
                    return;
                }
                targetUrl = template.includes('{text}') ? template.replace(/\{text\}/g, encoded) : template;
            }
            try {
                Gio.AppInfo.launch_default_for_uri(targetUrl, null);
                const msg = postText.length > cfg.maxChars
                    ? _(`Opened ${cfg.label} (note: text is ${postText.length}/${cfg.maxChars} chars)`)
                    : _(`Opened ${cfg.label} composer`);
                Main.notify(_('Clipboard Line Cleaner'), msg);
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed to open social URL: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not open browser: ${e.message}`));
            }
        });
    }

    _launchLocalApp(desktopId) {
        const appInfo = Gio.DesktopAppInfo.new(desktopId);
        if (!appInfo) {
            Main.notify(_('Clipboard Line Cleaner'), _(`Application not found: ${desktopId}`));
            return;
        }
        const passAsFile = this._settings.get_boolean('app-pass-file');
        this._withPreparedClipboardText(this._settings.get_boolean('app-clean-first'), (preparedText) => {
            try {
                if (passAsFile) {
                    const [fd, tmpPath] = GLib.file_open_tmp('clc-clip-XXXXXX.txt');
                    GLib.close(fd);
                    GLib.file_set_contents(tmpPath, preparedText);
                    appInfo.launch([Gio.File.new_for_path(tmpPath)], null);
                    Main.notify(_('Clipboard Line Cleaner'), _(`Opened text file in ${appInfo.get_display_name()}`));
                } else {
                    appInfo.launch([], null);
                    Main.notify(_('Clipboard Line Cleaner'), _(`Opened ${appInfo.get_display_name()} — press Ctrl+V to paste`));
                }
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed to launch app: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not launch ${appInfo.get_display_name()}: ${e.message}`));
            }
        });
    }

    _runCustomScript() {
        const rawCmd = this._settings.get_string('custom-script-path').trim();
        if (!rawCmd) {
            Main.notify(_('Clipboard Line Cleaner'), _('No custom script configured in Preferences'));
            return;
        }
        const argv = this._parseCustomScriptCommand();
        if (!argv) {
            Main.notify(_('Clipboard Line Cleaner'), _('Invalid script command syntax in Preferences'));
            return;
        }
        const binPath = argv[0];
        if (!GLib.file_test(binPath, GLib.FileTest.IS_REGULAR) ||
            !GLib.file_test(binPath, GLib.FileTest.IS_EXECUTABLE)) {
            Main.notify(_('Clipboard Line Cleaner'), _(`Script not found or not executable: ${binPath}`));
            return;
        }
        this._withPreparedClipboardText(this._settings.get_boolean('custom-script-clean-first'), (preparedText) => {
            try {
                const proc = Gio.Subprocess.new(
                    argv,
                    Gio.SubprocessFlags.STDIN_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                proc.communicate_utf8_async(preparedText, null, (subproc, res) => {
                    try {
                        const [, , stderr] = subproc.communicate_utf8_finish(res);
                        const scriptName = GLib.path_get_basename(binPath);
                        if (subproc.get_successful()) {
                            Main.notify(_('Clipboard Line Cleaner'), _(`Sent clipboard to ${scriptName}`));
                        } else {
                            const firstErr = (stderr || '').trim().split('\n')[0] || `exit code ${subproc.get_exit_status()}`;
                            Main.notify(_('Clipboard Line Cleaner'), _(`${scriptName} failed: ${firstErr}`));
                        }
                    } catch (err) {
                        console.error(`[ClipboardLineCleaner] Script communicate error: ${err.message}`);
                    }
                });
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Script spawn failed: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not run script: ${e.message}`));
            }
        });
    }

    _getDocMenuLabel(index) {
        const prefix = `doc${index}`;
        const path = this._settings.get_string(`${prefix}-path`).trim();
        const modeTag = this._settings.get_boolean(`${prefix}-prepend`) ? _('Prepend') : _('Append');
        if (!path)
            return _(`Doc ${index}: (Not set)`);
        return _(`Doc ${index}: ${GLib.path_get_basename(path)} [${modeTag}]`);
    }

    _hasAnyDocumentEnabled() {
        for (let i = 1; i <= 3; i++) {
            if (this._settings.get_boolean(`doc${i}-enabled`))
                return true;
        }
        return false;
    }

    _startMonitoring() {
        this._clipboardTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            if (this._removeEmptyLines || this._removeNewlines || this._hasAnyDocumentEnabled())
                this._checkClipboard();
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
                const cleanedText = this._cleanText(text);
                if (cleanedText !== text) {
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, cleanedText);
                    this._lastClipboardText = cleanedText;
                    Main.notify(_('Clipboard Line Cleaner'), _('Clipboard text cleaned'));
                }
                this._saveToEnabledDocuments(cleanedText);
            }
        });
    }

    _withPreparedClipboardText(cleanFirst, callback) {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (!text || !text.trim()) {
                Main.notify(_('Clipboard Line Cleaner'), _('Clipboard is empty'));
                return;
            }
            if (text.length > 1000000) {
                Main.notify(_('Clipboard Line Cleaner'), _('Skipped clipboard text larger than 1 MB'));
                return;
            }
            const prepared = cleanFirst ? this._cleanText(text) : text;
            if (cleanFirst && prepared !== text) {
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, prepared);
                this._lastClipboardText = prepared;
            }
            callback(prepared);
        });
    }

    _cleanClipboardNow() {
        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (text) {
                if (text.length > 1000000) {
                    Main.notify(_('Clipboard Line Cleaner'), _('Skipped clipboard text larger than 1 MB'));
                    return;
                }
                const cleanedText = this._cleanText(text);
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
        this._withPreparedClipboardText(this._settings.get_boolean('mailto-clean-first'), (bodyText) => {
            if (bodyText.length > 3500) {
                Main.notify(_('Clipboard Line Cleaner'), _('Clipboard text exceeds 3,500 chars for mailto — please paste manually with Ctrl+V'));
                return;
            }
            const recipient = this._settings.get_string('mailto-recipient').trim();
            let subject = this._settings.get_string('mailto-subject').trim();
            if (!subject) {
                const firstLine = bodyText.split(/\r?\n/)[0].replace(/[\x00-\x1F\x7F]/g, '').trim();
                subject = firstLine.slice(0, 80);
            }
            const queryParts = [];
            if (subject)
                queryParts.push(`subject=${encodeURIComponent(subject)}`);
            queryParts.push(`body=${encodeURIComponent(bodyText)}`);
            try {
                Gio.AppInfo.launch_default_for_uri(`mailto:${encodeURIComponent(recipient)}?${queryParts.join('&')}`, null);
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed to launch mailto URI: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not open mail client: ${e.message}`));
            }
        });
    }

    _sendClipboardToWebNote() {
        this._withPreparedClipboardText(this._settings.get_boolean('webnote-clean-first'), () => {
            const provider = this._settings.get_string('webnote-provider');
            let targetUrl = 'https://keep.google.com/';
            if (provider === 'onenote') {
                targetUrl = 'https://www.onenote.com/notebooks';
            } else if (provider === 'custom') {
                targetUrl = this._settings.get_string('webnote-custom-url').trim();
                if (!/^https?:\/\//i.test(targetUrl)) {
                    Main.notify(_('Clipboard Line Cleaner'), _('Please set a valid http:// or https:// URL in Preferences'));
                    return;
                }
            }
            try {
                Gio.AppInfo.launch_default_for_uri(targetUrl, null);
                const notifyMsg = provider === 'keep'
                    ? _('Opened Google Keep — click "Take a note..." and press Ctrl+V')
                    : _('Opened web note (cleaned text ready to paste)');
                Main.notify(_('Clipboard Line Cleaner'), notifyMsg);
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed to launch web note URL: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Could not open browser: ${e.message}`));
            }
        });
    }

    _cleanText(text) {
        if (text.length > 1000000)
            return text;
        let cleaned = text;
        if (this._removeEmptyLines) {
            cleaned = cleaned.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => line.replace(/^\s+/, ''))
                .join('\n');
        }
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
            const stamp = GLib.DateTime.new_now_local().format('[%Y-%m-%d %H:%M:%S]');
            const stampedEntry = `${stamp}\n${text}`;
            if (!existingContent)
                return stampedEntry;
            if (isPrepend) {
                const gap = existingContent.startsWith('\n\n') ? '' : (existingContent.startsWith('\n') ? '\n' : '\n\n');
                return `${stampedEntry}${gap}${existingContent}`;
            }
            const gap = existingContent.endsWith('\n\n') ? '' : (existingContent.endsWith('\n') ? '\n' : '\n\n');
            return `${existingContent}${gap}${stampedEntry}`;
        }
        if (!existingContent)
            return text;
        let sep = '\n';
        if (mode === 'double-newline')
            sep = '\n\n';
        else if (mode === 'custom')
            sep = this._settings.get_string('custom-separator').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        if (isPrepend)
            return `${text}${sep}${existingContent.replace(/^\n+/, '')}`;
        return `${existingContent.replace(/\n+$/, '')}${sep}${text}`;
    }

    async _writeToSingleDocument(index, text, decoder, encoder) {
        const prefix = `doc${index}`;
        const enabled = this._settings.get_boolean(`${prefix}-enabled`);
        const path = this._settings.get_string(`${prefix}-path`).trim();
        const isPrepend = this._settings.get_boolean(`${prefix}-prepend`);
        if (!enabled || !path)
            return null;
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
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                throw e;
        }
        const updatedContent = this._formatEntryWithSeparator(text, existingContent, isPrepend);
        await new Promise((resolve, reject) => {
            file.replace_contents_async(
                encoder.encode(updatedContent), null, false, Gio.FileCreateFlags.NONE, null,
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
        if (!text)
            return;
        const decoder = new TextDecoder('utf-8');
        const encoder = new TextEncoder();
        const savedFiles = [];
        for (let i = 1; i <= 3; i++) {
            try {
                const savedName = await this._writeToSingleDocument(i, text, decoder, encoder);
                if (savedName)
                    savedFiles.push(savedName);
            } catch (e) {
                console.error(`[ClipboardLineCleaner] Failed writing to Document ${i}: ${e.message}`);
                Main.notify(_('Clipboard Line Cleaner'), _(`Error saving to Document ${i}: ${e.message}`));
            }
        }
        if (savedFiles.length > 0)
            Main.notify(_('Clipboard Line Cleaner'), _(`Added text to ${savedFiles.join(', ')}`));
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
        this._scriptItem.disconnectObject(this);
        for (const item of this._docItems)
            item.disconnectObject(this);
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
