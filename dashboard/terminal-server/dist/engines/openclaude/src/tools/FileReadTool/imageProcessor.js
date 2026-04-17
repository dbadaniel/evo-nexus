import { isInBundledMode } from '../../utils/bundledMode.js';
let imageProcessorModule = null;
let imageCreatorModule = null;
/**
 * Error thrown when no image processor is available (e.g., in the open build
 * where sharp and image-processor-napi are stubbed out).
 */
export class ImageProcessorUnavailableError extends Error {
    constructor() {
        super('No image processor available (sharp is not installed)');
        this.name = 'ImageProcessorUnavailableError';
    }
}
export async function getImageProcessor() {
    if (imageProcessorModule) {
        return imageProcessorModule.default;
    }
    if (isInBundledMode()) {
        // Try to load the native image processor first
        try {
            // Use the native image processor module
            const imageProcessor = await import('image-processor-napi');
            if (imageProcessor.__stub) {
                throw new ImageProcessorUnavailableError();
            }
            const sharp = imageProcessor.sharp || imageProcessor.default;
            imageProcessorModule = { default: sharp };
            return sharp;
        }
        catch (e) {
            if (e instanceof ImageProcessorUnavailableError)
                throw e;
            // Fall back to sharp if native module is not available
            // biome-ignore lint/suspicious/noConsole: intentional warning
            console.warn('Native image processor not available, falling back to sharp');
        }
    }
    // Use sharp for non-bundled builds or as fallback.
    // Single structural cast: our SharpFunction is a subset of sharp's actual type surface.
    try {
        const imported = (await import('sharp'));
        if (imported && imported.__stub) {
            throw new ImageProcessorUnavailableError();
        }
        const sharp = unwrapDefault(imported);
        imageProcessorModule = { default: sharp };
        return sharp;
    }
    catch (e) {
        if (e instanceof ImageProcessorUnavailableError)
            throw e;
        throw new ImageProcessorUnavailableError();
    }
}
/**
 * Get image creator for generating new images from scratch.
 * Note: image-processor-napi doesn't support image creation,
 * so this always uses sharp directly.
 */
export async function getImageCreator() {
    if (imageCreatorModule) {
        return imageCreatorModule.default;
    }
    const imported = (await import('sharp'));
    const sharp = unwrapDefault(imported);
    imageCreatorModule = { default: sharp };
    return sharp;
}
function unwrapDefault(mod) {
    return typeof mod === 'function' ? mod : mod.default;
}
//# sourceMappingURL=imageProcessor.js.map