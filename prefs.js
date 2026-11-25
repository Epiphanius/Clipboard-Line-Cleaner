import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SEPARATOR_MODES = ['newline', 'double-newline', 'timestamp', 'custom'];

const SOCIAL_PRESETS = [
    { id: '', label: 'None (hidden)' },
    { id: 'mastodon', label: 'Mastodon' },
    { id: 'bluesky', label: 'Bluesky' },
    { id: 'x', label: 'X (Twitter)' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'threads', label: 'Threads' },
    { id: 'custom', label: 'Custom URL' },
];

export default class ClipboardLineCleanerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const docsPage = new Adw.PreferencesPage({
            title: _('Target Documents'),
            icon_name: 'document-edit-symbolic',
        });
        window.add(docsPage);

        const separatorGroup = new Adw.PreferencesGroup({
            title: _('Entry Separator'),
            description: _('Choose how new clipboard entries are separated from existing text in your .txt files.'),
        });
        docsPage.add(separatorGroup);

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
        modeRow.set_selected(Math.max(0, SEPARATOR_MODES.indexOf(currentMode)));

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

        const infoGroup = new Adw.PreferencesGroup({
            title: _('Auto-Save Clipboard to .txt Files'),
            description: _('Only plain text (.txt) files are supported. When enabled, cleaned clipboard text is automatically written to all active documents.'),
        });
        docsPage.add(infoGroup);

        for (let i = 1; i <= 3; i++)
            this._buildDocumentGroup(docsPage, window, settings, i);

        const integrationsPage = new Adw.PreferencesPage({
            title: _('Integrations'),
            icon_name: 'send-to-symbolic',
        });
        window.add(integrationsPage);

        this._buildSocialGroup(integrationsPage, settings);
        this._buildLocalAppsGroup(integrationsPage, window, settings);
        this._buildCustomScriptGroup(integrationsPage, window, settings);
        this._buildEmailGroup(integrationsPage, settings);
        this._buildWebNoteGroup(integrationsPage, settings);
    }

    _buildSocialGroup(page, settings) {
        const socialGroup = new Adw.PreferencesGroup({
            title: _('Social Media Quick-Launch Buttons'),
            description: _('Configure up to three social media presets shown as compact buttons in the top-bar menu.'),
        });
        page.add(socialGroup);

        const mastodonRow = new Adw.EntryRow({ title: _('Mastodon Instance URL') });
        settings.bind('social-mastodon-instance', mastodonRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        const customSocialRow = new Adw.EntryRow({ title: _('Custom Social URL Template (use {text})') });
        settings.bind('social-custom-url', customSocialRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        const updateConditionalRows = () => {
            const activeIds = [1, 2, 3].map(i => settings.get_string(`social-slot-${i}`));
            mastodonRow.set_visible(activeIds.includes('mastodon'));
            customSocialRow.set_visible(activeIds.includes('custom'));
        };

        for (let i = 1; i <= 3; i++) {
            const model = new Gtk.StringList();
            for (const preset of SOCIAL_PRESETS)
                model.append(_(preset.label));

            const row = new Adw.ComboRow({ title: _(`Social Button ${i}`), model });
            const currentId = settings.get_string(`social-slot-${i}`);
            row.set_selected(Math.max(0, SOCIAL_PRESETS.findIndex(p => p.id === currentId)));

            row.connect('notify::selected', () => {
                const chosen = SOCIAL_PRESETS[row.get_selected()] ?? SOCIAL_PRESETS[0];
                settings.set_string(`social-slot-${i}`, chosen.id);
                updateConditionalRows();
            });
            socialGroup.add(row);
        }

        updateConditionalRows();
        socialGroup.add(mastodonRow);
        socialGroup.add(customSocialRow);

        const cleanSocialRow = new Adw.SwitchRow({
            title: _('Clean text before posting'),
            subtitle: _('Apply active empty-line and continuous-text rules first'),
        });
        settings.bind('social-clean-first', cleanSocialRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        socialGroup.add(cleanSocialRow);
    }

    _buildLocalAppsGroup(page, window, settings) {
        const appsGroup = new Adw.PreferencesGroup({
            title: _('Local Applications'),
            description: _('Choose up to three favorite applications to open with cleaned clipboard text.'),
        });
        page.add(appsGroup);

        for (let i = 1; i <= 3; i++) {
            const key = `app-slot-${i}`;
            const row = new Adw.ActionRow({ title: _(`Application ${i}`) });

            const updateSubtitle = () => {
                const desktopId = settings.get_string(key).trim();
                if (!desktopId) {
                    row.set_subtitle(_('Not set'));
                    return;
                }
                const info = Gio.DesktopAppInfo.new(desktopId);
                row.set_subtitle(info ? `${info.get_display_name()} (${desktopId})` : desktopId);
            };
            updateSubtitle();

            const chooseBtn = new Gtk.Button({ label: _('Choose...'), valign: Gtk.Align.CENTER });
            chooseBtn.connect('clicked', () => {
                this._openAppPickerDialog(window, (appId) => {
                    settings.set_string(key, appId);
                    updateSubtitle();
                });
            });

            const clearBtn = new Gtk.Button({
                icon_name: 'edit-clear-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: _('Clear application slot'),
            });
            clearBtn.connect('clicked', () => {
                settings.set_string(key, '');
                updateSubtitle();
            });

            row.add_suffix(chooseBtn);
            row.add_suffix(clearBtn);
            appsGroup.add(row);
        }

        const passFileRow = new Adw.SwitchRow({
            title: _('Pass temporary .txt file argument'),
            subtitle: _('Off: Copy cleaned text and press Ctrl+V in app  |  On: Pass temporary .txt file path'),
        });
        settings.bind('app-pass-file', passFileRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appsGroup.add(passFileRow);

        const cleanAppRow = new Adw.SwitchRow({
            title: _('Clean text before launching app'),
            subtitle: _('Apply active empty-line and continuous-text rules first'),
        });
        settings.bind('app-clean-first', cleanAppRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appsGroup.add(cleanAppRow);
    }

    _openAppPickerDialog(parentWindow, onSelected) {
        const dialog = new Adw.Window({
            title: _('Select Application'),
            transient_for: parentWindow,
            modal: true,
            default_width: 420,
            default_height: 520,
        });

        const toolbarView = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar();
        toolbarView.add_top_bar(headerBar);

        const searchEntry = new Gtk.SearchEntry({
            placeholder_text: _('Search applications...'),
            margin_start: 12,
            margin_end: 12,
            margin_top: 8,
            margin_bottom: 8,
        });
        toolbarView.add_top_bar(searchEntry);

        const listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
            margin_start: 12,
            margin_end: 12,
            margin_top: 6,
            margin_bottom: 12,
        });

        const seenIds = new Set();
        const apps = Gio.AppInfo.get_all()
            .filter(app => {
                const id = app.get_id();
                if (!id || !app.should_show() || seenIds.has(id))
                    return false;
                seenIds.add(id);
                return true;
            })
            .sort((a, b) => a.get_display_name().localeCompare(b.get_display_name()));

        for (const app of apps) {
            const row = new Adw.ActionRow({
                title: app.get_display_name(),
                subtitle: app.get_id(),
                activatable: true,
            });
            row._searchText = `${app.get_display_name()} ${app.get_id()}`.toLowerCase();

            const icon = app.get_icon();
            const image = icon
                ? Gtk.Image.new_from_gicon(icon)
                : Gtk.Image.new_from_icon_name('application-x-executable');
            image.set_pixel_size(24);
            row.add_prefix(image);

            row.connect('activated', () => {
                onSelected(app.get_id());
                dialog.close();
            });
            listBox.append(row);
        }

        listBox.set_filter_func((row) => {
            const query = searchEntry.get_text().trim().toLowerCase();
            return !query || row._searchText.includes(query);
        });
        searchEntry.connect('search-changed', () => listBox.invalidate_filter());

        const scrolled = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
            child: listBox,
        });
        toolbarView.set_content(scrolled);
        dialog.set_content(toolbarView);
        dialog.present();
    }

    _buildCustomScriptGroup(page, window, settings) {
        const scriptGroup = new Adw.PreferencesGroup({
            title: _('Custom Bash Script'),
            description: _('Run an executable script (e.g. ~/bin/clip2sh) and pipe cleaned clipboard text to its standard input (stdin).'),
        });
        page.add(scriptGroup);

        const scriptRow = new Adw.EntryRow({ title: _('Script command (e.g. ~/bin/ct-append-closed.py -n Notes)') });
        settings.bind('custom-script-path', scriptRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        const browseBtn = new Gtk.Button({
            icon_name: 'document-open-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Select executable script'),
        });
        browseBtn.connect('clicked', () => {
            const dialog = new Gtk.FileDialog({ title: _('Select Executable Script') });
            dialog.open(window, null, (dlg, res) => {
                try {
                    const selectedPath = dlg.open_finish(res)?.get_path();
                    if (selectedPath) {
                        const quoted = selectedPath.includes(' ') ? `"${selectedPath}"` : selectedPath;
                        settings.set_string('custom-script-path', quoted);
                    }
                } catch (e) {}
            });
        });

        scriptRow.add_suffix(browseBtn);
        scriptGroup.add(scriptRow);

        const cleanScriptRow = new Adw.SwitchRow({
            title: _('Clean text before running script'),
            subtitle: _('Apply active empty-line and continuous-text rules before piping to stdin'),
        });
        settings.bind('custom-script-clean-first', cleanScriptRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        scriptGroup.add(cleanScriptRow);
    }

    _buildEmailGroup(page, settings) {
        const emailGroup = new Adw.PreferencesGroup({
            title: _('Email Compose'),
            description: _('Configure defaults for composing an email from clipboard text. Leave subject empty to use the first line.'),
        });
        page.add(emailGroup);

        const recipientRow = new Adw.EntryRow({ title: _('Default Recipient (To)') });
        settings.bind('mailto-recipient', recipientRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        emailGroup.add(recipientRow);

        const subjectRow = new Adw.EntryRow({ title: _('Default Subject (optional)') });
        settings.bind('mailto-subject', subjectRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        emailGroup.add(subjectRow);

        const cleanFirstRow = new Adw.SwitchRow({
            title: _('Clean text before composing'),
            subtitle: _('Apply active empty-line and continuous-text rules first'),
        });
        settings.bind('mailto-clean-first', cleanFirstRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        emailGroup.add(cleanFirstRow);
    }

    _buildWebNoteGroup(page, settings) {
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

        const providerRow = new Adw.ComboRow({ title: _('Note Service'), model: providerModel });
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
    }

    _buildDocumentGroup(page, window, settings, index) {
        const prefix = `doc${index}`;
        const group = new Adw.PreferencesGroup({ title: _(`Document ${index}`) });
        page.add(group);

        const enableRow = new Adw.SwitchRow({ title: _('Enable saving to this document') });
        settings.bind(`${prefix}-enabled`, enableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(enableRow);

        const pathRow = new Adw.EntryRow({ title: _('File path (.txt)') });
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
                    const selectedPath = dlg.open_finish(res)?.get_path();
                    if (selectedPath) {
                        if (selectedPath.toLowerCase().endsWith('.txt')) {
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
                } catch (e) {}
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
