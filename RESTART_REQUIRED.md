# Restart Required

Critical changes have been made to the Electron Main Process and Preload Script to fix the synchronization conflict logging error (`TypeError: this.db.logConflict is not a function`) and the duplicate handler error (`Error: Attempted to register a second handler`).

Please **restart the Electron application** (stop the terminal process and run `npm run desktop:dev` again) for these changes to take effect.

## Changes Made:
1.  **`electron/preload.secure.cjs`**: Exposed `logConflict` and `getConflictHistory` methods to the renderer process.
2.  **`electron/main.cjs`**: Verified IPC handlers for `db:log-conflict` and `db:get-conflict-history` are correctly registered (duplicates removed).

These fixes enable the application to properly log and handle data conflicts that occur when syncing after being offline.
