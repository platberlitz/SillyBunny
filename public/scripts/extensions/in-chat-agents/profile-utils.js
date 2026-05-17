import { getContext } from '../../extensions.js';

export function getConnectionManagerRequestService() {
    try {
        return getContext()?.ConnectionManagerRequestService ?? null;
    } catch {
        return null;
    }
}

export function listConnectionProfiles() {
    const CMRS = getConnectionManagerRequestService();
    if (!CMRS) {
        return [];
    }

    try {
        if (typeof CMRS.getSupportedProfiles === 'function') {
            return CMRS.getSupportedProfiles() ?? [];
        }

        if (typeof CMRS.getProfiles === 'function') {
            return CMRS.getProfiles() ?? [];
        }
    } catch {
        return [];
    }

    return [];
}

export function buildConnectionProfileNameMap() {
    return new Map(
        listConnectionProfiles()
            .map(profile => [profile.id, profile.name || profile.id]),
    );
}

export function getConnectionProfileDisplayName(profileId = '') {
    const normalizedProfileId = String(profileId ?? '').trim();
    if (!normalizedProfileId) {
        return '';
    }

    const connectionProfilesSelect = typeof document === 'undefined' ? null : document.getElementById('connection_profiles');
    if (connectionProfilesSelect instanceof HTMLSelectElement) {
        const matchingOption = Array.from(connectionProfilesSelect.options)
            .find(option => String(option.value ?? '').trim() === normalizedProfileId);
        const optionLabel = String(matchingOption?.textContent ?? '').trim();
        if (optionLabel) {
            return optionLabel;
        }
    }

    const CMRS = getConnectionManagerRequestService();
    if (CMRS && typeof CMRS.getProfile === 'function') {
        try {
            const profile = CMRS.getProfile(normalizedProfileId);
            const profileName = String(profile?.name ?? '').trim();
            if (profileName) {
                return profileName;
            }
        } catch {
            // Fall back to the raw profile id when the profile no longer exists.
        }
    }

    return normalizedProfileId;
}

export function getConnectionProfileModelName(profileId = '') {
    const normalizedProfileId = String(profileId ?? '').trim();
    if (!normalizedProfileId) {
        return '';
    }

    const CMRS = getConnectionManagerRequestService();
    if (!CMRS || typeof CMRS.getProfile !== 'function') {
        return '';
    }

    try {
        return String(CMRS.getProfile(normalizedProfileId)?.model ?? '').trim();
    } catch {
        return '';
    }
}

export function populateConnectionProfileSelect(select, { emptyLabel = 'Use default profile', selectedValue = '' } = {}) {
    if (!(select instanceof HTMLSelectElement)) {
        return;
    }

    const profiles = listConnectionProfiles();
    const resolvedValue = typeof selectedValue === 'string' ? selectedValue : '';
    select.innerHTML = '';

    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = emptyLabel;
    select.appendChild(emptyOption);

    for (const profile of profiles) {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name || profile.id;
        select.appendChild(option);
    }

    if (resolvedValue && !profiles.some(profile => profile.id === resolvedValue)) {
        const missingOption = document.createElement('option');
        missingOption.value = resolvedValue;
        missingOption.textContent = `Missing profile (${resolvedValue})`;
        select.appendChild(missingOption);
    }

    select.value = resolvedValue;
}
