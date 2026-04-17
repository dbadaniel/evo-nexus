import { c as _c } from "react-compiler-runtime";
import figures from 'figures';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { logEvent } from 'src/services/analytics/index.js';
import { ConfigurableShortcutHint } from '../../components/ConfigurableShortcutHint.js';
import { Byline } from '../../components/design-system/Byline.js';
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js';
// eslint-disable-next-line custom-rules/prefer-use-keybindings -- useInput needed for marketplace-specific u/r shortcuts and y/n confirmation not in keybinding schema
import { Box, Text, useInput } from '../../ink.js';
import { useKeybinding, useKeybindings } from '../../keybindings/useKeybinding.js';
import { count } from '../../utils/array.js';
import { shouldSkipPluginAutoupdate } from '../../utils/config.js';
import { errorMessage } from '../../utils/errors.js';
import { clearAllCaches } from '../../utils/plugins/cacheUtils.js';
import { createPluginId, formatMarketplaceLoadingErrors, getMarketplaceSourceDisplay, loadMarketplacesWithGracefulDegradation } from '../../utils/plugins/marketplaceHelpers.js';
import { loadKnownMarketplacesConfig, refreshMarketplace, removeMarketplaceSource, setMarketplaceAutoUpdate } from '../../utils/plugins/marketplaceManager.js';
import { updatePluginsForMarketplaces } from '../../utils/plugins/pluginAutoupdate.js';
import { loadAllPlugins } from '../../utils/plugins/pluginLoader.js';
import { isMarketplaceAutoUpdate } from '../../utils/plugins/schemas.js';
import { getSettingsForSource, updateSettingsForSource } from '../../utils/settings/settings.js';
import { plural } from '../../utils/stringUtils.js';
export function ManageMarketplaces({ setViewState, error, setError, setResult, exitState, onManageComplete, targetMarketplace, action }) {
    const [marketplaceStates, setMarketplaceStates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [progressMessage, setProgressMessage] = useState(null);
    const [internalView, setInternalView] = useState('list');
    const [selectedMarketplace, setSelectedMarketplace] = useState(null);
    const [detailsMenuIndex, setDetailsMenuIndex] = useState(0);
    const hasAttemptedAutoAction = useRef(false);
    // Load marketplaces and their installed plugins
    useEffect(() => {
        async function loadMarketplaces() {
            try {
                const config = await loadKnownMarketplacesConfig();
                const { enabled, disabled } = await loadAllPlugins();
                const allPlugins = [...enabled, ...disabled];
                // Load marketplaces with graceful degradation
                const { marketplaces, failures } = await loadMarketplacesWithGracefulDegradation(config);
                const states = [];
                for (const { name, config: entry, data: marketplace } of marketplaces) {
                    // Get all plugins installed from this marketplace
                    const installedFromMarketplace = allPlugins.filter(plugin => plugin.source.endsWith(`@${name}`));
                    states.push({
                        name,
                        source: getMarketplaceSourceDisplay(entry.source),
                        lastUpdated: entry.lastUpdated,
                        pluginCount: marketplace?.plugins.length,
                        installedPlugins: installedFromMarketplace,
                        pendingUpdate: false,
                        pendingRemove: false,
                        autoUpdate: isMarketplaceAutoUpdate(name, entry)
                    });
                }
                // Sort: claude-plugin-directory first, then alphabetically
                states.sort((a, b) => {
                    if (a.name === 'claude-plugin-directory')
                        return -1;
                    if (b.name === 'claude-plugin-directory')
                        return 1;
                    return a.name.localeCompare(b.name);
                });
                setMarketplaceStates(states);
                // Handle marketplace loading errors/warnings
                const successCount = count(marketplaces, m => m.data !== null);
                const errorResult = formatMarketplaceLoadingErrors(failures, successCount);
                if (errorResult) {
                    if (errorResult.type === 'warning') {
                        setProcessError(errorResult.message);
                    }
                    else {
                        throw new Error(errorResult.message);
                    }
                }
                // Auto-execute if target and action provided
                if (targetMarketplace && !hasAttemptedAutoAction.current && !error) {
                    hasAttemptedAutoAction.current = true;
                    const targetIndex = states.findIndex(s => s.name === targetMarketplace);
                    if (targetIndex >= 0) {
                        const targetState = states[targetIndex];
                        if (action) {
                            // Mark the action as pending and execute
                            setSelectedIndex(targetIndex + 1); // +1 because "Add Marketplace" is at index 0
                            const newStates = [...states];
                            if (action === 'update') {
                                newStates[targetIndex].pendingUpdate = true;
                            }
                            else if (action === 'remove') {
                                newStates[targetIndex].pendingRemove = true;
                            }
                            setMarketplaceStates(newStates);
                            // Apply the change immediately
                            setTimeout(applyChanges, 100, newStates);
                        }
                        else if (targetState) {
                            // No action - just show the details view for this marketplace
                            setSelectedIndex(targetIndex + 1); // +1 because "Add Marketplace" is at index 0
                            setSelectedMarketplace(targetState);
                            setInternalView('details');
                        }
                    }
                    else if (setError) {
                        setError(`Marketplace not found: ${targetMarketplace}`);
                    }
                }
            }
            catch (err) {
                if (setError) {
                    setError(err instanceof Error ? err.message : 'Failed to load marketplaces');
                }
                setProcessError(err instanceof Error ? err.message : 'Failed to load marketplaces');
            }
            finally {
                setLoading(false);
            }
        }
        void loadMarketplaces();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    }, [targetMarketplace, action, error]);
    // Check if there are any pending changes
    const hasPendingChanges = () => {
        return marketplaceStates.some(state => state.pendingUpdate || state.pendingRemove);
    };
    // Get count of pending operations
    const getPendingCounts = () => {
        const updateCount = count(marketplaceStates, s => s.pendingUpdate);
        const removeCount = count(marketplaceStates, s => s.pendingRemove);
        return {
            updateCount,
            removeCount
        };
    };
    // Apply all pending changes
    const applyChanges = async (states) => {
        const statesToProcess = states || marketplaceStates;
        const wasInDetailsView = internalView === 'details';
        setIsProcessing(true);
        setProcessError(null);
        setSuccessMessage(null);
        setProgressMessage(null);
        try {
            const settings = getSettingsForSource('userSettings');
            let updatedCount = 0;
            let removedCount = 0;
            const refreshedMarketplaces = new Set();
            for (const state of statesToProcess) {
                // Handle remove
                if (state.pendingRemove) {
                    // First uninstall all plugins from this marketplace
                    if (state.installedPlugins && state.installedPlugins.length > 0) {
                        const newEnabledPlugins = {
                            ...settings?.enabledPlugins
                        };
                        for (const plugin of state.installedPlugins) {
                            const pluginId = createPluginId(plugin.name, state.name);
                            // Mark as disabled/uninstalled
                            newEnabledPlugins[pluginId] = false;
                        }
                        updateSettingsForSource('userSettings', {
                            enabledPlugins: newEnabledPlugins
                        });
                    }
                    // Then remove the marketplace
                    await removeMarketplaceSource(state.name);
                    removedCount++;
                    logEvent('tengu_marketplace_removed', {
                        marketplace_name: state.name,
                        plugins_uninstalled: state.installedPlugins?.length || 0
                    });
                    continue;
                }
                // Handle update
                if (state.pendingUpdate) {
                    // Refresh individual marketplace for efficiency with progress reporting
                    await refreshMarketplace(state.name, (message) => {
                        setProgressMessage(message);
                    });
                    updatedCount++;
                    refreshedMarketplaces.add(state.name.toLowerCase());
                    logEvent('tengu_marketplace_updated', {
                        marketplace_name: state.name
                    });
                }
            }
            // After marketplace clones are refreshed, bump installed plugins from
            // those marketplaces to the new version. Without this, the loader's
            // cache-on-miss (copyPluginToVersionedCache) creates the new version
            // dir on the next loadAllPlugins() call, but installed_plugins.json
            // stays on the old version — so cleanupOrphanedPluginVersionsInBackground
            // stamps the NEW dir with .orphaned_at on the next startup. See #29512.
            // updatePluginOp (called inside the helper) is what actually writes
            // installed_plugins.json via updateInstallationPathOnDisk.
            let updatedPluginCount = 0;
            if (refreshedMarketplaces.size > 0) {
                const updatedPluginIds = await updatePluginsForMarketplaces(refreshedMarketplaces);
                updatedPluginCount = updatedPluginIds.length;
            }
            // Clear caches after changes
            clearAllCaches();
            // Call completion callback
            if (onManageComplete) {
                await onManageComplete();
            }
            // Reload marketplace data to show updated timestamps
            const config = await loadKnownMarketplacesConfig();
            const { enabled, disabled } = await loadAllPlugins();
            const allPlugins = [...enabled, ...disabled];
            const { marketplaces } = await loadMarketplacesWithGracefulDegradation(config);
            const newStates = [];
            for (const { name, config: entry, data: marketplace } of marketplaces) {
                const installedFromMarketplace = allPlugins.filter(plugin => plugin.source.endsWith(`@${name}`));
                newStates.push({
                    name,
                    source: getMarketplaceSourceDisplay(entry.source),
                    lastUpdated: entry.lastUpdated,
                    pluginCount: marketplace?.plugins.length,
                    installedPlugins: installedFromMarketplace,
                    pendingUpdate: false,
                    pendingRemove: false,
                    autoUpdate: isMarketplaceAutoUpdate(name, entry)
                });
            }
            // Sort: claude-plugin-directory first, then alphabetically
            newStates.sort((a, b) => {
                if (a.name === 'claude-plugin-directory')
                    return -1;
                if (b.name === 'claude-plugin-directory')
                    return 1;
                return a.name.localeCompare(b.name);
            });
            setMarketplaceStates(newStates);
            // Update selected marketplace reference with fresh data
            if (wasInDetailsView && selectedMarketplace) {
                const updatedMarketplace = newStates.find(s => s.name === selectedMarketplace.name);
                if (updatedMarketplace) {
                    setSelectedMarketplace(updatedMarketplace);
                }
            }
            // Build success message
            const actions = [];
            if (updatedCount > 0) {
                const pluginPart = updatedPluginCount > 0 ? ` (${updatedPluginCount} ${plural(updatedPluginCount, 'plugin')} bumped)` : '';
                actions.push(`Updated ${updatedCount} ${plural(updatedCount, 'marketplace')}${pluginPart}`);
            }
            if (removedCount > 0) {
                actions.push(`Removed ${removedCount} ${plural(removedCount, 'marketplace')}`);
            }
            if (actions.length > 0) {
                const successMsg = `${figures.tick} ${actions.join(', ')}`;
                // If we were in details view, stay there and show success
                if (wasInDetailsView) {
                    setSuccessMessage(successMsg);
                }
                else {
                    // Otherwise show result and exit to menu
                    setResult(successMsg);
                    setTimeout(setViewState, 2000, {
                        type: 'menu'
                    });
                }
            }
            else if (!wasInDetailsView) {
                setViewState({
                    type: 'menu'
                });
            }
        }
        catch (err) {
            const errorMsg = errorMessage(err);
            setProcessError(errorMsg);
            if (setError) {
                setError(errorMsg);
            }
        }
        finally {
            setIsProcessing(false);
            setProgressMessage(null);
        }
    };
    // Handle confirming marketplace removal
    const confirmRemove = async () => {
        if (!selectedMarketplace)
            return;
        // Mark for removal and apply
        const newStates = marketplaceStates.map(state => state.name === selectedMarketplace.name ? {
            ...state,
            pendingRemove: true
        } : state);
        setMarketplaceStates(newStates);
        await applyChanges(newStates);
    };
    // Build menu options for details view
    const buildDetailsMenuOptions = (marketplace) => {
        if (!marketplace)
            return [];
        const options = [{
                label: `Browse plugins (${marketplace.pluginCount ?? 0})`,
                value: 'browse'
            }, {
                label: 'Update marketplace',
                secondaryLabel: marketplace.lastUpdated ? `(last updated ${new Date(marketplace.lastUpdated).toLocaleDateString()})` : undefined,
                value: 'update'
            }];
        // Only show auto-update toggle if auto-updater is not globally disabled
        if (!shouldSkipPluginAutoupdate()) {
            options.push({
                label: marketplace.autoUpdate ? 'Disable auto-update' : 'Enable auto-update',
                value: 'toggle-auto-update'
            });
        }
        options.push({
            label: 'Remove marketplace',
            value: 'remove'
        });
        return options;
    };
    // Handle toggling auto-update for a marketplace
    const handleToggleAutoUpdate = async (marketplace) => {
        const newAutoUpdate = !marketplace.autoUpdate;
        try {
            await setMarketplaceAutoUpdate(marketplace.name, newAutoUpdate);
            // Update local state
            setMarketplaceStates(prev => prev.map(state => state.name === marketplace.name ? {
                ...state,
                autoUpdate: newAutoUpdate
            } : state));
            // Update selected marketplace reference
            setSelectedMarketplace(prev => prev ? {
                ...prev,
                autoUpdate: newAutoUpdate
            } : prev);
        }
        catch (err) {
            setProcessError(err instanceof Error ? err.message : 'Failed to update setting');
        }
    };
    // Escape in details or confirm-remove view - go back to list
    useKeybinding('confirm:no', () => {
        setInternalView('list');
        setDetailsMenuIndex(0);
    }, {
        context: 'Confirmation',
        isActive: !isProcessing && (internalView === 'details' || internalView === 'confirm-remove')
    });
    // Escape in list view with pending changes - clear pending changes
    useKeybinding('confirm:no', () => {
        setMarketplaceStates(prev => prev.map(state => ({
            ...state,
            pendingUpdate: false,
            pendingRemove: false
        })));
        setSelectedIndex(0);
    }, {
        context: 'Confirmation',
        isActive: !isProcessing && internalView === 'list' && hasPendingChanges()
    });
    // Escape in list view without pending changes - exit to parent menu
    useKeybinding('confirm:no', () => {
        setViewState({
            type: 'menu'
        });
    }, {
        context: 'Confirmation',
        isActive: !isProcessing && internalView === 'list' && !hasPendingChanges()
    });
    // List view — navigation (up/down/enter via configurable keybindings)
    useKeybindings({
        'select:previous': () => setSelectedIndex(prev => Math.max(0, prev - 1)),
        'select:next': () => {
            const totalItems = marketplaceStates.length + 1;
            setSelectedIndex(prev => Math.min(totalItems - 1, prev + 1));
        },
        'select:accept': () => {
            const marketplaceIndex = selectedIndex - 1;
            if (selectedIndex === 0) {
                setViewState({
                    type: 'add-marketplace'
                });
            }
            else if (hasPendingChanges()) {
                void applyChanges();
            }
            else {
                const marketplace = marketplaceStates[marketplaceIndex];
                if (marketplace) {
                    setSelectedMarketplace(marketplace);
                    setInternalView('details');
                    setDetailsMenuIndex(0);
                }
            }
        }
    }, {
        context: 'Select',
        isActive: !isProcessing && internalView === 'list'
    });
    // List view — marketplace-specific actions (u/r shortcuts)
    useInput(input => {
        const marketplaceIndex = selectedIndex - 1;
        if ((input === 'u' || input === 'U') && marketplaceIndex >= 0) {
            setMarketplaceStates(prev => prev.map((state, idx) => idx === marketplaceIndex ? {
                ...state,
                pendingUpdate: !state.pendingUpdate,
                pendingRemove: state.pendingUpdate ? state.pendingRemove : false
            } : state));
        }
        else if ((input === 'r' || input === 'R') && marketplaceIndex >= 0) {
            const marketplace = marketplaceStates[marketplaceIndex];
            if (marketplace) {
                setSelectedMarketplace(marketplace);
                setInternalView('confirm-remove');
            }
        }
    }, {
        isActive: !isProcessing && internalView === 'list'
    });
    // Details view — navigation
    useKeybindings({
        'select:previous': () => setDetailsMenuIndex(prev => Math.max(0, prev - 1)),
        'select:next': () => {
            const menuOptions = buildDetailsMenuOptions(selectedMarketplace);
            setDetailsMenuIndex(prev => Math.min(menuOptions.length - 1, prev + 1));
        },
        'select:accept': () => {
            if (!selectedMarketplace)
                return;
            const menuOptions = buildDetailsMenuOptions(selectedMarketplace);
            const selectedOption = menuOptions[detailsMenuIndex];
            if (selectedOption?.value === 'browse') {
                setViewState({
                    type: 'browse-marketplace',
                    targetMarketplace: selectedMarketplace.name
                });
            }
            else if (selectedOption?.value === 'update') {
                const newStates = marketplaceStates.map(state => state.name === selectedMarketplace.name ? {
                    ...state,
                    pendingUpdate: true
                } : state);
                setMarketplaceStates(newStates);
                void applyChanges(newStates);
            }
            else if (selectedOption?.value === 'toggle-auto-update') {
                void handleToggleAutoUpdate(selectedMarketplace);
            }
            else if (selectedOption?.value === 'remove') {
                setInternalView('confirm-remove');
            }
        }
    }, {
        context: 'Select',
        isActive: !isProcessing && internalView === 'details'
    });
    // Confirm-remove view — y/n input
    useInput(input => {
        if (input === 'y' || input === 'Y') {
            void confirmRemove();
        }
        else if (input === 'n' || input === 'N') {
            setInternalView('list');
            setSelectedMarketplace(null);
        }
    }, {
        isActive: !isProcessing && internalView === 'confirm-remove'
    });
    if (loading) {
        return React.createElement(Text, null, "Loading marketplaces\u2026");
    }
    if (marketplaceStates.length === 0) {
        return React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { bold: true }, "Manage marketplaces")),
            React.createElement(Box, { flexDirection: "row", gap: 1 },
                React.createElement(Text, { color: "suggestion" },
                    figures.pointer,
                    " +"),
                React.createElement(Text, { bold: true, color: "suggestion" }, "Add Marketplace")),
            React.createElement(Box, { marginLeft: 3 },
                React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? React.createElement(React.Fragment, null,
                    "Press ",
                    exitState.keyName,
                    " again to go back") : React.createElement(Byline, null,
                    React.createElement(ConfigurableShortcutHint, { action: "select:accept", context: "Select", fallback: "Enter", description: "select" }),
                    React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "go back" })))));
    }
    // Show confirmation dialog
    if (internalView === 'confirm-remove' && selectedMarketplace) {
        const pluginCount = selectedMarketplace.installedPlugins?.length || 0;
        return React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { bold: true, color: "warning" },
                "Remove marketplace ",
                React.createElement(Text, { italic: true }, selectedMarketplace.name),
                "?"),
            React.createElement(Box, { flexDirection: "column" },
                pluginCount > 0 && React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "warning" },
                        "This will also uninstall ",
                        pluginCount,
                        ' ',
                        plural(pluginCount, 'plugin'),
                        " from this marketplace:")),
                selectedMarketplace.installedPlugins && selectedMarketplace.installedPlugins.length > 0 && React.createElement(Box, { flexDirection: "column", marginTop: 1, marginLeft: 2 }, selectedMarketplace.installedPlugins.map(plugin => React.createElement(Text, { key: plugin.name, dimColor: true },
                    "\u2022 ",
                    plugin.name))),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, null,
                        "Press ",
                        React.createElement(Text, { bold: true }, "y"),
                        " to confirm or ",
                        React.createElement(Text, { bold: true }, "n"),
                        " to cancel"))));
    }
    // Show marketplace details
    if (internalView === 'details' && selectedMarketplace) {
        // Check if this marketplace is currently being processed
        // Check pendingUpdate first so we show updating state immediately when user presses Enter
        const isUpdating = selectedMarketplace.pendingUpdate || isProcessing;
        const menuOptions = buildDetailsMenuOptions(selectedMarketplace);
        return React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { bold: true }, selectedMarketplace.name),
            React.createElement(Text, { dimColor: true }, selectedMarketplace.source),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null,
                    selectedMarketplace.pluginCount || 0,
                    " available",
                    ' ',
                    plural(selectedMarketplace.pluginCount || 0, 'plugin'))),
            selectedMarketplace.installedPlugins && selectedMarketplace.installedPlugins.length > 0 && React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                React.createElement(Text, { bold: true },
                    "Installed plugins (",
                    selectedMarketplace.installedPlugins.length,
                    "):"),
                React.createElement(Box, { flexDirection: "column", marginLeft: 1 }, selectedMarketplace.installedPlugins.map(plugin => React.createElement(Box, { key: plugin.name, flexDirection: "row", gap: 1 },
                    React.createElement(Text, null, figures.bullet),
                    React.createElement(Box, { flexDirection: "column" },
                        React.createElement(Text, null, plugin.name),
                        React.createElement(Text, { dimColor: true }, plugin.manifest.description)))))),
            isUpdating && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { color: "claude" }, "Updating marketplace\u2026"),
                progressMessage && React.createElement(Text, { dimColor: true }, progressMessage)),
            !isUpdating && successMessage && React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "claude" }, successMessage)),
            !isUpdating && processError && React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "error" }, processError)),
            !isUpdating && React.createElement(Box, { flexDirection: "column", marginTop: 1 }, menuOptions.map((option, idx) => {
                if (!option)
                    return null;
                const isSelected = idx === detailsMenuIndex;
                return React.createElement(Box, { key: option.value },
                    React.createElement(Text, { color: isSelected ? 'suggestion' : undefined },
                        isSelected ? figures.pointer : ' ',
                        " ",
                        option.label),
                    option.secondaryLabel && React.createElement(Text, { dimColor: true },
                        " ",
                        option.secondaryLabel));
            })),
            !isUpdating && !shouldSkipPluginAutoupdate() && selectedMarketplace.autoUpdate && React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true }, "Auto-update enabled. Claude Code will automatically update this marketplace and its installed plugins.")),
            React.createElement(Box, { marginLeft: 3 },
                React.createElement(Text, { dimColor: true, italic: true }, isUpdating ? React.createElement(React.Fragment, null, "Please wait\u2026") : React.createElement(Byline, null,
                    React.createElement(ConfigurableShortcutHint, { action: "select:accept", context: "Select", fallback: "Enter", description: "select" }),
                    React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: "go back" })))));
    }
    // Show marketplace list
    const { updateCount, removeCount } = getPendingCounts();
    return React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { bold: true }, "Manage marketplaces")),
        React.createElement(Box, { flexDirection: "row", gap: 1, marginBottom: 1 },
            React.createElement(Text, { color: selectedIndex === 0 ? 'suggestion' : undefined },
                selectedIndex === 0 ? figures.pointer : ' ',
                " +"),
            React.createElement(Text, { bold: true, color: selectedIndex === 0 ? 'suggestion' : undefined }, "Add Marketplace")),
        React.createElement(Box, { flexDirection: "column" }, marketplaceStates.map((state, idx) => {
            const isSelected = idx + 1 === selectedIndex; // +1 because Add Marketplace is at index 0
            // Build status indicators
            const indicators = [];
            if (state.pendingUpdate)
                indicators.push('UPDATE');
            if (state.pendingRemove)
                indicators.push('REMOVE');
            return React.createElement(Box, { key: state.name, flexDirection: "row", gap: 1, marginBottom: 1 },
                React.createElement(Text, { color: isSelected ? 'suggestion' : undefined },
                    isSelected ? figures.pointer : ' ',
                    ' ',
                    state.pendingRemove ? figures.cross : figures.bullet),
                React.createElement(Box, { flexDirection: "column", flexGrow: 1 },
                    React.createElement(Box, { flexDirection: "row", gap: 1 },
                        React.createElement(Text, { bold: true, strikethrough: state.pendingRemove, dimColor: state.pendingRemove },
                            state.name === 'claude-plugins-official' && React.createElement(Text, { color: "claude" }, "\u273B "),
                            state.name,
                            state.name === 'claude-plugins-official' && React.createElement(Text, { color: "claude" }, " \u273B")),
                        indicators.length > 0 && React.createElement(Text, { color: "warning" },
                            "[",
                            indicators.join(', '),
                            "]")),
                    React.createElement(Text, { dimColor: true }, state.source),
                    React.createElement(Text, { dimColor: true },
                        state.pluginCount !== undefined && React.createElement(React.Fragment, null,
                            state.pluginCount,
                            " available"),
                        state.installedPlugins && state.installedPlugins.length > 0 && React.createElement(React.Fragment, null,
                            " \u2022 ",
                            state.installedPlugins.length,
                            " installed"),
                        state.lastUpdated && React.createElement(React.Fragment, null,
                            ' ',
                            "\u2022 Updated",
                            ' ',
                            new Date(state.lastUpdated).toLocaleDateString()))));
        })),
        hasPendingChanges() && React.createElement(Box, { marginTop: 1, flexDirection: "column" },
            React.createElement(Text, null,
                React.createElement(Text, { bold: true }, "Pending changes:"),
                ' ',
                React.createElement(Text, { dimColor: true }, "Enter to apply")),
            updateCount > 0 && React.createElement(Text, null,
                "\u2022 Update ",
                updateCount,
                " ",
                plural(updateCount, 'marketplace')),
            removeCount > 0 && React.createElement(Text, { color: "warning" },
                "\u2022 Remove ",
                removeCount,
                " ",
                plural(removeCount, 'marketplace'))),
        isProcessing && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "claude" }, "Processing changes\u2026")),
        processError && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "error" }, processError)),
        React.createElement(ManageMarketplacesKeyHints, { exitState: exitState, hasPendingActions: hasPendingChanges() }));
}
function ManageMarketplacesKeyHints(t0) {
    const $ = _c(18);
    const { exitState, hasPendingActions } = t0;
    if (exitState.pending) {
        let t1;
        if ($[0] !== exitState.keyName) {
            t1 = React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true, italic: true },
                    "Press ",
                    exitState.keyName,
                    " again to go back"));
            $[0] = exitState.keyName;
            $[1] = t1;
        }
        else {
            t1 = $[1];
        }
        return t1;
    }
    let t1;
    if ($[2] !== hasPendingActions) {
        t1 = hasPendingActions && React.createElement(ConfigurableShortcutHint, { action: "select:accept", context: "Select", fallback: "Enter", description: "apply changes" });
        $[2] = hasPendingActions;
        $[3] = t1;
    }
    else {
        t1 = $[3];
    }
    let t2;
    if ($[4] !== hasPendingActions) {
        t2 = !hasPendingActions && React.createElement(ConfigurableShortcutHint, { action: "select:accept", context: "Select", fallback: "Enter", description: "select" });
        $[4] = hasPendingActions;
        $[5] = t2;
    }
    else {
        t2 = $[5];
    }
    let t3;
    if ($[6] !== hasPendingActions) {
        t3 = !hasPendingActions && React.createElement(KeyboardShortcutHint, { shortcut: "u", action: "update" });
        $[6] = hasPendingActions;
        $[7] = t3;
    }
    else {
        t3 = $[7];
    }
    let t4;
    if ($[8] !== hasPendingActions) {
        t4 = !hasPendingActions && React.createElement(KeyboardShortcutHint, { shortcut: "r", action: "remove" });
        $[8] = hasPendingActions;
        $[9] = t4;
    }
    else {
        t4 = $[9];
    }
    const t5 = hasPendingActions ? "cancel" : "go back";
    let t6;
    if ($[10] !== t5) {
        t6 = React.createElement(ConfigurableShortcutHint, { action: "confirm:no", context: "Confirmation", fallback: "Esc", description: t5 });
        $[10] = t5;
        $[11] = t6;
    }
    else {
        t6 = $[11];
    }
    let t7;
    if ($[12] !== t1 || $[13] !== t2 || $[14] !== t3 || $[15] !== t4 || $[16] !== t6) {
        t7 = React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true, italic: true },
                React.createElement(Byline, null,
                    t1,
                    t2,
                    t3,
                    t4,
                    t6)));
        $[12] = t1;
        $[13] = t2;
        $[14] = t3;
        $[15] = t4;
        $[16] = t6;
        $[17] = t7;
    }
    else {
        t7 = $[17];
    }
    return t7;
}
//# sourceMappingURL=ManageMarketplaces.js.map