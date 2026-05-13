import { extension_settings, getContext } from '../../../extensions.js';
import {
    getCurrentProfile,
    getPresetsForApiType,
    getProfileApiType,
    getProfileList,
    handleSwitching,
} from './presetUtils.js';

const extensionName = 'guided-generations';

let previousImpersonateInput = '';
let lastImpersonateResult = '';

function debugLog(...args) {
    if (extension_settings[extensionName]?.debugMode) {
        console.log(`[${extensionName}][DEBUG]`, ...args);
    }
}

function debugWarn(...args) {
    if (extension_settings[extensionName]?.debugMode) {
        console.warn(`[${extensionName}][DEBUG]`, ...args);
    }
}

function setPreviousImpersonateInput(input) {
    previousImpersonateInput = input ?? '';
}

function getPreviousImpersonateInput() {
    return previousImpersonateInput;
}

function setLastImpersonateResult(result) {
    lastImpersonateResult = result ?? '';
}

function getLastImpersonateResult() {
    return lastImpersonateResult;
}

function isGroupChat() {
    const context = getContext();
    return Boolean(context?.groupId && context?.groups);
}

function applyPromptTemplate(template, input) {
    return String(template ?? '').split('{{input}}').join(input ?? '');
}

export {
    applyPromptTemplate,
    debugLog,
    debugWarn,
    extensionName,
    extension_settings,
    getContext,
    getCurrentProfile,
    getLastImpersonateResult,
    getPresetsForApiType,
    getPreviousImpersonateInput,
    getProfileApiType,
    getProfileList,
    handleSwitching,
    isGroupChat,
    setLastImpersonateResult,
    setPreviousImpersonateInput,
};
