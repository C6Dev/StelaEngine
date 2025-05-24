import * as DOM from './dom-elements.js';
import * as ObjectManager from './object-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as FileManager from './file-manager.js';
import * as TabManager from './ui-tab-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as UIProjectFilesManager from './ui-project-files-manager.js';

let currentTextScriptFileNameInEditor = null; 

function updateTextScriptEditorTabName(name) {
    DOM.currentScriptNameTabSpan.textContent = name || 'Untitled';
}

export function loadTextScriptIntoEditor(name, content, isSaved = true) {
    DOM.scriptInput.value = content;
    currentTextScriptFileNameInEditor = name; 
    if (isSaved) { 
        FileManager.setCurrentOpenTextScriptPath(name); 
    }
    updateTextScriptEditorTabName(name);
    TabManager.switchCenterTab('script');
}

export function clearTextEditorToUntitled() {
    DOM.scriptInput.value = '// New unsaved script\n';
    currentTextScriptFileNameInEditor = null;
    FileManager.setCurrentOpenTextScriptPath(null);
    updateTextScriptEditorTabName(null);
}

function handleSaveCurrentScript() {
    const activeTab = TabManager.getActiveCenterTab(); 

    if (activeTab === 'script') { 
        let nameToSave = currentTextScriptFileNameInEditor || FileManager.getCurrentOpenTextScriptPath();
        if (!nameToSave) { 
            const baseNameSuggestion = FileManager.getUniqueScriptName("MyScript").replace(/\.stela$/, "");
            nameToSave = prompt("Enter text script name (e.g., MyScript):", baseNameSuggestion);
            if (!nameToSave || !nameToSave.trim()) {
                ScriptEngine.customConsole.error("Save cancelled or invalid name for text script.");
                return;
            }
        }
        const content = DOM.scriptInput.value;
        if (FileManager.saveScript(nameToSave, content)) { 
            currentTextScriptFileNameInEditor = nameToSave.endsWith(".stela") ? nameToSave : nameToSave + ".stela"; 
            const finalName = FileManager.getCurrentOpenTextScriptPath(); 
            updateTextScriptEditorTabName(finalName); 
            ScriptEngine.compileScript(finalName, content); 
        }

    } else if (activeTab === 'visual-script') { 
        const savedInfo = VisualScriptEditorManager.saveVisualScript(); 
        if (savedInfo && savedInfo.name) {
            ScriptEngine.customConsole.log(`Visual script "${savedInfo.name}" saved successfully.`);
        }
    }
}

function setupTextScriptEditorControls() {
    DOM.runUpdateBtn.addEventListener('click', () => { 
        ScriptEngine.clearOutputMessages();
        const scriptContent = DOM.scriptInput.value;
        const openTextScriptName = currentTextScriptFileNameInEditor || FileManager.getCurrentOpenTextScriptPath();
        if (openTextScriptName) {
            ScriptEngine.compileScript(openTextScriptName, scriptContent);
        } else {
            ScriptEngine.customConsole.error("No text script file is currently open/associated in the editor. Save the script first.");
        }
    });
    DOM.runOnceBtn.addEventListener('click', () => { 
        ScriptEngine.clearOutputMessages();
        const selectedObject = ObjectManager.getSelectedObject();
        if (selectedObject) {
            ScriptEngine.runScriptOnceForObject(DOM.scriptInput.value, selectedObject);
        } else {
            ScriptEngine.customConsole.error("No object selected. Select an object to run the text script for.");
        }
    });
    DOM.clearActiveScriptBtn.addEventListener('click', () => { 
        ScriptEngine.clearOutputMessages();
        clearTextEditorToUntitled();
        ScriptEngine.customConsole.log("Text script editor cleared to an untitled state.");
    });

    DOM.saveScriptBtn.addEventListener('click', handleSaveCurrentScript);
}

export function initScriptEditorManager() {
    setupTextScriptEditorControls();
    
    const textEditorInterface = {
        loadTextScriptIntoEditor: loadTextScriptIntoEditor,
        clearTextEditorToUntitled: clearTextEditorToUntitled,
        updateTextScriptEditorTabName: updateTextScriptEditorTabName,
        getCurrentTextScriptFileNameInEditor: () => currentTextScriptFileNameInEditor,
        setCurrentTextScriptFileNameInEditor: (name) => { currentTextScriptFileNameInEditor = name; }
    };

    UIProjectFilesManager.initUIProjectFilesManager(textEditorInterface);
    updateTextScriptEditorTabName(FileManager.getCurrentOpenTextScriptPath() || 'Untitled'); 
}

export const handleScriptDeleted = (scriptName, scriptType) => { 
    if (scriptType === 'text' && (currentTextScriptFileNameInEditor === scriptName || FileManager.getCurrentOpenTextScriptPath() === scriptName)) {
        clearTextEditorToUntitled();
    } else if (scriptType === 'visual' && FileManager.getCurrentOpenVisualScriptPath() === scriptName) {
        VisualScriptEditorManager.clearEditor(); 
    }
    // UIProjectFilesManager's populateScriptFileList will be called via FileManager hook
    // If the call doesn't originate from FileManager, you might need to call it directly:
    // UIProjectFilesManager.getPopulateProjectFilesListFunction()(); 
};