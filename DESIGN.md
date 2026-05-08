# Design

## Commands available

### Create a file relative to current directory

A command will be available to create a file relative to the current directory:

1. It will prompt for the directory first, defaulting to the directory that the current focused file is found within.
2. It will prompt to a filename.
3. The file will be created and opened.

### Copy the current relative file path, with file numbers

The file path will be copied, with `#L{line_number}` appended.

If a selection is highlighted, it will copy the range `#L{line_number_start}-L{line_number_end}` instead.

### Delete file

Delete the focused file.

### Create a new folder

Create a new folder

1. It will prompt for the parent directory first, defaulting to the directory that the current focused file is found within.
2. Prompt for the name of the folder.
3. create the folder.

### Rename af file

Rename the focused file.

### Insert Markdown Link

A command to insert a markdown link into the active editor:

1. Triggers an autocomplete dropdown of all workspace files.
2. If a markdown file is selected, triggers a second dropdown to select a heading anchor (or no anchor).
3. Inserts a standard markdown link `[text](url)` at the cursor. If text is selected, it uses that text; otherwise, it defaults to the file's basename.
