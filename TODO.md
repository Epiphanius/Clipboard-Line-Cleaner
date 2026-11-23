# Clipboard Line Cleaner — v12 Roadmap

## 1. UI & Copy Polish
- **Panel Menu Label (`extension.js`):** Rename `_('Configure .txt documents...')` to `_('Configure...')` to reflect that Preferences now covers separators, email compose, web notes, social posts, and `.txt` documents.
- **Documentation (`README.md`):** Update the **Configuration** section to reference **Configure...** and document the social media web intent controls.

## 2. Social Media Web Intent Export
- **GSettings Schema (`schemas/*.gschema.xml`):**
  - `social-provider` (`string`, default `'mastodon'`): Preset selector (`mastodon`, `bluesky`, `x`, `linkedin`, `threads`, `custom`).
  - `social-mastodon-instance` (`string`, default `'https://mastodon.social'`): Base URL for Mastodon/Fediverse `/share?text=` intents.
  - `social-custom-url` (`string`, default `''`): Custom intent URL template supporting a `{text}` placeholder.
  - `social-clean-first` (`boolean`, default `true`): Run active `_cleanText()` rules and update the clipboard before launching the browser.
- **Preferences UI (`prefs.js`):**
  - Add a **Social Media Post** `Adw.PreferencesGroup` with a `ComboRow` platform selector, conditional `EntryRow` fields for Mastodon instance URL and Custom URL, and a `SwitchRow` for cleaning text first.
- **Panel Action & Safeguards (`extension.js`):**
  - Add a manual **Post clipboard to social media** menu item (never auto-triggered on clipboard copy to protect sensitive clips).
  - Enforce the **1 MB payload guard** and check per-platform character limits (280 for X, 300 for Bluesky, 500 for Mastodon/Threads, 3,000 for LinkedIn), notifying if text exceeds the target limit while still copying cleaned text for easy trimming in the browser composer.
  - Launch the encoded web-intent URL via `Gio.AppInfo.launch_default_for_uri`.

## 3. Release Verification
- Compile schemas (`glib-compile-schemas schemas/`), test `gnome-extensions prefs`, verify `shell-version` compatibility, bump `metadata.json` to `12` for the EGO zip build, and restore local `"version": 999`.
