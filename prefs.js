import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SEPARATOR_MODES = ['newline', 'double-newline', 'timestamp', 'custom'];

export default class ClipboardLineCleanerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('Target Documents'),
            icon_name: 'document-edit-symbolic',
        });
        window.add(page);

        // Separator Configuration Group
        const separatorGroup = new Adw.PreferencesGroup({
            title: _('Entry Separator'),
            description: _('Choose how new clipboard entries are separated from existing text in your .txt files.'),
        });
        page.add(separatorGroup);

        const modeLabels = new Gtk.StringList();
        modeLabels.append(_('Single newline'));
        modeLabels.append(_('Double newline (blank line)'));
        modeLabels.append(_('Timestamp ([YYYY-MM-DD HH:MM:SS])'));
        modeLabels.append(_('Custom separator'));

        const modeRow = new Adw.ComboRow({
            title: _('Separator style'),
            model: modeLabels,
        });

        const currentMode = settings.get_string('separator-mode');
        const initialIndex = Math.max(0, SEPARATOR_MODES.indexOf(currentMode));
        modeRow.set_selected(initialIndex);

        const customRow = new Adw.EntryRow({
            title: _('Custom separator (use \\n for newline, \\t for tab)'),
            visible: currentMode === 'custom',
        });
        settings.bind('custom-separator', customRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        modeRow.connect('notify::selected', () => {
            const selectedMode = SEPARATOR_MODES[modeRow.get_selected()] ?? 'newline';
            settings.set_string('separator-mode', selectedMode);
            customRow.set_visible(selectedMode === 'custom');
        });

        separatorGroup.add(modeRow);
        separatorGroup.add(customRow);

        // Email Compose Group
        const emailGroup = new Adw.PreferencesGroup({
            title: _('Email Compose'),
            description: _('Configure defaults for composing an email from clipboard text. Leave subject empty to use the first line.'),
        });
        page.add(emailGroup);

        const recipientRow = new Adw.EntryRow({
            title: _('Default Recipient (To)'),
        });
        settings.bind('mailto-recipient', recipientRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        emailGroup.add(recipientRow);

        const subjectRow = new Adw.EntryRow({
            title: _('Default Subject (optional)'),
        });
        settings.bind('mailto-subject', subjectRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        emailGroup.add(subjectRow);

        const cleanFirstRow = new Adw.SwitchRow({
            title: _('Clean text before composing'),
            subtitle: _('Apply active empty-line and continuous-text rules first'),
        });
        settings.bind('mailto-clean-first', cleanFirstRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        emailGroup.add(cleanFirstRow);

        // Web Note Group
        const webnoteGroup = new Adw.PreferencesGroup({
            title: _('Web Note'),
            description: _('Clean clipboard text so it is ready to paste, then open your preferred note service. For Google Keep, click "Take a note..." and press Ctrl+V.'),
        });
        page.add(webnoteGroup);

        const providers = [
            { id: 'keep', label: _('Google Keep') },
            { id: 'onenote', label: _('Microsoft OneNote') },
            { id: 'custom', label: _('Custom URL') },
        ];

        const providerModel = new Gtk.StringList();
        for (const p of providers)
            providerModel.append(p.label);

        const providerRow = new Adw.ComboRow({
            title: _('Note Service'),
            model: providerModel,
        });

        const currentProvider = settings.get_string('webnote-provider');
        const initialIdx = Math.max(0, providers.findIndex(p => p.id === currentProvider));
        providerRow.set_selected(initialIdx);

        const customUrlRow = new Adw.EntryRow({
            title: _('Custom Note URL (https://...)'),
            sensitive: providers[initialIdx].id === 'custom',
        });
        settings.bind('webnote-custom-url', customUrlRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        providerRow.connect('notify::selected', () => {
            const selected = providers[providerRow.get_selected()] || providers[0];
            settings.set_string('webnote-provider', selected.id);
            customUrlRow.set_sensitive(selected.id === 'custom');
        });

        webnoteGroup.add(providerRow);
        webnoteGroup.add(customUrlRow);

        const webnoteCleanRow = new Adw.SwitchRow({
            title: _('Clean text before opening'),
            subtitle: _('Updates the clipboard with cleaned text so Ctrl+V pastes cleanly'),
        });
        settings.bind('webnote-clean-first', webnoteCleanRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        webnoteGroup.add(webnoteCleanRow);

        // Info Group
        const infoGroup = new Adw.PreferencesGroup({
            title: _('Auto-Save Clipboard to .txt Files'),
            description: _('Reminder: Only plain text (.txt) files are supported. When enabled, cleaned clipboard text is automatically written to all active documents.'),
        });
        page.add(infoGroup);

        for (let i = 1; i <= 3; i++) {
            this._buildDocumentGroup(page, window, settings, i);
        }
    }

    _buildDocumentGroup(page, window, settings, index) {
        const prefix = `doc${index}`;
        const group = new Adw.PreferencesGroup({
            title: _(`Document ${index}`),
        });
        page.add(group);

        const enableRow = new Adw.SwitchRow({
            title: _('Enable saving to this document'),
        });
        settings.bind(`${prefix}-enabled`, enableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(enableRow);

        const pathRow = new Adw.EntryRow({
            title: _('File path (.txt)'),
        });
        settings.bind(`${prefix}-path`, pathRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        const browseButton = new Gtk.Button({
            icon_name: 'document-open-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Choose a .txt file'),
        });

        browseButton.connect('clicked', () => {
            const filter = new Gtk.FileFilter();
            filter.set_name(_('Text files (*.txt)'));
            filter.add_pattern('*.txt');
            filter.add_mime_type('text/plain');

            const filterList = new Gio.ListStore({item_type: Gtk.FileFilter});
            filterList.append(filter);

            const dialog = new Gtk.FileDialog({
                title: _(`Select .txt File for Document ${index}`),
                filters: filterList,
                default_filter: filter,
            });

            dialog.open(window, null, (dlg, res) => {
                try {
                    const file = dlg.open_finish(res);
                    if (file) {
                        const selectedPath = file.get_path();
                        if (selectedPath && selectedPath.toLowerCase().endsWith('.txt')) {
                            settings.set_string(`${prefix}-path`, selectedPath);
                        } else {
                            const alert = new Adw.AlertDialog({
                                heading: _('Invalid File Type'),
                                body: _('Please select a valid .txt file.'),
                            });
                            alert.add_response('ok', _('OK'));
                            alert.present(window);
                        }
                    }
                } catch (e) {
                    // User cancelled dialog
                }
            });
        });

        pathRow.add_suffix(browseButton);
        group.add(pathRow);

        const modeRow = new Adw.SwitchRow({
            title: _('Prepend to top of file'),
            subtitle: _('Off: Append to end of file  |  On: Prepend to beginning of file'),
        });
        settings.bind(`${prefix}-prepend`, modeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(modeRow);
    }
}
