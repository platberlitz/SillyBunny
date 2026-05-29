import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tabsSource = readFileSync(path.join(repoRoot, 'public', 'scripts', 'sillybunny-tabs.js'), 'utf8');

function getFunctionSource(name) {
    const marker = `function ${name}(`;
    const start = tabsSource.indexOf(marker);

    expect(start).toBeGreaterThanOrEqual(0);

    const bodyStart = tabsSource.indexOf('{', start);
    let depth = 0;

    for (let index = bodyStart; index < tabsSource.length; index++) {
        const char = tabsSource[index];
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return tabsSource.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to find function source for ${name}`);
}

describe('mobile shell lifecycle wiring', () => {
    test('imports the mobile shell lifecycle seam into the shell adapter', () => {
        expect(tabsSource).toContain('createMobileShellLifecycle');
        expect(tabsSource).toContain('MOBILE_SHELL_NAV_TOGGLE_ACTION');
        expect(tabsSource).toContain('const sbMobileShellLifecycle = createMobileShellLifecycle();');
    });

    test('routes shell rail drag and scroll decisions through the lifecycle seam', () => {
        const buildShellSource = getFunctionSource('buildShell');

        expect(buildShellSource).toContain('sbMobileShellLifecycle.nav.resolvePageScroll({');
        expect(buildShellSource).toContain('nav.scrollBy(scrollRequest);');
        expect(buildShellSource).toContain('sbMobileShellLifecycle.nav.createDragState({');
        expect(buildShellSource).toContain('sbMobileShellLifecycle.nav.resolveDragMove({');
        expect(buildShellSource).toContain('sbMobileShellLifecycle.nav.resolveDragEnd({');
        expect(buildShellSource).toContain('sbMobileShellLifecycle.nav.shouldSuppressClick({');
        expect(buildShellSource).toContain('sbMobileShellLifecycle.nav.resolveScrollIndicators({');
        expect(buildShellSource).not.toContain('SB_SHELL_NAV_TOUCH_DRAG_THRESHOLD_PX');
        expect(buildShellSource).not.toContain('Date.now() + 350');
    });

    test('routes mobile modal inert decisions through the lifecycle seam', () => {
        const syncMobileModalStateSource = getFunctionSource('syncMobileModalState');

        expect(syncMobileModalStateSource).toContain('sbMobileShellLifecycle.modal.resolveA11yState({');
        expect(syncMobileModalStateSource).toContain('activeRootIds: activeRoots.map(root => root.id)');
        expect(syncMobileModalStateSource).toContain('modalState.hasActiveMobileModal');
        expect(syncMobileModalStateSource).toContain('modalState.shouldInertShell');
        expect(syncMobileModalStateSource).toContain('modalState.shouldInertTopBar');
        expect(syncMobileModalStateSource).not.toContain('activeRoots.some(root => root.id !== \'sb-mobile-nav\')');
    });

    test('routes mobile nav outside-click auto-close through the lifecycle seam', () => {
        const buildMobileNavSource = getFunctionSource('buildMobileNav');

        expect(buildMobileNavSource).toContain('sbMobileShellLifecycle.nav.shouldAutoClose({');
        expect(buildMobileNavSource).toContain('elapsedSinceOpenedMs: performance.now() - sbState.mobileNav.lastOpenedAt');
        expect(buildMobileNavSource).toContain('isHamburgerTarget: Boolean(target.closest(\'#sb-hamburger\'))');
        expect(buildMobileNavSource).toContain('isInsideNav: Boolean(target.closest(\'#sb-mobile-nav\'))');
        expect(buildMobileNavSource).not.toContain('SB_MOBILE_NAV_OPEN_GRACE_MS');
    });

    test('routes mobile nav open-state decisions through the lifecycle seam', () => {
        const setMobileNavOpenStateSource = getFunctionSource('setMobileNavOpenState');

        expect(setMobileNavOpenStateSource).toContain('sbMobileShellLifecycle.nav.resolveOpenState({');
        expect(setMobileNavOpenStateSource).toContain('navState.shouldRecordOpenedAt');
        expect(setMobileNavOpenStateSource).toContain('overlay.hidden = navState.overlayHidden;');
        expect(setMobileNavOpenStateSource).toContain('overlay.setAttribute(\'aria-hidden\', navState.overlayAriaHidden);');
        expect(setMobileNavOpenStateSource).toContain('button.setAttribute(\'aria-expanded\', navState.buttonExpanded);');
        expect(setMobileNavOpenStateSource).toContain('navState.shouldRestoreButtonFocus');
    });

    test('routes hamburger toggle intent through the lifecycle seam', () => {
        const toggleMobileNavSource = getFunctionSource('toggleMobileNav');

        expect(toggleMobileNavSource).toContain('sbMobileShellLifecycle.nav.resolveToggleIntent({');
        expect(toggleMobileNavSource).toContain('toggleIntent.action === MOBILE_SHELL_NAV_TOGGLE_ACTION.ACTIVATE_PAGE_TARGET');
        expect(toggleMobileNavSource).toContain('toggleIntent.shouldCloseCompetingPanels');
        expect(toggleMobileNavSource).toContain('setMobileNavOpenState(toggleIntent.action === MOBILE_SHELL_NAV_TOGGLE_ACTION.OPEN_NAV);');
    });
});
