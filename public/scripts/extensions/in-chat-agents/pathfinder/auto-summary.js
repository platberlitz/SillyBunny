import { getSettings, normalizeAutoSummaryInterval } from './tree-store.js';
import { getActiveTunnelVisionBooks } from './pathfinder-tool-bridge.js';

let autoSummaryCount = 0;

export function initAutoSummary(eventSource, eventTypes) {
    autoSummaryCount = 0;

    eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
        const s = getSettings();
        if (!s.autoSummary) return;
        autoSummaryCount++;
    });

    eventSource.on(eventTypes.MESSAGE_SENT, () => {
        const s = getSettings();
        if (!s.autoSummary) return;
        autoSummaryCount++;
    });
}

export function markAutoSummaryComplete() {
    autoSummaryCount = 0;
}

export function getAutoSummaryCount() {
    return autoSummaryCount;
}

export function resetAutoSummaryCount() {
    autoSummaryCount = 0;
}

export function shouldAutoSummarize() {
    const s = getSettings();
    if (!s.autoSummary) return false;
    if (getActiveTunnelVisionBooks().length === 0) return false;
    const interval = normalizeAutoSummaryInterval(s.autoSummaryInterval);
    return autoSummaryCount >= interval;
}
