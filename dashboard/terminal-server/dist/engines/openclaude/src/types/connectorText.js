export function isConnectorTextBlock(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'connector_text' in value &&
        typeof value.connector_text === 'string');
}
//# sourceMappingURL=connectorText.js.map