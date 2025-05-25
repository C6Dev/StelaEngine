import * as DOM from './dom-elements.js';
import { VisualScriptGraph } from './visual-script-graph.js';
import * as FileManager from './file-manager.js';
import * as ScriptEngine from './script-engine.js'; // For console logging
import { convertVisualScriptToStela } from './visual-script-to-stela-converter.js';
import { NODE_TYPES } from './visual-script-node-types.js';

let currentVisualScriptFileName = null;
let visualGraphInstance = null;
let contextMenuLogicalCoords = { x: 0, y: 0 }; // Store logical coords for node add
let _visualEditorInterfaceForProjectFiles = {};

function updateVisualScriptEditorTabName(name) {
    DOM.currentVisualScriptNameTabSpan.textContent = name ? name.split('/').pop() : 'Untitled'; // Show only filename
}

export function updateEditorTabNameWithCurrentFile() {
    const openFilePath = FileManager.getCurrentOpenVisualScriptPath();
    updateVisualScriptEditorTabName(openFilePath);
}

function handleSaveVisualScriptAsText() {
    if (!visualGraphInstance) {
        ScriptEngine.customConsole.error("No visual script graph loaded to convert.");
        return;
    }
    const graphState = visualGraphInstance.getState();
    if (!graphState || graphState.nodes.length === 0) {
        ScriptEngine.customConsole.warn("Visual script is empty. Nothing to convert.");
        return;
    }

    const stelaCode = convertVisualScriptToStela(graphState);

    let currentVSPath = currentVisualScriptFileName || FileManager.getCurrentOpenVisualScriptPath();
    let suggestedStelaNameBase = "ConvertedScript";
    if (currentVSPath) {
        const currentVSFileName = currentVSPath.split('/').pop();
        suggestedStelaNameBase = currentVSFileName.replace(/\.stela-vs$/i, '').replace(/\.stela$/i, '');
    }
    // FileManager.getUniqueScriptName will add .stela and ensure uniqueness
    // getUniqueFilePath should be used for new files with paths
    const suggestedStelaPath = FileManager.getUniqueFilePath(suggestedStelaNameBase, 'STELA_SCRIPT');
    const suggestedStelaFileName = suggestedStelaPath.split('/').pop();

    const newStelaFileNamePrompt = prompt("Enter name for the converted Stela text script:", suggestedStelaFileName);

    if (!newStelaFileNamePrompt || !newStelaFileNamePrompt.trim()) {
        ScriptEngine.customConsole.log("Save as text script cancelled by user.");
        return;
    }
    
    let finalStelaFileName = newStelaFileNamePrompt.trim();
    if (!finalStelaFileName.endsWith(".stela")) {
        finalStelaFileName += ".stela";
    }
    
    const finalStelaPath = FileManager.getUniqueFilePath(finalStelaFileName, 'STELA_SCRIPT');
    
    if (FileManager.saveScript(finalStelaPath, stelaCode)) {
        ScriptEngine.customConsole.log(`Visual script successfully converted and saved as text script: "${finalStelaPath}"`);
        ScriptEngine.compileScript(finalStelaPath, stelaCode); 
    }
}

function _populateContextMenuNodeList(filterText = "") {
    DOM.vsNodeContextMenuList.innerHTML = '';
    const lowerFilterText = filterText.toLowerCase();

    Object.entries(NODE_TYPES)
        .filter(([type, config]) => config.title.toLowerCase().includes(lowerFilterText) || type.toLowerCase().includes(lowerFilterText))
        .sort(([, configA], [, configB]) => configA.title.localeCompare(configB.title))
        .forEach(([type, config]) => {
            const li = document.createElement('li');
            li.textContent = config.title;
            li.dataset.nodeType = type;
            li.addEventListener('click', () => _onContextMenuNodeSelect(type));
            DOM.vsNodeContextMenuList.appendChild(li);
        });
}

function _onContextMenuNodeSelect(nodeType) {
    if (visualGraphInstance && nodeType) {
        visualGraphInstance.addNode(nodeType, contextMenuLogicalCoords.x, contextMenuLogicalCoords.y);
    }
    hideNodeContextMenu();
}

export function showNodeContextMenu(logicalX, logicalY, screenX, screenY) { // screenX, screenY are relative to graph container
    contextMenuLogicalCoords = { x: logicalX, y: logicalY };
    
    // Position the menu based on screen coordinates
    const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
    const menuWidth = DOM.vsNodeContextMenu.offsetWidth;
    const menuHeight = DOM.vsNodeContextMenu.offsetHeight; // Might be 0 if not yet rendered with items

    let left = screenX;
    let top = screenY;

    // Adjust if menu goes off-screen (simple adjustment)
    if (left + menuWidth > graphRect.width) {
        left = graphRect.width - menuWidth - 5;
    }
    if (top + (menuHeight || 200) > graphRect.height) { // Use estimated height if needed
        top = graphRect.height - (menuHeight || 200) - 5;
    }
    left = Math.max(0, left);
    top = Math.max(0, top);


    DOM.vsNodeContextMenu.style.left = `${left}px`;
    DOM.vsNodeContextMenu.style.top = `${top}px`;
    DOM.vsNodeContextMenu.style.display = 'flex'; // Use flex for column layout
    
    _populateContextMenuNodeList();
    DOM.vsNodeContextMenuSearch.value = '';
    DOM.vsNodeContextMenuSearch.focus();
}

export function hideNodeContextMenu() {
    DOM.vsNodeContextMenu.style.display = 'none';
}

function handleContextMenuSearch() {
    _populateContextMenuNodeList(DOM.vsNodeContextMenuSearch.value);
}

// Listener to close context menu on Escape key or click outside
function _handleGlobalInteractionForContextMenu(event) {
    if (DOM.vsNodeContextMenu.style.display === 'flex') {
        if (event.key === 'Escape') {
            hideNodeContextMenu();
        } else if (event.type === 'mousedown') {
            // Check if the click is outside the context menu
            if (!DOM.vsNodeContextMenu.contains(event.target)) {
                hideNodeContextMenu();
            }
        }
    }
}

function setupEventListeners() {
    // DOM.vsAddNodeBtn was removed as node addition is handled via context menu
    // DOM.vsNodeTypeSelect was also removed
    
    DOM.vsSaveAsTextBtn.addEventListener('click', handleSaveVisualScriptAsText);
    DOM.vsSaveBtn.addEventListener('click', saveVisualScript); // Added direct call for saving
    DOM.vsClearBtn.addEventListener('click', clearEditor);   // Added direct call for clearing

    DOM.vsNodeContextMenuSearch.addEventListener('input', handleContextMenuSearch);

    // Add global listeners when the manager is initialized
    // These will check if the menu is visible before acting.
    document.addEventListener('keydown', _handleGlobalInteractionForContextMenu);
    document.addEventListener('mousedown', _handleGlobalInteractionForContextMenu, true); // Use capture to catch clicks early
}

export function onTabFocus() {
    if (visualGraphInstance) {
        visualGraphInstance.redrawAllConnections(); 
    }
}

export function initVisualScriptEditorManager() {
    visualGraphInstance = new VisualScriptGraph();
    if (visualGraphInstance && ScriptEngine.customConsole) {
        visualGraphInstance.setContext(null, {}, {}, null, ScriptEngine.customConsole);
    }

    // Setup callback for context menu requests from the graph's interaction manager
    visualGraphInstance.onContextMenuRequested = (logicalX, logicalY, screenClickX, screenClickY) => {
        showNodeContextMenu(logicalX, logicalY, screenClickX, screenClickY);
    };
    
    setupEventListeners();
    updateEditorTabNameWithCurrentFile(); 
    
    if (visualGraphInstance && visualGraphInstance.nodes.length === 0 && !FileManager.getCurrentOpenVisualScriptPath()) {
        // visualGraphInstance.addNode('event-start', 50, 50); // Don't add default node for cleaner start
    }
    
    _visualEditorInterfaceForProjectFiles = {
        loadVisualScriptIntoEditor: loadVisualScript,
        clearVisualScriptEditorForNewScript: clearEditorForNewScript,
        clearVisualScriptEditor: clearEditor,
        updateVisualScriptEditorTabName: updateEditorTabNameWithCurrentFile,
        getCurrentVisualScriptFileNameInEditor: () => currentVisualScriptFileName,
        setCurrentVisualScriptFileNameInEditor: (name) => { currentVisualScriptFileName = name; }
    };
}

export function getVisualEditorInterfaceForProjectFiles() {
    return _visualEditorInterfaceForProjectFiles;
}

export function loadVisualScript(name, data) {
    if (!visualGraphInstance) return;
    
    currentVisualScriptFileName = name; 
    FileManager.setCurrentOpenVisualScriptPath(name); 
    updateVisualScriptEditorTabName(name);
    visualGraphInstance.loadState(data); 
}

export function saveVisualScript() {
    if (!visualGraphInstance) {
        ScriptEngine.customConsole.error("Visual script editor not initialized. Cannot save.");
        return null;
    }
    const dataToSave = visualGraphInstance.getState();
    
    let pathToSave = currentVisualScriptFileName || FileManager.getCurrentOpenVisualScriptPath();
    if (!pathToSave) {
        // Prompt for base name, FileManager will add extension and ensure uniqueness
        const baseNameSuggestion = FileManager.getUniqueFilePath("MyVisualScript", 'VISUAL_SCRIPT').split('/').pop().replace(FileManager.FILE_TYPES.VISUAL_SCRIPT.extension, "");
        const chosenBaseName = prompt("Enter visual script name (e.g., MyVisualLogic):", baseNameSuggestion);
        if (!chosenBaseName || !chosenBaseName.trim()) {
            ScriptEngine.customConsole.log("Visual script save cancelled by user.");
            return null; 
        }
        pathToSave = FileManager.getUniqueFilePath(chosenBaseName.trim(), 'VISUAL_SCRIPT');
    }

    // FileManager.saveVisualScript ensures the .stela-vs extension
    // and returns the final name used (which might have uniqueness numbers added)
    if (FileManager.saveVisualScript(pathToSave, dataToSave)) { 
        const finalPath = FileManager.getCurrentOpenVisualScriptPath(); // Get the path FM actually used for "current open"
        currentVisualScriptFileName = finalPath; 
        updateVisualScriptEditorTabName(finalPath); 
        return { name: finalPath, data: dataToSave }; 
    }
    return null; 
}

export function clearEditor() { 
    if (!visualGraphInstance) return;
    visualGraphInstance.clear();
    currentVisualScriptFileName = null;
    FileManager.setCurrentOpenVisualScriptPath(null); 
    updateVisualScriptEditorTabName(null); 
    // visualGraphInstance.addNode('event-start', 50, 50); // Don't add default node
}

export function clearEditorForNewScript(newPath) { // newPath is the full path
    if (!visualGraphInstance) return;
    visualGraphInstance.clear();
    currentVisualScriptFileName = newPath; 
    FileManager.setCurrentOpenVisualScriptPath(newPath); 
    updateVisualScriptEditorTabName(newPath); 
    // visualGraphInstance.addNode('event-start', 50, 50); // Don't add default node
}

export function handleExternalVisualScriptDeletion(deletedScriptPath) {
    if (currentVisualScriptFileName === deletedScriptPath || FileManager.getCurrentOpenVisualScriptPath() === deletedScriptPath) {
        clearEditor(); 
    }
}

export function getActiveVisualScriptGraph() {
    return visualGraphInstance;
}
