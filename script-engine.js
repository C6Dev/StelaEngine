import * as DOM from './dom-elements.js';
import { getSceneObjects } from './object-manager.js';
import * as FileManager from './file-manager.js'; // For pre-compiling

let compiledScripts = {}; // Stores { scriptName: compiledFunction }
let scriptErrorTimeout = null;
const keyStatesRef = { current: {} }; // To hold reference to main.js keyStates
let getGameContextFunc = () => ({ camera: null, isPlaying: false }); // Placeholder

export function initScriptEngine(keyStatesObject, gameContextGetter) {
    keyStatesRef.current = keyStatesObject;
    if (gameContextGetter) {
        getGameContextFunc = gameContextGetter;
    }
    // Pre-compile all existing scripts
    const allScriptNames = FileManager.listScripts();
    allScriptNames.forEach(name => {
        const content = FileManager.loadScript(name, false); // false: don't update currentOpenScriptName
        if (content) {
            compileScript(name, content, false); // false: don't show success message for initial batch
        }
    });
    if (allScriptNames.length > 0) {
        customConsole.log(`Pre-compiled ${Object.keys(compiledScripts).length} existing scripts.`);
    }
}

export const customConsole = {
    log: (...args) => {
        const message = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try { return JSON.stringify(arg); } catch (e) { return arg.toString(); }
            }
            return String(arg);
        }).join(' ');
        if (DOM.scriptOutputDiv) { // Check if DOM.scriptOutputDiv is available
            const currentText = DOM.scriptOutputDiv.textContent;
            DOM.scriptOutputDiv.textContent = (currentText ? currentText + '\n' : '') + message;
            DOM.scriptOutputDiv.classList.remove('error');
            DOM.scriptOutputDiv.scrollTop = DOM.scriptOutputDiv.scrollHeight; // Scroll to bottom
        }
        console.log("[StelaScript]", ...args);
    },
    error: (...args) => {
        const message = args.map(String).join(' ');
        if (DOM.scriptOutputDiv) { // Check if DOM.scriptOutputDiv is available
            const currentText = DOM.scriptOutputDiv.textContent;
            DOM.scriptOutputDiv.textContent = (currentText ? currentText + '\n' : '') + "ERROR: " + message;
            DOM.scriptOutputDiv.classList.add('error');
            DOM.scriptOutputDiv.scrollTop = DOM.scriptOutputDiv.scrollHeight; // Scroll to bottom
        }
        console.error("[StelaScript]", ...args);
    }
};

export function translateStelaScriptToJS(stelaScript) {
    if (typeof stelaScript !== 'string') {
        customConsole.error("Script translation error: Input is not a string.");
        return null;
    }
    let jsScript = stelaScript;

    // 0. IMPORTANT: object.prop to gameObject.prop
    // This must happen before other transformations that might rely on 'gameObject'.
    jsScript = jsScript.replace(/\bobject\.(?=[a-zA-Z_])/g, 'gameObject.');

    // New: game.camera... and game.isPlaying
    // game.isPlaying is a direct boolean, no translation needed in the script itself if passed correctly.
    // game.camera needs to be a target for assignments.
    // The existing assignment regex will be updated.


    // 1. print(...) to console.log(...)
    jsScript = jsScript.replace(/print\s*\((.*?)\)\s*;/g, 'gameConsole.log($1);'); // Use gameConsole

    // 2. key.KEY to keyState['KEY']
    jsScript = jsScript.replace(/\bkey\.([a-zA-Z0-9_]+)\b/g, (match, keyName) => {
        return `keyState['${keyName.toUpperCase()}']`;
    });

    // 3. outsider.objectName... to sceneObjects.objectName...
    jsScript = jsScript.replace(/\boutsider\.([a-zA-Z0-9_]+)/g, 'sceneObjects.$1');

    // 4. Assignments: gameObject.prop + val; or sceneObjects.obj.prop + val; or game.camera.prop + val;
    // This regex should now correctly pick up gameObject if 'object.' was translated, and also game.camera
    jsScript = jsScript.replace(
        /(\b(?:gameObject|sceneObjects\.[a-zA-Z0-9_]+|game\.camera)\.(?:[a-zA-Z0-9_.]+))\s*([+\-*/])\s*([0-9.-]+)\s*;/g,
        (match, target, operator, value) => {
            // Ensure gameObject or sceneObjects.ActualObjectName or game.camera is part of the target
            if (target.startsWith("gameObject.") || target.match(/^sceneObjects\.[a-zA-Z0-9_]+\./) || target.startsWith("game.camera.")) {
                 return `${target} ${operator}= ${value};`;
            }
            return match;
        }
    );
    return jsScript;
}

export function compileScript(scriptName, scriptContent, showSuccessMessage = true) {
    if (scriptContent.trim() === "") {
        if (showSuccessMessage) customConsole.log(`Script "${scriptName}" is empty. Not compiled.`);
        delete compiledScripts[scriptName]; // Remove if it was compiled before
        return false;
    }

    const translatedJsScript = translateStelaScriptToJS(scriptContent);
    if (translatedJsScript === null) {
        customConsole.error(`Script translation failed for "${scriptName}". Please check syntax.`);
        delete compiledScripts[scriptName];
        return false;
    }

    try {
        // Arguments: global objects map, key states, custom console, the object this script is on, game context
        compiledScripts[scriptName] = new Function('sceneObjects', 'keyState', 'gameConsole', 'gameObject', 'game', translatedJsScript);
        if (showSuccessMessage) customConsole.log(`Script "${scriptName}" compiled successfully.`);
        return true;
    } catch (e) {
        customConsole.error(`Error compiling translated script "${scriptName}": ${e.message}`);
        delete compiledScripts[scriptName];
        return false;
    }
}

export function removeCompiledScript(scriptName) {
    if (compiledScripts[scriptName]) {
        delete compiledScripts[scriptName];
        // customConsole.log(`Removed "${scriptName}" from compiled cache.`); // Optional log
    }
}

export function renameCompiledScript(oldName, newName) {
    if (compiledScripts[oldName]) {
        compiledScripts[newName] = compiledScripts[oldName];
        delete compiledScripts[oldName];
        // customConsole.log(`Renamed "${oldName}" to "${newName}" in compiled cache.`); // Optional log
    }
}

export function runScriptOnceForObject(scriptContent, targetObject) {
    clearOutputMessages();
    if (!targetObject) {
        customConsole.error("Run Once: No object selected to run script on.");
        return;
    }
    if (scriptContent.trim() === "") {
        customConsole.log("Script is empty. Nothing to run.");
        return;
    }

    const translatedJsScript = translateStelaScriptToJS(scriptContent);
    if (translatedJsScript === null) {
        customConsole.error("Script translation failed. Please check script syntax.");
        return;
    }

    const gameContext = getGameContextFunc();
    try {
        const scriptFunc = new Function('sceneObjects', 'keyState', 'gameConsole', 'gameObject', 'game', translatedJsScript);
        scriptFunc(getSceneObjects(), keyStatesRef.current, customConsole, targetObject, gameContext);
        if (DOM.scriptOutputDiv && DOM.scriptOutputDiv.textContent === '') {
            customConsole.log(`Script executed once for ${targetObject.name}.`);
        }
    } catch (e) {
        customConsole.error(`Error running script for ${targetObject.name}: ${e.message}`);
    }
}

export function clearEditorScriptState() { // Renamed from clearActiveScript
    clearOutputMessages();
    // This function might not need to do much with compiledScripts directly anymore
    // as compilation is tied to saving or explicit recompilation.
    // UIManager will handle clearing the textarea.
    customConsole.log("Script editor interactions cleared (if any).");
}

export function clearOutputMessages() {
    if (DOM.scriptOutputDiv) { // Check if DOM.scriptOutputDiv is available
        DOM.scriptOutputDiv.textContent = '';
        DOM.scriptOutputDiv.classList.remove('error');
    }
    if (scriptErrorTimeout) {
        clearTimeout(scriptErrorTimeout);
        scriptErrorTimeout = null;
    }
}

export function clearCompiledScripts() {
    compiledScripts = {};
    // customConsole.log("Compiled script cache cleared."); // Optional: for debugging
}

export function executeComponentScripts() { // Renamed from executeActiveScriptInLoop
    const allObjects = getSceneObjects();
    const gameContext = getGameContextFunc();

    if (!gameContext.isPlaying) return; // Only execute if game is playing

    if (!scriptErrorTimeout) { // Only run if no global error timeout active
        for (const objectName in allObjects) {
            const currentGameObject = allObjects[objectName];
            if (currentGameObject.userData && currentGameObject.userData.scripts && currentGameObject.userData.scripts.length > 0) {
                currentGameObject.userData.scripts.forEach(scriptName => {
                    const scriptFunc = compiledScripts[scriptName];
                    if (scriptFunc) {
                        try {
                            scriptFunc(allObjects, keyStatesRef.current, customConsole, currentGameObject, gameContext);
                        } catch (e) {
                            customConsole.error(`Error in script "${scriptName}" on object "${objectName}": ${e.message}`);
                            // Set a timeout to clear this error message and resume general output
                            if (scriptErrorTimeout) clearTimeout(scriptErrorTimeout);
                            scriptErrorTimeout = setTimeout(() => {
                                if (DOM.scriptOutputDiv && DOM.scriptOutputDiv.textContent.includes("Error in script")) {
                                    // clearOutputMessages(); // Don't clear, just allow new messages
                                    // customConsole.log("Resuming script output...");
                                }
                                scriptErrorTimeout = null; // Allow further script executions / error messages
                            }, 3000);
                            // Potentially stop further scripts this frame if one errors badly?
                            // For now, continue to next script/object.
                        }
                    } else {
                        // This might happen if a script was on an object but then deleted from file system
                        // Or failed to compile initially.
                        // customConsole.error(`Script "${scriptName}" on object "${objectName}" not found or not compiled.`);
                        // This could be spammy, so maybe only log once or have a different handling.
                    }
                });
            }
        }
    }
}