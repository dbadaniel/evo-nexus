// External build: terminal recording is not available.
// Keep this module as a stable no-op surface so runtime imports stay valid.
export function getRecordFilePath() {
    return null;
}
export function _resetRecordingStateForTesting() { }
export function getSessionRecordingPaths() {
    return [];
}
export async function renameRecordingForSession() { }
export async function flushAsciicastRecorder() { }
export function installAsciicastRecorder() { }
//# sourceMappingURL=asciicast.js.map