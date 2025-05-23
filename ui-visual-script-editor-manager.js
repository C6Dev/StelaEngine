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

    const newStelaScriptNamePrompt = prompt("Enter name for the converted Stela text script:", suggestedStelaName);

    if (!newStelaScriptNamePrompt || !newStelaScriptNamePrompt.trim()) {
        ScriptEngine.customConsole.log("Save as text script cancelled by user.");
        return;
    }
    
    let finalStelaScriptName = newStelaScriptNamePrompt.trim();
    if (!finalStelaScriptName.endsWith(".stela")) {
        finalStelaScriptName += ".stela";
    }
    
    // FileManager.saveScript also ensures .stela extension internally, 
    // but having it explicitly here makes the name consistent for compilation.
    if (FileManager.saveScript(finalStelaScriptName, stelaCode)) {
        ScriptEngine.customConsole.log(`Visual script successfully converted and saved as text script: "${finalStelaScriptName}"`);
        // Compile the newly saved text script immediately
        ScriptEngine.compileScript(finalStelaScriptName, stelaCode); 
    } else {
        // FileManager.saveScript would have logged an error.
        // ScriptEngine.customConsole.error(`Failed to save converted text script as "${finalStelaScriptName}".`);
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
        // Prompt for base name, FileManager will add extension and ensure uniqueness
        const baseNameSuggestion = FileManager.getUniqueVisualScriptName("MyVisualScript").replace(/\.stela-vs$/, "");
        nameToSave = prompt("Enter visual script name (e.g., MyVisualLogic):", baseNameSuggestion);
        if (!nameToSave || !nameToSave.trim()) {
            ScriptEngine.customConsole.log("Visual script save cancelled by user.");
            return null; 
        }
    }

    // FileManager.saveVisualScript ensures the .stela-vs extension
    // and returns the final name used (which might have uniqueness numbers added)
    if (FileManager.saveVisualScript(nameToSave, dataToSave)) { 
        const finalName = FileManager.getCurrentOpenVisualScriptName(); // Get the name FM actually used
        currentVisualScriptFileName = finalName; 
        updateVisualScriptEditorTabName(finalName); 
        return { name: finalName, data: dataToSave }; 
    }
    return null; 
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