import { createFallbackStorage } from './fallbackStorage.js';
import { macOsKeychainStorage } from './macOsKeychainStorage.js';
import { linuxSecretStorage } from './linuxSecretStorage.js';
import { windowsCredentialStorage } from './windowsCredentialStorage.js';
import { plainTextStorage } from './plainTextStorage.js';
const unavailableSecureStorage = {
    name: 'unavailable-secure-storage',
    read: () => null,
    readAsync: async () => null,
    update: () => ({
        success: false,
        warning: 'Secure storage is unavailable on this platform without plaintext fallback.',
    }),
    delete: () => true,
};
/**
 * Get the appropriate secure storage implementation for the current platform.
 * Prefers native OS vaults (Keychain, libsecret, Credential Locker) with a plaintext fallback.
 */
export function getSecureStorage(options) {
    const allowPlainTextFallback = options?.allowPlainTextFallback ?? true;
    if (process.platform === 'darwin') {
        return allowPlainTextFallback
            ? createFallbackStorage(macOsKeychainStorage, plainTextStorage)
            : macOsKeychainStorage;
    }
    if (process.platform === 'linux') {
        return allowPlainTextFallback
            ? createFallbackStorage(linuxSecretStorage, plainTextStorage)
            : linuxSecretStorage;
    }
    if (process.platform === 'win32') {
        return allowPlainTextFallback
            ? createFallbackStorage(windowsCredentialStorage, plainTextStorage)
            : windowsCredentialStorage;
    }
    return allowPlainTextFallback ? plainTextStorage : unavailableSecureStorage;
}
//# sourceMappingURL=index.js.map