#!/bin/bash

# Installation script for Clipboard Line Cleaner GNOME Extension

EXTENSION_UUID="clipboard-line-cleaner@example.com"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Installing Clipboard Line Cleaner GNOME Extension..."

# Create extension directory
mkdir -p "$EXTENSION_DIR"
mkdir -p "$EXTENSION_DIR/schemas"

# Check if files exist in current directory
if [ ! -f "metadata.json" ] || [ ! -f "extension.js" ]; then
    echo "Error: Extension files not found in current directory!"
    echo "Please make sure metadata.json, extension.js, prefs.js, and the schema file are in the current directory."
    exit 1
fi

# Copy extension files
cp metadata.json "$EXTENSION_DIR/"
cp extension.js "$EXTENSION_DIR/"
cp prefs.js "$EXTENSION_DIR/"
cp schemas/org.gnome.shell.extensions.clipboard-line-cleaner.gschema.xml "$EXTENSION_DIR/schemas/"

# Compile the schema
echo "Compiling GSettings schema..."
cd "$EXTENSION_DIR"
glib-compile-schemas schemas/

if [ $? -eq 0 ]; then
    echo "Schema compiled successfully!"
else
    echo "Error compiling schema. Please check if glib-compile-schemas is installed."
    exit 1
fi

# Check if extension is already enabled
if gnome-extensions list --enabled | grep -q "$EXTENSION_UUID"; then
    echo "Extension is already enabled. Reloading..."
    gnome-extensions disable "$EXTENSION_UUID"
    sleep 1
    gnome-extensions enable "$EXTENSION_UUID"
else
    echo "Enabling extension..."
    gnome-extensions enable "$EXTENSION_UUID"
fi

echo "Installation complete!"
echo "You may need to restart GNOME Shell (Alt+F2, type 'r', press Enter) or log out and back in."
echo "The extension should appear in your top panel with a clear icon."
