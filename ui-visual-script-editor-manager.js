import * as DOM from './dom-elements.js';
import { VisualScriptGraph } from './visual-script-graph.js';
import * as FileManager from './file-manager.js';
import * as ScriptEngine from './script-engine.js'; // For console logging
import { convertVisualScriptToStela } from './visual-script-to-stela-converter.js';

let currentVisualScriptFileName = null;
let visualGraphInstance = null;

function updateVisualScriptEditorTabName(name) {
    DOM.currentVisualScriptNameTabSpan.textContent = name || 'Untitled';
}

export function updateEditorTabNameWithCurrentFile() {
    const openFileName = FileManager.getCurrentOpenVisualScriptName();
    updateVisualScriptEditorTabName(openFileName);
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

    let currentVSName = currentVisualScriptFileName || FileManager.getCurrentOpenVisualScriptName();
    let suggestedStelaNameBase = "ConvertedScript";
    if (currentVSName) {
        suggestedStelaNameBase = currentVSName.replace(/\.stela-vs$/i, '').replace(/\.stela$/i, '');
    }
    // FileManager.getUniqueScriptName will add .stela and ensure uniqueness
    const suggestedStelaName = FileManager.getUniqueScriptName(suggestedStelaNameBase);

    const newStelaScriptNameWithExt = prompt("Enter name for the converted Stela text script:", suggestedStelaName);

    if (!newStelaScriptNameWithExt || !newStelaScriptNameWithExt.trim()) {
        ScriptEngine.customConsole.log("Save as text script cancelled by user.");
        return;
    }
    
    // FileManager.saveScript handles adding .stela extension if not present,
    // compilation, and refreshing UI lists.
    if (FileManager.saveScript(newStelaScriptNameWithExt, stelaCode)) {
        ScriptEngine.customConsole.log(`Visual script successfully converted and saved as text script: "${newStelaScriptNameWithExt.endsWith(".stela") ? newStelaScriptNameWithExt : newStelaScriptNameWithExt + ".stela"}"`);
    } else {
        // FileManager.saveScript would have logged an error.
        // ScriptEngine.customConsole.error(`Failed to save converted text script as "${newStelaScriptNameWithExt}".`);
    }
}

function setupEventListeners() {
    DOM.vsAddNodeBtn.addEventListener('click', () => {
        if (!visualGraphInstance) return;
        const selectedType = DOM.vsNodeTypeSelect.value;
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
        // Simplified positioning for new nodes
        const x = (visualGraphInstance.nodes.length % 5) * 200 + 50; // Spread out more
        const y = Math.floor(visualGraphInstance.nodes.length / 5) * 180 + 50; // More vertical space
        visualGraphInstance.addNode(selectedType, x, y);
    });
    DOM.vsSaveAsTextBtn.addEventListener('click', handleSaveVisualScriptAsText);

    // Note: Pin click and SVG double click listeners are now managed within VisualScriptGraph
}

export function onTabFocus() {
    if (visualGraphInstance) {
        visualGraphInstance.redrawAllConnections(); 
    }
}

export function initVisualScriptEditorManager() {
    visualGraphInstance = new VisualScriptGraph();
    // Pass ScriptEngine's console to the graph for its internal logging
    if (visualGraphInstance && ScriptEngine.customConsole) {
        visualGraphInstance.setContext(null, {}, {}, null, ScriptEngine.customConsole);
    }
    setupEventListeners();
    updateEditorTabNameWithCurrentFile(); 
    
    if (visualGraphInstance && visualGraphInstance.nodes.length === 0 && !FileManager.getCurrentOpenVisualScriptName()) {
        visualGraphInstance.addNode('event-start', 50, 50);
    }
}

export function loadVisualScript(name, data) {
    if (!visualGraphInstance) return;
    
    currentVisualScriptFileName = name; 
    FileManager.setCurrentOpenVisualScriptName(name); 
    updateVisualScriptEditorTabName(name);
    visualGraphInstance.loadState(data); 
    
}

export function saveVisualScript() {
    if (!visualGraphInstance) {
        ScriptEngine.customConsole.error("Visual script editor not initialized. Cannot save.");
        return null;
    }
    const dataToSave = visualGraphInstance.getState();
    
    let nameToSave = currentVisualScriptFileName || FileManager.getCurrentOpenVisualScriptName();
    if (!nameToSave) {
        const baseName = FileManager.getUniqueVisualScriptName("MyVisualScript"); // Note: .stela-vs is added by getUniqueVisualScriptName
        nameToSave = prompt("Enter visual script name:", baseName);
        if (!nameToSave || !nameToSave.trim()) {
            ScriptEngine.customConsole.log("Visual script save cancelled by user.");
            return null; // User cancelled or entered empty name
        }
    }

    // FileManager.saveVisualScript ensures the .stela-vs extension
    if (FileManager.saveVisualScript(nameToSave, dataToSave)) { 
        currentVisualScriptFileName = nameToSave.endsWith(".stela-vs") ? nameToSave : nameToSave + ".stela-vs";
        FileManager.setCurrentOpenVisualScriptName(currentVisualScriptFileName); 
        updateVisualScriptEditorTabName(currentVisualScriptFileName); 
        return { name: currentVisualScriptFileName, data: dataToSave }; 
    }
    return null; // FileManager.saveVisualScript would have logged an error
}

export function clearEditor() { 
    if (!visualGraphInstance) return;
    visualGraphInstance.clear();
    currentVisualScriptFileName = null;
    FileManager.setCurrentOpenVisualScriptName(null); 
    updateVisualScriptEditorTabName(null); 
    visualGraphInstance.addNode('event-start', 50, 50); 
}

export function clearEditorForNewScript(newName) {
    if (!visualGraphInstance) return;
    visualGraphInstance.clear();
    currentVisualScriptFileName = newName; 
    FileManager.setCurrentOpenVisualScriptName(newName); 
    updateVisualScriptEditorTabName(newName); 
    visualGraphInstance.addNode('event-start', 50, 50); 
}

export function handleExternalVisualScriptDeletion(deletedScriptName) {
    if (currentVisualScriptFileName === deletedScriptName || FileManager.getCurrentOpenVisualScriptName() === deletedScriptName) {
        clearEditor(); 
    }
}

export function getActiveVisualScriptGraph() {
    return visualGraphInstance;
}