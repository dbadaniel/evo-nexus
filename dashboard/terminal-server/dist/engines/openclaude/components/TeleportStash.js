import figures from 'figures';
import React, { useEffect, useState } from 'react';
import { Box, Text } from '../ink.js';
import { logForDebugging } from '../utils/debug.js';
import { getFileStatus, stashToCleanState } from '../utils/git.js';
import { Select } from './CustomSelect/index.js';
import { Dialog } from './design-system/Dialog.js';
import { Spinner } from './Spinner.js';
export function TeleportStash({ onStashAndContinue, onCancel }) {
    const [gitFileStatus, setGitFileStatus] = useState(null);
    const changedFiles = gitFileStatus !== null ? [...gitFileStatus.tracked, ...gitFileStatus.untracked] : [];
    const [loading, setLoading] = useState(true);
    const [stashing, setStashing] = useState(false);
    const [error, setError] = useState(null);
    // Load changed files on mount
    useEffect(() => {
        const loadChangedFiles = async () => {
            try {
                const fileStatus = await getFileStatus();
                setGitFileStatus(fileStatus);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                logForDebugging(`Error getting changed files: ${errorMessage}`, {
                    level: 'error'
                });
                setError('Failed to get changed files');
            }
            finally {
                setLoading(false);
            }
        };
        void loadChangedFiles();
    }, []);
    const handleStash = async () => {
        setStashing(true);
        try {
            logForDebugging('Stashing changes before teleport...');
            const success = await stashToCleanState('Teleport auto-stash');
            if (success) {
                logForDebugging('Successfully stashed changes');
                onStashAndContinue();
            }
            else {
                setError('Failed to stash changes');
            }
        }
        catch (err_0) {
            const errorMessage_0 = err_0 instanceof Error ? err_0.message : String(err_0);
            logForDebugging(`Error stashing changes: ${errorMessage_0}`, {
                level: 'error'
            });
            setError('Failed to stash changes');
        }
        finally {
            setStashing(false);
        }
    };
    const handleSelectChange = (value) => {
        if (value === 'stash') {
            void handleStash();
        }
        else {
            onCancel();
        }
    };
    if (loading) {
        return React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Spinner, null),
                React.createElement(Text, null,
                    " Checking git status",
                    figures.ellipsis)));
    }
    if (error) {
        return React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Text, { bold: true, color: "error" },
                "Error: ",
                error),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true }, "Press "),
                React.createElement(Text, { bold: true }, "Escape"),
                React.createElement(Text, { dimColor: true }, " to cancel")));
    }
    const showFileCount = changedFiles.length > 8;
    return React.createElement(Dialog, { title: "Working Directory Has Changes", onCancel: onCancel },
        React.createElement(Text, null, "Teleport will switch git branches. The following changes were found:"),
        React.createElement(Box, { flexDirection: "column", paddingLeft: 2 }, changedFiles.length > 0 ? showFileCount ? React.createElement(Text, null,
            changedFiles.length,
            " files changed") : changedFiles.map((file, index) => React.createElement(Text, { key: index }, file)) : React.createElement(Text, { dimColor: true }, "No changes detected")),
        React.createElement(Text, null, "Would you like to stash these changes and continue with teleport?"),
        stashing ? React.createElement(Box, null,
            React.createElement(Spinner, null),
            React.createElement(Text, null, " Stashing changes...")) : React.createElement(Select, { options: [{
                    label: 'Stash changes and continue',
                    value: 'stash'
                }, {
                    label: 'Exit',
                    value: 'exit'
                }], onChange: handleSelectChange }));
}
//# sourceMappingURL=TeleportStash.js.map