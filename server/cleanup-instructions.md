# Manual Cleanup Instructions

## Old Database File
- **File to delete:** `F:\Projects\Just-Chat\server\chat.db` (52KB - old file)
- **Reason:** This is the old database file that's no longer being used
- **Current active file:** `F:\Projects\Just-Chat\server\data\chat.db` (36KB - active)

## How to Delete:
1. Close any DB Browser for SQLite sessions
2. Close any running server instances
3. Delete the file manually or run: `Remove-Item chat.db -Force`

## Note:
The file couldn't be automatically deleted because it's currently open in another process (likely DB Browser for SQLite). 