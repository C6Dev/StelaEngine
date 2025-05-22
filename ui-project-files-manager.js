// ui-project-files-manager.js
import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as TabManager from './ui-tab-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as ObjectManager from './object-manager.js';
import * as PropertiesPanelManager from './ui-properties-panel-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
// This new module will need a reference to the text script editor manager to clear its state if a script is deleted/renamed.
// We can pass this as part of an init function or have the main script editor manager call static methods here.
// For now, let's assume UIScriptEditorManager provides methods that this manager can call.
let textScriptEditorInterface = { // Placeholder for Text Script Editor Manager's functions
    loadTextScriptIntoEditor: (name, content) => {},
    clearTextEditorToUntitled: () => {},
    updateTextScriptEditorTabName: (name) => {},
    getCurrentTextScriptFileNameInEditor: () => null,
    setCurrentTextScriptFileNameInEditor: (name) => {}
};


export function initUIProjectFilesManager(textEditorIntf) {
    if (textEditorIntf) {
        textScriptEditorInterface = textEditorIntf;
    }

    setupProjectFileControls();
    
    FileManager.initFileManager({
        refreshScriptLists: () => {
            populateScriptFileList(); 
        },
        clearEditorForDeletedScript: (deletedScriptName) => {
            const openTextScriptName = FileManager.getCurrentOpenScriptName(); 
            if (textScriptEditorInterface.getCurrentTextScriptFileNameInEditor() === deletedScriptName) { 
                textScriptEditorInterface.clearTextEditorToUntitled();
            }
            textScriptEditorInterface.updateTextScriptEditorTabName(openTextScriptName || 'Untitled');
            updateScriptFileSelectionUI(openTextScriptName, 'text');
        },
        clearVSEditorForDeletedScript: (deletedScriptName) => {
            VisualScriptEditorManager.handleExternalVisualScriptDeletion(deletedScriptName);
            updateScriptFileSelectionUI(FileManager.getCurrentOpenVisualScriptName(), 'visual');
        }
    });
    populateScriptFileList();
}

function populateScriptFileList() {
    const textScripts = FileManager.listScripts();
    const visualScripts = FileManager.listVisualScripts();
    DOM.scriptFileListDiv.innerHTML = '';

    if (textScripts.length === 0 && visualScripts.length === 0) {
        DOM.scriptFileListDiv.textContent = "No scripts saved yet.";
    } else {
        const currentOpenTextNameViaFM = FileManager.getCurrentOpenScriptName();
        const currentOpenVSNameViaFM = FileManager.getCurrentOpenVisualScriptName();

        textScripts.forEach(name => {
            const itemDiv = createScriptFileItemDOM(name, 'text', currentOpenTextNameViaFM, currentOpenVSNameViaFM);
            DOM.scriptFileListDiv.appendChild(itemDiv);
        });

        if (visualScripts.length > 0 && textScripts.length > 0) {
            const separator = document.createElement('hr');
            separator.style.borderColor = '#444';
            separator.style.margin = '5px 0';
            DOM.scriptFileListDiv.appendChild(separator);
        }

        visualScripts.forEach(name => {
            const itemDiv = createScriptFileItemDOM(name, 'visual', currentOpenTextNameViaFM, currentOpenVSNameViaFM);
            DOM.scriptFileListDiv.appendChild(itemDiv);
        });
    }
    ScriptComponentsManager.populateAvailableScriptsDropdown();
    textScriptEditorInterface.updateTextScriptEditorTabName(FileManager.getCurrentOpenScriptName() || 'Untitled');
    VisualScriptEditorManager.updateEditorTabNameWithCurrentFile();
}

function createScriptFileItemDOM(name, type, currentOpenTextNameFM, currentOpenVSNameFM) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('script-file-item');
    itemDiv.dataset.scriptName = name;
    itemDiv.dataset.scriptType = type;

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('script-type-icon');
    iconSpan.textContent = type === 'visual' ? '📊 ' : '📄 '; 
    itemDiv.appendChild(iconSpan);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.addEventListener('click', () => handleOpenScript(name, type));
    itemDiv.appendChild(nameSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('script-item-controls');

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.classList.add('rename-script-btn');
    renameBtn.dataset.scriptName = name;
    renameBtn.dataset.scriptType = type;
    controlsDiv.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('delete-script-btn');
    deleteBtn.dataset.scriptName = name;
    deleteBtn.dataset.scriptType = type;
    controlsDiv.appendChild(deleteBtn);
    
    itemDiv.appendChild(controlsDiv);

    if ((type === 'text' && name === currentOpenTextNameFM) ||
        (type === 'visual' && name === currentOpenVSNameFM)) {
        itemDiv.classList.add('selected-script');
    }
    return itemDiv;
}

function updateScriptFileSelectionUI(selectedName, selectedType) {
    const items = DOM.scriptFileListDiv.querySelectorAll('.script-file-item');
    items.forEach(item => {
        if (item.dataset.scriptName === selectedName && item.dataset.scriptType === selectedType) {
            item.classList.add('selected-script');
        } else {
            item.classList.remove('selected-script');
        }
    });
}

export function handleNewScript(type = 'text') { 
    if (type === 'text') {
        const newName = FileManager.getUniqueScriptName("NewTextScript");
        const defaultContent = `// ${newName}\nprint('${newName} created!');\n\n// Example:\n// if (key.W) {\n//   object.position.y + 0.05;\n// }`;
        textScriptEditorInterface.loadTextScriptIntoEditor(newName, defaultContent, false); // false: don't treat as saved yet
        // setCurrentTextScriptFileNameInEditor is called by loadTextScriptIntoEditor
        FileManager.setCurrentOpenScriptName(newName);
        textScriptEditorInterface.updateTextScriptEditorTabName(newName);
        TabManager.switchCenterTab('script');
        ScriptEngine.clearOutputMessages();
        ScriptEngine.customConsole.log(`New text script "${newName}" ready. Save to keep changes.`);
        updateScriptFileSelectionUI(newName, 'text');
    } else if (type === 'visual') {
        const newName = FileManager.getUniqueVisualScriptName("NewVisualScript");
        VisualScriptEditorManager.clearEditorForNewScript(newName); // This sets FM's current open VS script
        TabManager.switchCenterTab('visual-script');
        ScriptEngine.customConsole.log(`New visual script "${newName}" ready. Save to keep changes.`);
        updateScriptFileSelectionUI(newName, 'visual');
    }
}

function handleOpenScript(scriptName, type) {
    if (type === 'text') {
        const content = FileManager.loadScript(scriptName); 
        if (content !== null) {
            textScriptEditorInterface.loadTextScriptIntoEditor(scriptName, content, true); // true: it's a saved script
        } else {
            if (textScriptEditorInterface.getCurrentTextScriptFileNameInEditor() === scriptName || FileManager.getCurrentOpenScriptName() === scriptName) {
                 textScriptEditorInterface.clearTextEditorToUntitled();
                 FileManager.setCurrentOpenScriptName(null); 
                 updateScriptFileSelectionUI(null, null);
            }
        }
    } else if (type === 'visual') {
        const data = FileManager.loadVisualScript(scriptName); 
        if (data !== null) {
            VisualScriptEditorManager.loadVisualScript(scriptName, data);
            TabManager.switchCenterTab('visual-script');
            updateScriptFileSelectionUI(scriptName, 'visual');
        } else {
            if (FileManager.getCurrentOpenVisualScriptName() === scriptName) {
                VisualScriptEditorManager.clearEditor(); 
                updateScriptFileSelectionUI(null, null);
            }
        }
    }
}

function handleDeleteScript(name, type) {
     if (!name || !confirm(`Are you sure you want to delete ${type} script "${name}"? This cannot be undone.`)) {
        return;
    }

    let success = false;
    if (type === 'text') {
        success = FileManager.deleteScript(name); // FileManager hooks will update UI
    } else if (type === 'visual') {
        success = FileManager.deleteVisualScript(name); // FileManager hooks will update UI
    }

    if (success) {
        ObjectManager.removeScriptComponentFromAllObjects(name); 
        ScriptEngine.customConsole.log(`${type === 'text' ? "Text" : "Visual"} script "${name}" and its components removed.`);
        if (ObjectManager.getSelectedObject()) {
            PropertiesPanelManager.populatePropertiesPanel();
        }
    } else {
        ScriptEngine.customConsole.error(`Failed to delete ${type} script "${name}".`);
    }
}

function handleRenameScript(oldName, type) {
    if (!oldName) return;

    const newNamePrompt = prompt(`Enter new name for ${type} script "${oldName}":`, oldName.replace(/\.stela(-vs)?$/, ''));
    if (!newNamePrompt || !newNamePrompt.trim() || newNamePrompt.trim() === oldName.replace(/\.stela(-vs)?$/, '')) {
        ScriptEngine.customConsole.log("Rename cancelled or name unchanged.");
        return;
    }
    
    let newFullName = newNamePrompt.trim();

    let success = false;
    let finalNewName = "";
    if (type === 'text') {
        success = FileManager.renameScript(oldName, newFullName); // FM handles extension
        if (success) {
            finalNewName = newFullName.endsWith(".stela") ? newFullName : newFullName + ".stela";
            if (textScriptEditorInterface.getCurrentTextScriptFileNameInEditor() === oldName) {
                textScriptEditorInterface.setCurrentTextScriptFileNameInEditor(finalNewName);
                // Tab name update happens via FileManager hook -> populateScriptFileList -> updateTextScriptEditorTabName
            }
        }
    } else if (type === 'visual') {
        success = FileManager.renameVisualScript(oldName, newFullName); // FM handles extension
         if (success) {
            finalNewName = newFullName.endsWith(".stela-vs") ? newFullName : newFullName + ".stela-vs";
            // VS Editor's current file name and tab name update happens via FileManager hook
            // via setCurrentOpenVisualScriptName if it was the open one.
        }
    }

    if (success) {
        ObjectManager.updateScriptComponentNameOnAllObjects(oldName, finalNewName);
        ScriptEngine.customConsole.log(`${type} script "${oldName}" renamed to "${finalNewName}".`);
        if (ObjectManager.getSelectedObject()) {
            PropertiesPanelManager.populatePropertiesPanel();
        }
        // File list and editor tabs are updated by FileManager hooks -> populateScriptFileList
    }
}

function setupProjectFileControls() {
    DOM.createNewScriptBtn.addEventListener('click', () => {
        const type = prompt("Create new script: 'text' or 'visual'?", "text")?.toLowerCase();
        if (type === 'text' || type === 'visual') {
            handleNewScript(type);
        } else if (type !== null) {
            alert("Invalid script type. Please enter 'text' or 'visual'.");
        }
    });

    DOM.scriptFileListDiv.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const scriptItemDiv = target.closest('.script-file-item');
        if (!scriptItemDiv) return;

        const scriptName = scriptItemDiv.dataset.scriptName;
        const scriptType = scriptItemDiv.dataset.scriptType;

        if (target.classList.contains('delete-script-btn')) {
            handleDeleteScript(scriptName, scriptType);
        } else if (target.classList.contains('rename-script-btn')) {
            handleRenameScript(scriptName, scriptType);
        }
    });
}

// This function is called by UIScriptEditorManager if a script is deleted by external means (not through UI)
// though typically deletion should go through UIProjectFilesManager.
export function handleExternalScriptDeletion(scriptName, scriptType) {
    if (scriptType === 'text' && (textScriptEditorInterface.getCurrentTextScriptFileNameInEditor() === scriptName || FileManager.getCurrentOpenScriptName() === scriptName)) {
        textScriptEditorInterface.clearTextEditorToUntitled();
    } else if (scriptType === 'visual' && FileManager.getCurrentOpenVisualScriptName() === scriptName) {
        VisualScriptEditorManager.clearEditor();
    }
    populateScriptFileList(); // Refresh the list, which also updates tabs
}

// Getter for other modules if needed
export function getPopulateScriptFileListFunction() {
    return populateScriptFileList;
}