import { describe, expect, test } from '@jest/globals';

import { extractMergedPrNumbers } from '../scripts/update-changelog-merged-prs.js';

describe('update changelog merged PR extraction', () => {
    test('extracts classic merge commit pull request numbers', () => {
        expect(extractMergedPrNumbers('Merge pull request #305 from owner/branch')).toEqual(['305']);
    });

    test('extracts squash merge pull request numbers from commit subjects', () => {
        expect(extractMergedPrNumbers('fix: close release readiness regressions (#306)')).toEqual(['306']);
    });

    test('ignores pull-request-shaped references outside the subject line', () => {
        expect(extractMergedPrNumbers('fix: release polish\n\nRefs cleanup note (#999)')).toEqual([]);
    });

    test('deduplicates pull request numbers found through multiple merge styles', () => {
        expect(extractMergedPrNumbers('Merge pull request #306 from owner/branch\nfix: close release readiness regressions (#306)')).toEqual(['306']);
    });
});
