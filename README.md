# Clipboard Line Cleaner

Clipboard text options (usable independently or together):
- Remove empty lines from clipboard text.
- Convert lines into continuous text.
- Automatically save clips to up to 3 preselected `.txt` documents.
- Compose an email or open a web note directly from cleaned clipboard text.

A lightweight GNOME Shell extension that automatically cleans copied text in your clipboard, saves clips to `.txt` files, and exports cleaned clips to your default email client or web note service.

## Features

- **Remove Empty Lines:** Automatically strips blank lines and leading line indentation whenever you copy text.
- **Convert to Continuous Text:** Joins broken lines into a single continuous paragraph (including rejoining hyphenated line breaks) — works independently with or without empty-line removal enabled.
- **Auto-Save to `.txt` Documents:** Automatically appends or prepends cleaned clipboard clips to up to **3 configured `.txt` files** simultaneously.
- **Custom Entry Separators:** Choose how saved clips are separated in your target documents:
  - Single newline (`\n`)
  - Double newline (`\n\n`)
  - Timestamp header (`[YYYY-MM-DD HH:MM:SS]`)
  - Custom separator string (supports `\n` and `\t`)
- **Compose Email from Clipboard (`mailto:`):** Opens your default desktop mail client with cleaned clipboard text in the body, an optional default recipient, and either a fixed subject or the first line of the clipboard text.
- **Send Clipboard to Web Note:** Updates the clipboard with cleaned text so it is ready to paste (`Ctrl+V`) and opens **Google Keep**, **Microsoft OneNote**, or a **Custom URL** in your default browser.
- **1 MB Payload Safeguard:** Automatically skips regex cleaning, document writes, and export actions for clipboard payloads larger than 1 MB to keep GNOME Shell responsive.
- **Panel Quick Controls:** Toggle line cleaning rules and individual target documents directly from the top-bar menu, or trigger **Clean & save clipboard now**, **Compose email from clipboard**, and **Send clipboard to web note** on demand.

## Configuration

1. Click the **Clipboard Line Cleaner** icon in the GNOME top bar and select **Configure...** (or open settings via the **Extensions** app).
2. Choose your preferred **Separator style** and configure up to three `.txt` document slots (**Append** or **Prepend**).
3. Under **Email Compose**, optionally set a **Default Recipient (To)**, a **Default Subject** (leave empty to use the first line of the cleaned text), and whether to clean text before composing.
4. Under **Web Note**, choose **Google Keep**, **Microsoft OneNote**, or **Custom URL**, and whether to clean text before opening the browser.

## Release Notes — Version 11

- **Compose Email from Clipboard:** Added a top-bar menu action and Preferences group to launch your default mail client (`mailto:`) with cleaned clipboard text, optional default recipient, automatic first-line subject fallback, and a 3,500-character URI length safeguard.
- **Send Clipboard to Web Note:** Added a top-bar menu action and Preferences group supporting **Google Keep**, **Microsoft OneNote**, and **Custom URL** targets with automatic clipboard cleaning prior to opening.
- **1 MB Clipboard Safeguard:** Added an early-return size check across automatic monitoring, manual cleaning, email composition, and web note export to prevent stalls on oversized clipboard contents.
- **GNOME Shell 51 Support:** Added GNOME Shell 51 compatibility in `metadata.json`.

## Release Notes — Version 8

- **Decoupled Cleaning Modes:** Renamed the primary toggle to **Remove empty lines** and made **Convert to continuous text** work independently without requiring empty-line removal to be active.
- **Direct `.txt` Document Saving:** Added support for configuring up to three `.txt` files in Preferences (with a native `.txt` file chooser) and toggling them individually from the top-bar menu.
- **Prepend & Append Support:** Added per-document toggles to insert new clips either at the top or bottom of each file.
- **Customizable Separators:** Added options for single newline, double newline, timestamp headers, or custom text separators between saved clips.
- **Save Notifications:** Added desktop notifications confirming which file(s) received new clipboard text.

## Compatibility

- GNOME Shell 49, 50, 51
- License: GPL-2.0-or-later

## Roadmap

Planned features and improvements for the next release are tracked in [TODO.md](TODO.md).
