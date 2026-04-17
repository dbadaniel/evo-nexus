// Mock rate limits for testing [internal-only]
// The external build keeps this module as a stable no-op surface so imports
// remain valid without exposing internal-only rate-limit simulation behavior.
// This allows testing various rate limit scenarios without hitting actual limits
//
// WARNING: This is for internal testing/demo purposes only!
// The mock headers may not exactly match the API specification or real-world behavior.
// Always validate against actual API responses before relying on this for production features.
import { setMockBillingAccessOverride } from '../utils/billing.js';
export function setMockHeader(_key, _value) { }
export function addExceededLimit(_type, _hoursFromNow) { }
export function setMockEarlyWarning(_claimAbbrev, _utilization, _hoursFromNow) { }
export function clearMockEarlyWarning() { }
export function setMockRateLimitScenario(_scenario) { }
export function getMockHeaderless429Message() {
    return null;
}
export function getMockHeaders() {
    return null;
}
export function getMockStatus() {
    return 'No mock headers active (using real limits)';
}
export function clearMockHeaders() {
    setMockBillingAccessOverride(null);
}
export function applyMockHeaders(headers) {
    return headers;
}
export function shouldProcessMockLimits() {
    return false;
}
export function getCurrentMockScenario() {
    return null;
}
export function getScenarioDescription(scenario) {
    switch (scenario) {
        case 'normal':
            return 'Normal usage, no limits';
        case 'session-limit-reached':
            return 'Session rate limit exceeded';
        case 'approaching-weekly-limit':
            return 'Approaching weekly aggregate limit';
        case 'weekly-limit-reached':
            return 'Weekly aggregate limit exceeded';
        case 'overage-active':
            return 'Using extra usage (overage active)';
        case 'overage-warning':
            return 'Approaching extra usage limit';
        case 'overage-exhausted':
            return 'Both subscription and extra usage limits exhausted';
        case 'out-of-credits':
            return 'Out of extra usage credits (wallet empty)';
        case 'org-zero-credit-limit':
            return 'Org spend cap is zero (no extra usage budget)';
        case 'org-spend-cap-hit':
            return 'Org spend cap hit for the month';
        case 'member-zero-credit-limit':
            return 'Member limit is zero (admin can allocate more)';
        case 'seat-tier-zero-credit-limit':
            return 'Seat tier limit is zero (admin can allocate more)';
        case 'opus-limit':
            return 'Opus limit reached';
        case 'opus-warning':
            return 'Approaching Opus limit';
        case 'sonnet-limit':
            return 'Sonnet limit reached';
        case 'sonnet-warning':
            return 'Approaching Sonnet limit';
        case 'fast-mode-limit':
            return 'Fast mode rate limit';
        case 'fast-mode-short-limit':
            return 'Fast mode rate limit (short)';
        case 'extra-usage-required':
            return 'Headerless 429: Extra usage required for 1M context';
        case 'clear':
            return 'Clear mock headers (use real limits)';
        default:
            return 'Unknown scenario';
    }
}
export function setMockSubscriptionType(_subscriptionType) { }
export function getMockSubscriptionType() {
    return null;
}
export function shouldUseMockSubscription() {
    return false;
}
export function setMockBillingAccess(_hasAccess) {
    // External build: internal mock billing access overrides are disabled.
}
export function isMockFastModeRateLimitScenario() {
    return false;
}
export function checkMockFastModeRateLimit(_isFastModeActive) {
    return null;
}
//# sourceMappingURL=mockRateLimits.js.map