/**
 * Handles the result of a reconnect attempt and returns an appropriate user message
 */
export function handleReconnectResult(result, serverName) {
    switch (result.client.type) {
        case 'connected':
            return {
                message: `Reconnected to ${serverName}.`,
                success: true
            };
        case 'needs-auth':
            return {
                message: `${serverName} requires authentication. Use the 'Authenticate' option.`,
                success: false
            };
        case 'failed':
            return {
                message: `Failed to reconnect to ${serverName}.`,
                success: false
            };
        default:
            return {
                message: `Unknown result when reconnecting to ${serverName}.`,
                success: false
            };
    }
}
/**
 * Handles errors from reconnect attempts
 */
export function handleReconnectError(error, serverName) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error reconnecting to ${serverName}: ${errorMessage}`;
}
//# sourceMappingURL=reconnectHelpers.js.map