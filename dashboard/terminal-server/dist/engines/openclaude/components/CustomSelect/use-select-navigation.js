import { useCallback, useEffect, useMemo, useReducer, useRef, useState, } from 'react';
import OptionMap from './option-map.js';
/**
 * Compare two option arrays for structural equality on properties that
 * affect navigation behavior. ReactNode `label` and function `onChange`
 * are intentionally excluded — they are identity-unstable (new reference
 * each render) but don't change navigation semantics.
 */
export function optionsNavigateEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const ao = a[i];
        const bo = b[i];
        if (ao.value !== bo.value ||
            ao.disabled !== bo.disabled ||
            ao.type !== bo.type) {
            return false;
        }
    }
    return true;
}
const reducer = (state, action) => {
    switch (action.type) {
        case 'focus-next-option': {
            if (state.focusedValue === undefined) {
                return state;
            }
            const item = state.optionMap.get(state.focusedValue);
            if (!item) {
                return state;
            }
            // If there's a next item in the list, go to it
            if (item.next) {
                const needsToScroll = item.next.index >= state.visibleToIndex;
                if (!needsToScroll) {
                    return {
                        ...state,
                        focusedValue: item.next.value,
                    };
                }
                const nextVisibleToIndex = Math.min(state.optionMap.size, state.visibleToIndex + 1);
                const nextVisibleFromIndex = nextVisibleToIndex - state.visibleOptionCount;
                return {
                    ...state,
                    focusedValue: item.next.value,
                    visibleFromIndex: nextVisibleFromIndex,
                    visibleToIndex: nextVisibleToIndex,
                };
            }
            // No next item - wrap to first item
            const firstItem = state.optionMap.first;
            if (!firstItem) {
                return state;
            }
            // When wrapping to first, reset viewport to start
            return {
                ...state,
                focusedValue: firstItem.value,
                visibleFromIndex: 0,
                visibleToIndex: state.visibleOptionCount,
            };
        }
        case 'focus-previous-option': {
            if (state.focusedValue === undefined) {
                return state;
            }
            const item = state.optionMap.get(state.focusedValue);
            if (!item) {
                return state;
            }
            // If there's a previous item in the list, go to it
            if (item.previous) {
                const needsToScroll = item.previous.index < state.visibleFromIndex;
                if (!needsToScroll) {
                    return {
                        ...state,
                        focusedValue: item.previous.value,
                    };
                }
                const nextVisibleFromIndex = Math.max(0, state.visibleFromIndex - 1);
                const nextVisibleToIndex = nextVisibleFromIndex + state.visibleOptionCount;
                return {
                    ...state,
                    focusedValue: item.previous.value,
                    visibleFromIndex: nextVisibleFromIndex,
                    visibleToIndex: nextVisibleToIndex,
                };
            }
            // No previous item - wrap to last item
            const lastItem = state.optionMap.last;
            if (!lastItem) {
                return state;
            }
            // When wrapping to last, reset viewport to end
            const nextVisibleToIndex = state.optionMap.size;
            const nextVisibleFromIndex = Math.max(0, nextVisibleToIndex - state.visibleOptionCount);
            return {
                ...state,
                focusedValue: lastItem.value,
                visibleFromIndex: nextVisibleFromIndex,
                visibleToIndex: nextVisibleToIndex,
            };
        }
        case 'focus-next-page': {
            if (state.focusedValue === undefined) {
                return state;
            }
            const item = state.optionMap.get(state.focusedValue);
            if (!item) {
                return state;
            }
            // Move by a full page (visibleOptionCount items)
            const targetIndex = Math.min(state.optionMap.size - 1, item.index + state.visibleOptionCount);
            // Find the item at the target index
            let targetItem = state.optionMap.first;
            while (targetItem && targetItem.index < targetIndex) {
                if (targetItem.next) {
                    targetItem = targetItem.next;
                }
                else {
                    break;
                }
            }
            if (!targetItem) {
                return state;
            }
            // Update the visible range to include the new focused item
            const nextVisibleToIndex = Math.min(state.optionMap.size, targetItem.index + 1);
            const nextVisibleFromIndex = Math.max(0, nextVisibleToIndex - state.visibleOptionCount);
            return {
                ...state,
                focusedValue: targetItem.value,
                visibleFromIndex: nextVisibleFromIndex,
                visibleToIndex: nextVisibleToIndex,
            };
        }
        case 'focus-previous-page': {
            if (state.focusedValue === undefined) {
                return state;
            }
            const item = state.optionMap.get(state.focusedValue);
            if (!item) {
                return state;
            }
            // Move by a full page (visibleOptionCount items)
            const targetIndex = Math.max(0, item.index - state.visibleOptionCount);
            // Find the item at the target index
            let targetItem = state.optionMap.first;
            while (targetItem && targetItem.index < targetIndex) {
                if (targetItem.next) {
                    targetItem = targetItem.next;
                }
                else {
                    break;
                }
            }
            if (!targetItem) {
                return state;
            }
            // Update the visible range to include the new focused item
            const nextVisibleFromIndex = Math.max(0, targetItem.index);
            const nextVisibleToIndex = Math.min(state.optionMap.size, nextVisibleFromIndex + state.visibleOptionCount);
            return {
                ...state,
                focusedValue: targetItem.value,
                visibleFromIndex: nextVisibleFromIndex,
                visibleToIndex: nextVisibleToIndex,
            };
        }
        case 'reset': {
            return action.state;
        }
        case 'set-focus': {
            // Early return if already focused on this value
            if (state.focusedValue === action.value) {
                return state;
            }
            const item = state.optionMap.get(action.value);
            if (!item) {
                return state;
            }
            // Check if the item is already in view
            if (item.index >= state.visibleFromIndex &&
                item.index < state.visibleToIndex) {
                // Already visible, just update focus
                return {
                    ...state,
                    focusedValue: action.value,
                };
            }
            // Need to scroll to make the item visible
            // Scroll as little as possible - put item at edge of viewport
            let nextVisibleFromIndex;
            let nextVisibleToIndex;
            if (item.index < state.visibleFromIndex) {
                // Item is above viewport - scroll up to put it at the top
                nextVisibleFromIndex = item.index;
                nextVisibleToIndex = Math.min(state.optionMap.size, nextVisibleFromIndex + state.visibleOptionCount);
            }
            else {
                // Item is below viewport - scroll down to put it at the bottom
                nextVisibleToIndex = Math.min(state.optionMap.size, item.index + 1);
                nextVisibleFromIndex = Math.max(0, nextVisibleToIndex - state.visibleOptionCount);
            }
            return {
                ...state,
                focusedValue: action.value,
                visibleFromIndex: nextVisibleFromIndex,
                visibleToIndex: nextVisibleToIndex,
            };
        }
    }
};
const createDefaultState = ({ visibleOptionCount: customVisibleOptionCount, options, initialFocusValue, currentViewport, }) => {
    const visibleOptionCount = typeof customVisibleOptionCount === 'number'
        ? Math.min(customVisibleOptionCount, options.length)
        : options.length;
    const optionMap = new OptionMap(options);
    const focusedItem = initialFocusValue !== undefined && optionMap.get(initialFocusValue);
    const focusedValue = focusedItem ? initialFocusValue : optionMap.first?.value;
    let visibleFromIndex = 0;
    let visibleToIndex = visibleOptionCount;
    // When there's a valid focused item, adjust viewport to show it
    if (focusedItem) {
        const focusedIndex = focusedItem.index;
        if (currentViewport) {
            // If focused item is already in the current viewport range, try to preserve it
            if (focusedIndex >= currentViewport.visibleFromIndex &&
                focusedIndex < currentViewport.visibleToIndex) {
                // Keep the same viewport if it's valid
                visibleFromIndex = currentViewport.visibleFromIndex;
                visibleToIndex = Math.min(optionMap.size, currentViewport.visibleToIndex);
            }
            else {
                // Need to adjust viewport to show focused item
                // Use minimal scrolling - put item at edge of viewport
                if (focusedIndex < currentViewport.visibleFromIndex) {
                    // Item is above current viewport - scroll up to put it at the top
                    visibleFromIndex = focusedIndex;
                    visibleToIndex = Math.min(optionMap.size, visibleFromIndex + visibleOptionCount);
                }
                else {
                    // Item is below current viewport - scroll down to put it at the bottom
                    visibleToIndex = Math.min(optionMap.size, focusedIndex + 1);
                    visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
                }
            }
        }
        else if (focusedIndex >= visibleOptionCount) {
            // No current viewport but focused item is outside default viewport
            // Scroll to show the focused item at the bottom of the viewport
            visibleToIndex = Math.min(optionMap.size, focusedIndex + 1);
            visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
        }
        // Ensure viewport bounds are valid
        visibleFromIndex = Math.max(0, Math.min(visibleFromIndex, optionMap.size - 1));
        visibleToIndex = Math.min(optionMap.size, Math.max(visibleOptionCount, visibleToIndex));
    }
    return {
        optionMap,
        visibleOptionCount,
        focusedValue,
        visibleFromIndex,
        visibleToIndex,
    };
};
export function useSelectNavigation({ visibleOptionCount = 5, options, initialFocusValue, onFocus, focusValue, }) {
    const [state, dispatch] = useReducer((reducer), {
        visibleOptionCount,
        options,
        initialFocusValue: focusValue || initialFocusValue,
    }, (createDefaultState));
    // Store onFocus in a ref to avoid re-running useEffect when callback changes
    const onFocusRef = useRef(onFocus);
    onFocusRef.current = onFocus;
    const [lastOptions, setLastOptions] = useState(options);
    if (options !== lastOptions && !optionsNavigateEqual(options, lastOptions)) {
        dispatch({
            type: 'reset',
            state: createDefaultState({
                visibleOptionCount,
                options,
                initialFocusValue: focusValue ?? state.focusedValue ?? initialFocusValue,
                currentViewport: {
                    visibleFromIndex: state.visibleFromIndex,
                    visibleToIndex: state.visibleToIndex,
                },
            }),
        });
        setLastOptions(options);
    }
    const focusNextOption = useCallback(() => {
        dispatch({
            type: 'focus-next-option',
        });
    }, []);
    const focusPreviousOption = useCallback(() => {
        dispatch({
            type: 'focus-previous-option',
        });
    }, []);
    const focusNextPage = useCallback(() => {
        dispatch({
            type: 'focus-next-page',
        });
    }, []);
    const focusPreviousPage = useCallback(() => {
        dispatch({
            type: 'focus-previous-page',
        });
    }, []);
    const focusOption = useCallback((value) => {
        if (value !== undefined) {
            dispatch({
                type: 'set-focus',
                value,
            });
        }
    }, []);
    const visibleOptions = useMemo(() => {
        return options
            .map((option, index) => ({
            ...option,
            index,
        }))
            .slice(state.visibleFromIndex, state.visibleToIndex);
    }, [options, state.visibleFromIndex, state.visibleToIndex]);
    // Validate that focusedValue exists in current options.
    // This handles the case where options change during render but the reset
    // action hasn't been processed yet - without this, the cursor would disappear
    // because focusedValue points to an option that no longer exists.
    const validatedFocusedValue = useMemo(() => {
        if (state.focusedValue === undefined) {
            return undefined;
        }
        const exists = options.some(opt => opt.value === state.focusedValue);
        if (exists) {
            return state.focusedValue;
        }
        // Fall back to first option if focused value doesn't exist
        return options[0]?.value;
    }, [state.focusedValue, options]);
    const isInInput = useMemo(() => {
        const focusedOption = options.find(opt => opt.value === validatedFocusedValue);
        return focusedOption?.type === 'input';
    }, [validatedFocusedValue, options]);
    // Call onFocus with the validated value (what's actually displayed),
    // not the internal state value which may be stale if options changed.
    // Use ref to avoid re-running when callback reference changes.
    useEffect(() => {
        if (validatedFocusedValue !== undefined) {
            onFocusRef.current?.(validatedFocusedValue);
        }
    }, [validatedFocusedValue]);
    // Allow parent to programmatically set focus via focusValue prop
    useEffect(() => {
        if (focusValue !== undefined) {
            dispatch({
                type: 'set-focus',
                value: focusValue,
            });
        }
    }, [focusValue]);
    // Compute 1-based focused index for scroll position display
    const focusedIndex = useMemo(() => {
        if (validatedFocusedValue === undefined) {
            return 0;
        }
        const index = options.findIndex(opt => opt.value === validatedFocusedValue);
        return index >= 0 ? index + 1 : 0;
    }, [validatedFocusedValue, options]);
    return {
        focusedValue: validatedFocusedValue,
        focusedIndex,
        visibleFromIndex: state.visibleFromIndex,
        visibleToIndex: state.visibleToIndex,
        visibleOptions,
        isInInput: isInInput ?? false,
        focusNextOption,
        focusPreviousOption,
        focusNextPage,
        focusPreviousPage,
        focusOption,
        options,
    };
}
//# sourceMappingURL=use-select-navigation.js.map