import { getDefinition as getSearchDef } from './tools/search.js';
import { getDefinition as getRememberDef } from './tools/remember.js';
import { getDefinition as getUpdateDef } from './tools/update.js';
import { getDefinition as getForgetDef } from './tools/forget.js';
import { getDefinition as getSummarizeDef } from './tools/summarize.js';
import { getDefinition as getReorganizeDef } from './tools/reorganize.js';
import { getDefinition as getMergeSplitDef } from './tools/merge-split.js';
import { getDefinition as getNotebookDef } from './tools/notebook.js';

export function getPathfinderToolDefinitions() {
    return [
        getSearchDef(),
        getRememberDef(),
        getUpdateDef(),
        getForgetDef(),
        getSummarizeDef(),
        getReorganizeDef(),
        getMergeSplitDef(),
        getNotebookDef(),
    ];
}
