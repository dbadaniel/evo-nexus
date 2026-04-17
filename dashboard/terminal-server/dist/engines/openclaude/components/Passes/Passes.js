import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { TEARDROP_ASTERISK } from '../../constants/figures.js';
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js';
import { setClipboard } from '../../ink/termio/osc.js';
// eslint-disable-next-line custom-rules/prefer-use-keybindings -- enter to copy link
import { Box, Link, Text, useInput } from '../../ink.js';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { logEvent } from '../../services/analytics/index.js';
import { fetchReferralRedemptions, formatCreditAmount, getCachedOrFetchPassesEligibility } from '../../services/api/referral.js';
import { count } from '../../utils/array.js';
import { logError } from '../../utils/log.js';
import { Pane } from '../design-system/Pane.js';
export function Passes({ onDone }) {
    const [loading, setLoading] = useState(true);
    const [passStatuses, setPassStatuses] = useState([]);
    const [isAvailable, setIsAvailable] = useState(false);
    const [referralLink, setReferralLink] = useState(null);
    const [referrerReward, setReferrerReward] = useState(undefined);
    const exitState = useExitOnCtrlCDWithKeybindings(() => onDone('Guest passes dialog dismissed', {
        display: 'system'
    }));
    const handleCancel = useCallback(() => {
        onDone('Guest passes dialog dismissed', {
            display: 'system'
        });
    }, [onDone]);
    useKeybinding('confirm:no', handleCancel, {
        context: 'Confirmation'
    });
    useInput((_input, key) => {
        if (key.return && referralLink) {
            void setClipboard(referralLink).then(raw => {
                if (raw)
                    process.stdout.write(raw);
                logEvent('tengu_guest_passes_link_copied', {});
                onDone(`Referral link copied to clipboard!`);
            });
        }
    });
    useEffect(() => {
        async function loadPassesData() {
            try {
                // Check eligibility first (uses cache if available)
                const eligibilityData = await getCachedOrFetchPassesEligibility();
                if (!eligibilityData || !eligibilityData.eligible) {
                    setIsAvailable(false);
                    setLoading(false);
                    return;
                }
                setIsAvailable(true);
                // Store the referral link if available
                if (eligibilityData.referral_code_details?.referral_link) {
                    setReferralLink(eligibilityData.referral_code_details.referral_link);
                }
                // Store referrer reward info for v1 campaign messaging
                setReferrerReward(eligibilityData.referrer_reward);
                // Use the campaign returned from eligibility for redemptions
                const campaign = eligibilityData.referral_code_details?.campaign ?? 'claude_code_guest_pass';
                // Fetch redemptions data
                let redemptionsData;
                try {
                    redemptionsData = await fetchReferralRedemptions(campaign);
                }
                catch (err_0) {
                    logError(err_0);
                    setIsAvailable(false);
                    setLoading(false);
                    return;
                }
                // Build pass statuses array
                const redemptions = redemptionsData.redemptions || [];
                const maxRedemptions = redemptionsData.limit || 3;
                const statuses = [];
                for (let i = 0; i < maxRedemptions; i++) {
                    const redemption = redemptions[i];
                    statuses.push({
                        passNumber: i + 1,
                        isAvailable: !redemption
                    });
                }
                setPassStatuses(statuses);
                setLoading(false);
            }
            catch (err) {
                // For any error, just show passes as not available
                logError(err);
                setIsAvailable(false);
                setLoading(false);
            }
        }
        void loadPassesData();
    }, []);
    if (loading) {
        return React.createElement(Pane, null,
            React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Text, { dimColor: true }, "Loading guest pass information\u2026"),
                React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? React.createElement(React.Fragment, null,
                    "Press ",
                    exitState.keyName,
                    " again to exit") : React.createElement(React.Fragment, null, "Esc to cancel"))));
    }
    if (!isAvailable) {
        return React.createElement(Pane, null,
            React.createElement(Box, { flexDirection: "column", gap: 1 },
                React.createElement(Text, null, "Guest passes are not currently available."),
                React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? React.createElement(React.Fragment, null,
                    "Press ",
                    exitState.keyName,
                    " again to exit") : React.createElement(React.Fragment, null, "Esc to cancel"))));
    }
    const availableCount = count(passStatuses, p => p.isAvailable);
    // Sort passes: available first, then redeemed
    const sortedPasses = [...passStatuses].sort((a, b) => +b.isAvailable - +a.isAvailable);
    // ASCII art for tickets
    const renderTicket = (pass) => {
        const isRedeemed = !pass.isAvailable;
        if (isRedeemed) {
            // Grayed out redeemed ticket with slashes
            return React.createElement(Box, { key: pass.passNumber, flexDirection: "column", marginRight: 1 },
                React.createElement(Text, { dimColor: true }, '┌─────────╱'),
                React.createElement(Text, { dimColor: true }, ` ) CC ${TEARDROP_ASTERISK} ┊╱`),
                React.createElement(Text, { dimColor: true }, '└───────╱'));
        }
        return React.createElement(Box, { key: pass.passNumber, flexDirection: "column", marginRight: 1 },
            React.createElement(Text, null, '┌──────────┐'),
            React.createElement(Text, null,
                ' ) CC ',
                React.createElement(Text, { color: "claude" }, TEARDROP_ASTERISK),
                ' ┊ ( '),
            React.createElement(Text, null, '└──────────┘'));
    };
    return React.createElement(Pane, null,
        React.createElement(Box, { flexDirection: "column", gap: 1 },
            React.createElement(Text, { color: "permission" },
                "Guest passes \u00B7 ",
                availableCount,
                " left"),
            React.createElement(Box, { flexDirection: "row", marginLeft: 2 }, sortedPasses.slice(0, 3).map(pass_0 => renderTicket(pass_0))),
            referralLink && React.createElement(Box, { marginLeft: 2 },
                React.createElement(Text, null, referralLink)),
            React.createElement(Box, { flexDirection: "column", marginLeft: 2 },
                React.createElement(Text, { dimColor: true },
                    referrerReward ? `Share a free week of Claude Code with friends. If they love it and subscribe, you'll get ${formatCreditAmount(referrerReward)} of extra usage to keep building. ` : 'Share a free week of Claude Code with friends. ',
                    React.createElement(Link, { url: referrerReward ? 'https://support.claude.com/en/articles/13456702-claude-code-guest-passes' : 'https://support.claude.com/en/articles/12875061-claude-code-guest-passes' }, "Terms apply."))),
            React.createElement(Box, null,
                React.createElement(Text, { dimColor: true, italic: true }, exitState.pending ? React.createElement(React.Fragment, null,
                    "Press ",
                    exitState.keyName,
                    " again to exit") : React.createElement(React.Fragment, null, "Enter to copy link \u00B7 Esc to cancel")))));
}
//# sourceMappingURL=Passes.js.map