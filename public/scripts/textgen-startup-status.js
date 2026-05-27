/**
 * Determines whether a saved Text Completion endpoint should be checked during startup.
 * @param {{ mainApi: string, serverUrl: string }} options Startup connection state
 * @returns {boolean} True when startup should restore Text Completion status
 */
export function shouldRestoreTextGenStatusOnStartup({ mainApi, serverUrl }) {
    return mainApi === 'textgenerationwebui' && typeof serverUrl === 'string' && serverUrl.trim().length > 0;
}
