import { saveGlobalConfig } from '../../utils/config.js';
import { companionUserId, getCompanion, rollWithSeed } from '../../buddy/companion.js';
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js';
const NAME_PREFIXES = [
    'Byte',
    'Echo',
    'Glint',
    'Miso',
    'Nova',
    'Pixel',
    'Rune',
    'Static',
    'Vector',
    'Whisk',
];
const NAME_SUFFIXES = [
    'bean',
    'bit',
    'bud',
    'dot',
    'ling',
    'loop',
    'moss',
    'patch',
    'puff',
    'spark',
];
const PERSONALITIES = [
    'Curious and quietly encouraging',
    'A patient little watcher with strong debugging instincts',
    'Playful, observant, and suspicious of flaky tests',
    'Calm under pressure and fond of clean diffs',
    'A tiny terminal gremlin who likes successful builds',
];
const PET_REACTIONS = [
    'leans into the headpat',
    'does a proud little bounce',
    'emits a content beep',
    'looks delighted',
    'wiggles happily',
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
function titleCase(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function createStoredCompanion() {
    const userId = companionUserId();
    const { bones } = rollWithSeed(`${userId}:buddy`);
    const prefix = pickDeterministic(NAME_PREFIXES, `${userId}:prefix`);
    const suffix = pickDeterministic(NAME_SUFFIXES, `${userId}:suffix`);
    const personality = pickDeterministic(PERSONALITIES, `${userId}:personality`);
    return {
        name: `${prefix}${suffix}`,
        personality: `${personality}.`,
        hatchedAt: Date.now(),
    };
}
function setCompanionReaction(context, reaction, pet = false) {
    context.setAppState(prev => ({
        ...prev,
        companionReaction: reaction,
        companionPetAt: pet ? Date.now() : prev.companionPetAt,
    }));
}
function showHelp(onDone) {
    onDone('Usage: /buddy [status|mute|unmute]\n\nRun /buddy with no args to hatch your companion the first time, then pet it on later runs.', { display: 'system' });
}
export async function call(onDone, context, args) {
    const arg = args?.trim().toLowerCase() ?? '';
    if (COMMON_HELP_ARGS.includes(arg) || arg === '') {
        const existing = getCompanion();
        if (arg !== '' || existing) {
            if (arg !== '') {
                showHelp(onDone);
                return null;
            }
        }
    }
    if (COMMON_HELP_ARGS.includes(arg)) {
        showHelp(onDone);
        return null;
    }
    if (COMMON_INFO_ARGS.includes(arg) || arg === 'status') {
        const companion = getCompanion();
        if (!companion) {
            onDone('No buddy hatched yet. Run /buddy to hatch one.', {
                display: 'system',
            });
            return null;
        }
        onDone(`${companion.name} is your ${titleCase(companion.rarity)} ${companion.species}. ${companion.personality}`, { display: 'system' });
        return null;
    }
    if (arg === 'mute' || arg === 'unmute') {
        const muted = arg === 'mute';
        saveGlobalConfig(current => ({
            ...current,
            companionMuted: muted,
        }));
        if (muted) {
            setCompanionReaction(context, undefined);
        }
        onDone(`Buddy ${muted ? 'muted' : 'unmuted'}.`, { display: 'system' });
        return null;
    }
    if (arg !== '') {
        showHelp(onDone);
        return null;
    }
    let companion = getCompanion();
    if (!companion) {
        const stored = createStoredCompanion();
        saveGlobalConfig(current => ({
            ...current,
            companion: stored,
            companionMuted: false,
        }));
        companion = {
            ...rollWithSeed(`${companionUserId()}:buddy`).bones,
            ...stored,
        };
        setCompanionReaction(context, `${companion.name} the ${companion.species} has hatched.`, true);
        onDone(`${companion.name} the ${companion.species} is now your buddy. Run /buddy again to pet them.`, { display: 'system' });
        return null;
    }
    const reaction = `${companion.name} ${pickDeterministic(PET_REACTIONS, `${Date.now()}:${companion.name}`)}`;
    setCompanionReaction(context, reaction, true);
    onDone(undefined, { display: 'skip' });
    return null;
}
//# sourceMappingURL=buddy.js.map