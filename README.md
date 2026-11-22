# Clipboard Line Cleaner

Clipboard text options (usable independently or together):
- Remove empty lines from clipboard text.
- Convert lines into continuous text.
- Automatically save clips to up to 3 preselected `.txt` documents.

A lightweight GNOME Shell extension that automatically cleans copied text in your clipboard and optionally saves clips directly to `.txt` files.

## Features

* **Remove Empty Lines:** Automatically strips blank lines and leading line indentation whenever you copy text.
* **Convert to Continuous Text:** Joins broken lines into a single continuous paragraph (including rejoining hyphenated line breaks) — works independently with or without empty-line removal enabled.
* **Auto-Save to `.txt` Documents:** Automatically appends or prepends cleaned clipboard clips to up to **3 configured `.txt` files** simultaneously.
* **Custom Entry Separators:** Choose how saved clips are separated in your target documents:
  * Single newline (`\n`)
  * Double newline (`\n\n`)
  * Timestamp header (`[YYYY-MM-DD HH:MM:SS]`)
  * Custom separator string (supports `\n` and `\t`)
* **Panel Quick Controls:** Toggle line cleaning rules and individual target documents directly from the top-bar menu, or trigger **Clean & save clipboard now** on demand.

## Configuration

1. Click the **Clipboard Line Cleaner** icon in the GNOME top bar and select **Configure .txt documents...** (or open settings via the **Extensions** app).
2. Choose your preferred **Separator style**.
3. For up to three document slots, select a `.txt` file using the file chooser, choose **Append** or **Prepend**, and enable the slot.

## Release Notes — Version 8

* **Decoupled Cleaning Modes:** Renamed the primary toggle to **Remove empty lines** and made **Convert to continuous text** work independently without requiring empty-line removal to be active.
* **Direct `.txt` Document Saving:** Added support for configuring up to three `.txt` files in Preferences (with a native `.txt` file chooser) and toggling them individually from the top-bar menu.
* **Prepend & Append Support:** Added per-document toggles to insert new clips either at the top or bottom of each file.
* **Customizable Separators:** Added options for single newline, double newline, timestamp headers, or custom text separators between saved clips.
* **Save Notifications:** Added desktop notifications confirming which file(s) received new clipboard text.

## Compatibility

* GNOME Shell 49, 50, 51
* License: GPL-2.0-or-later
