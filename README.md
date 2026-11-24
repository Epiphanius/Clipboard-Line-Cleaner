# Clipboard Line Cleaner

A lightweight GNOME Shell extension (GNOME 49–51) that automatically cleans copied text in your clipboard, appends or prepends entries to `.txt` files, and provides one-click quick-launch buttons for social media intents, local applications, custom `stdin` scripts, email composition, and web notes.

## Features

- **Automatic & Manual Line Cleaning:**
  - **Remove empty lines:** Strips blank lines and leading line indentation.
  - **Convert to continuous text:** Joins wrapped lines into single paragraphs while repairing hyphenated line breaks (`-`).
  - **1 MB Payload Safeguard:** Automatically skips oversized clipboard contents (> 1 MB) to keep GNOME Shell responsive.
- **Auto-Save to `.txt` Documents (up to 3 slots):**
  - Append or prepend cleaned clipboard text to up to three plain-text files with configurable separators (single newline, blank line, `[YYYY-MM-DD HH:MM:SS]` timestamp, or custom `\n`/`\t` string).
- **Compact Quick-Launch Rows (v12):**
  - **Social Media Presets (up to 3 buttons):** One-click buttons for **Mastodon** (configurable instance URL), **Bluesky**, **X**, **LinkedIn**, **Threads**, or a **Custom URL** template (`{text}`), with character-limit notices.
  - **Local Applications (up to 3 buttons):** Launch favorite `.desktop` applications with cleaned clipboard text ready to paste (`Ctrl+V`) or passed via a private temporary `.txt` file.
  - **Custom Bash Script (`stdin`):** Pipe cleaned clipboard text asynchronously over `stdin` to any executable script (e.g., `~/bin/clip2sh`).
- **Email Compose & Web Note:**
  - Open your default mail client (`mailto:`) with cleaned clipboard text and automatic first-line subject fallback.
  - Copy cleaned text and launch **Google Keep**, **Microsoft OneNote**, or a custom web note URL.

## Configuration

1. Click the **Clipboard Line Cleaner** icon in the GNOME top bar and select **Configure...** (or open settings via the **Extensions** app).
2. **Target Documents:** Configure entry separators and up to three `.txt` document slots (**Append** or **Prepend**).
3. **Integrations:** Configure up to three **Social Media** quick-launch buttons, up to three **Local Applications**, an optional **Custom Bash Script** (`stdin`), **Email Compose** defaults, and your preferred **Web Note** service.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE) for details.
