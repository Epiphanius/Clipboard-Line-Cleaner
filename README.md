# Clipboard Line Cleaner v8
## What's New in v8

Sorry, but this version was rejected for this reason: "JustPerfection: EGO-X-004, mentioned by Shexli, needs to be fixed.' We, that is, my AI with me, the intermediary :). I do not take this so serious yet. Some more of her words:
EGO-X-004 in shexli (the official Extensions.gnome.org static linter) is triggered by synchronous file I/O on the main GNOME Shell thread — specifically file.query_exists(null), file.load_contents(null), and file.replace_contents(...) inside _saveToEnabledDocuments() in extension.js. Calling synchronous I/O inside gnome-shell blocks the compositor UI thread, and is rejected during EGO review. 
Now, she says: Replace those three synchronous calls with their asynchronous equivalents (load_contents_async and replace_contents_async), so gnome-shell never blocks when reading or writing your .txt files. … …

This new version is in the que, which currently doesn't seem to be too long.

Clipboard Line Cleaner v8 decouples text-cleaning modes and adds automatic saving to `.txt` files directly from your clipboard.

### Highlights
* **Independent Cleaning Switches:** Renamed the primary toggle to **Remove empty lines** and decoupled **Convert to continuous text** so it works on its own without requiring empty-line removal to be active.
* **Auto-Save to up to 3 `.txt` Files:** Configure up to three target `.txt` documents in Preferences (with a native `.txt` file chooser) and toggle each one on or off directly from the top-bar menu.
* **Prepend or Append:** Choose per document whether new clipboard clips are added to the top or bottom of the file.
* **Custom Entry Separators:** Separate saved clips with a single newline, double newline, timestamp header (`[YYYY-MM-DD HH:MM:SS]`), or a custom text divider (supports `\n` and `\t`).
* **Save Notifications:** Displays a desktop notification confirming which file(s) received new clipboard text.

### Installation
Download `clipboard-line-cleaner@epiphanius.github.io.shell-extension.zip` and install via terminal:
bash
gnome-extensions install --force clipboard-line-cleaner@epiphanius.github.io.shell-extension.zip

# Clipboard Line Cleaner
Automatically removes empty lines and beginning spaces from clipboard text. It is available as a GNOME Shell extension (versions 45+). The latest version, 6, can be found here: [https://extensions.gnome.org/extension/10084/clipboard-line-cleaner/](https://extensions.gnome.org/extension/10084/clipboard-line-cleaner/). An unreviewed version 6 (clipboard-line-cleaner@epiphanius.github.io-03.10.2026.zip) can be found above. The extension now has the option to transform text into continuous text. Hyphenations at the end of a line are removed and words are rejoined. Auto-cleaning is skipped if clipboard text exceeds 1 MB, for example, to prevent the GNOME Shell thread from freezing.
At first glance, the tool may seem rather nonsensical, but it arose from my desire to avoid having to rework the layout of text copies manually. I am considering adding  two input fields for search and replace and output options, but I should first identify a need for these features. Help is welcome!

# Clipboard Line Cleaner
Entfernt automatisch Leerzeilen und führende Leerzeichen aus dem Text in der Zwischenablage. Die Erweiterung ist als GNOME-Shell-Erweiterung (ab Version 45) verfügbar. Die neueste Version 5 finden Sie hier: https://extensions.gnome.org/extension/10084/clipboard-line-cleaner/. Eine noch nicht geprüfte Version 6 (clipboard-line-cleaner@epiphanius.github.io-03.10.2026.zip) ist oben zu finden. Die Erweiterung verfügt nun über die Option, Text in zusammenhängenden Text umzuwandeln. dabei werden Silbentrennungen am Zeilenende entfernt und Wörter wieder zusammengefügt. Die automatische Bereinigung wird übersprungen, wenn der Text in der Zwischenablage beispielsweise 1 MB überschreitet, um ein Einfrieren des GNOME-Shell-Threads zu verhindern.
Auf den ersten Blick mag das Tool eher unsinnig erscheinen, aber es entstand aus meinem Wunsch heraus, das Layout von Textkopien nicht manuell überarbeiten zu müssen. Ich erwäge, zwei Eingabefelder für Suchen und Ersetzen sowie Ausgabeoptionen hinzuzufügen, sollte aber zunächst den Bedarf für diese Funktionen ermitteln. Hilfe ist willkommen!
