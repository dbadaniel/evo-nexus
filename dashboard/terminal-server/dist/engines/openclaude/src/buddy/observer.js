import { getGlobalConfig } from '../utils/config.js';
import { getUserMessageText } from '../utils/messages.js';
import { getCompanion } from './companion.js';
const DIRECT_REPLIES = [
    'I am observing.',
    'I am helping from the corner.',
    'I saw that.',
    'Still here.',
    'Watching closely.',
];
const PET_REPLIES = [
    'happy chirp',
    'tiny victory dance',
    'quietly approves',
    'wiggles with joy',
    'looks pleased',
];
function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function pickDeterministic(items, seed) {
    return items[hashString(seed) % items.length];
}
export async function fireCompanionObserver(messages, onReaction) {
    const companion = getCompanion();
    if (!companion || getGlobalConfig().companionMuted)
        return;
    const lastUser = [...messages].reverse().find(msg => msg.type === 'user');
    if (!lastUser)
        return;
    const text = getUserMessageText(lastUser)?.trim();
    if (!text)
        return;
    const lower = text.toLowerCase();
    const companionName = companion.name.toLowerCase();
    if (lower.includes('/buddy')) {
        onReaction(pickDeterministic(PET_REPLIES, text + companion.name));
        return;
    }
    if (lower.includes(companionName) ||
        lower.includes('buddy') ||
        lower.includes('companion')) {
        onReaction(`${companion.name}: ${pickDeterministic(DIRECT_REPLIES, text + companion.personality)}`);
    }
}
//# sourceMappingURL=observer.js.map