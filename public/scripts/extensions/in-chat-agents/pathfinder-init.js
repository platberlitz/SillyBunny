import { getSettings, setSettings, isLorebookEnabled, setLorebookEnabled } from './pathfinder/tree-store.js';
import { initEntryManagerAPIs } from './pathfinder/entry-manager.js';
import { initActivityFeed } from './pathfinder/activity-feed.js';
import { initAutoSummary } from './pathfinder/auto-summary.js';
import { initCommands } from './pathfinder/commands.js';
import { getPathfinderToolDefinitions } from './pathfinder/tool-definitions.js';

import { registerActions as registerSearchActions } from './pathfinder/tools/search.js';
import { registerActions as registerRememberActions } from './pathfinder/tools/remember.js';
import { registerActions as registerUpdateActions } from './pathfinder/tools/update.js';
import { registerActions as registerForgetActions } from './pathfinder/tools/forget.js';
import { registerActions as registerSummarizeActions } from './pathfinder/tools/summarize.js';
import { registerActions as registerReorganizeActions } from './pathfinder/tools/reorganize.js';
import { registerActions as registerMergeSplitActions } from './pathfinder/tools/merge-split.js';
import { registerActions as registerNotebookActions } from './pathfinder/tools/notebook.js';

import { buildTreeFromMetadata, buildTreeWithLLM } from './pathfinder/tree-builder.js';
import { runDiagnostics } from './pathfinder/diagnostics.js';

// Pipeline system imports
import { initializePromptStore } from './pathfinder/prompts/prompt-store.js';
import { getDefaultPrompts, getDefaultPipelines } from './pathfinder/prompts/default-prompts.js';

let initialized = false;

export function initPathfinder(context) {
    if (initialized) return;
    initialized = true;

    registerSearchActions();
    registerRememberActions();
    registerUpdateActions();
    registerForgetActions();
    registerSummarizeActions();
    registerReorganizeActions();
    registerMergeSplitActions();
    registerNotebookActions();

    initActivityFeed();

    // Initialize pipeline prompt store with defaults
    initializePromptStore(getDefaultPrompts(), getDefaultPipelines());

    const entryManagerAPIs = ['loadWorldInfo', 'createWorldInfoEntry', 'saveWorldInfo'];
    const missingEntryManagerAPIs = entryManagerAPIs.filter(api => !context?.[api]);
    if (missingEntryManagerAPIs.length === 0) {
        initEntryManagerAPIs(context.loadWorldInfo, context.createWorldInfoEntry, context.saveWorldInfo);
    } else {
        console.error(`[Pathfinder] Missing context APIs for lorebook writes: ${missingEntryManagerAPIs.join(', ')}`);
    }

    if (context?.eventSource && context?.eventTypes) {
        initAutoSummary(context.eventSource, context.eventTypes);
    }

    if (context?.registerSlashCommand) {
        initCommands(context.registerSlashCommand);
    }

    console.info('[Pathfinder] Initialized with 8 tools and predictive pipeline system.');
}

export async function buildPathfinderTree(bookName, bookData, useLLM = false, llmGenerate = null) {
    if (useLLM && llmGenerate) {
        return await buildTreeWithLLM(bookName, bookData, llmGenerate);
    }
    return await buildTreeFromMetadata(bookName, bookData);
}

export { runDiagnostics };
export { getSettings as getPathfinderSettings, setSettings as setPathfinderSettings };
export { isLorebookEnabled, setLorebookEnabled };
export { getPathfinderToolDefinitions };

// Export pipeline-related functions for external use
export { initPromptEditorUI, refreshPromptEditorUI } from './pathfinder/prompts/prompt-editor-ui.js';
export { runPipeline } from './pathfinder/prompts/pipeline-runner.js';
export { getAllPrompts, getPrompt, savePrompt } from './pathfinder/prompts/prompt-store.js';
