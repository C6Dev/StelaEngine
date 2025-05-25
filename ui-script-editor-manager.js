import * as DOM from './dom-elements.js';
import * as ObjectManager from './object-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as FileManager from './file-manager.js';
import * as TabManager from './ui-tab-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';

let currentTextScriptFileNameInEditor = null; 
let _textEditorInterfaceForProjectFiles = {};
let suggestionPopupSelectedIndex = -1;

const SCRIPT_SUGGESTIONS = {
    object: ["name", "position.x", "position.y", "position.z", "rotation.x", "rotation.y", "rotation.z", "scale.x", "scale.y", "scale.z"],
    key: ["SPACE", "W", "A", "S", "D", "ARROWUP", "ARROWDOWN", "ARROWLEFT", "ARROWRIGHT", "ENTER", "SHIFTLEFT", "CONTROLLEFT"],
    game: ["isPlaying", "isFirstFrame", "camera.fov", "camera.position.x", "camera.position.y", "camera.position.z"],
    globals: ["print('');", "if (true) {\n  \n}", "outsider."]
};

function updateLineNumbers() {
    if (!DOM.lineNumbersDiv || !DOM.scriptInput) return;
    const lines = DOM.scriptInput.value.split('\n').length;
    let lineNumbersHTML = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHTML += i + '\n';
    }
    DOM.lineNumbersDiv.innerHTML = lineNumbersHTML; 
    DOM.lineNumbersDiv.scrollTop = DOM.scriptInput.scrollTop; 
}

function syncScroll() {
    if (DOM.lineNumbersDiv && DOM.scriptInput) {
        DOM.lineNumbersDiv.scrollTop = DOM.scriptInput.scrollTop;
    }
}

function updateTextScriptEditorTabName(name) {
    DOM.currentScriptNameTabSpan.textContent = name ? name.split('/').pop() : 'Untitled';
}

export function loadTextScriptIntoEditor(name, content, isSaved = true) {
    DOM.scriptInput.value = content;
    currentTextScriptFileNameInEditor = name; 
    if (isSaved) { 
        FileManager.setCurrentOpenTextScriptPath(name); 
    }
    updateTextScriptEditorTabName(name);
    TabManager.switchCenterTab('script');
    updateLineNumbers();
    DOM.scriptInput.classList.remove('error-state');
    hideSuggestionPopup();
}

export function clearTextEditorToUntitled() {
    DOM.scriptInput.value = '// New unsaved script\n';
    currentTextScriptFileNameInEditor = null;
    FileManager.setCurrentOpenTextScriptPath(null);
    updateTextScriptEditorTabName(null);
    updateLineNumbers();
    DOM.scriptInput.classList.remove('error-state');
    hideSuggestionPopup();
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
        const savedPath = FileManager.saveScript(nameToSave, content);
        if (savedPath) { 
            currentTextScriptFileNameInEditor = savedPath; 
            const finalName = FileManager.getCurrentOpenTextScriptPath(); 
            updateTextScriptEditorTabName(finalName); 
            const compileSuccess = ScriptEngine.compileScript(finalName, content); 
            if (compileSuccess) {
                DOM.scriptInput.classList.remove('error-state');
            } else {
                DOM.scriptInput.classList.add('error-state');
            }
        }

    } else if (activeTab === 'visual-script') { 
        const savedInfo = VisualScriptEditorManager.saveVisualScript(); 
        if (savedInfo && savedInfo.name) {
            // ScriptEngine.customConsole.log(`Visual script "${savedInfo.name}" saved successfully.`); // Already logged by VS manager
        }
    }
}

function getCursorXY() {
    const textarea = DOM.scriptInput;
    const pre = document.createElement('div');
    pre.style.visibility = 'hidden';
    pre.style.position = 'absolute';
    pre.style.whiteSpace = 'pre-wrap'; 
    pre.style.font = getComputedStyle(textarea).font;
    pre.style.padding = getComputedStyle(textarea).padding;
    pre.style.width = textarea.clientWidth + 'px'; 
    pre.style.boxSizing = 'border-box';

    const textUptoCursor = textarea.value.substring(0, textarea.selectionStart);
    pre.textContent = textUptoCursor; 
    document.body.appendChild(pre);

    const span = document.createElement('span');
    span.textContent = '.'; 
    pre.appendChild(span);

    const rect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    document.body.removeChild(pre);

    return {
        x: rect.left - textareaRect.left,
        y: rect.bottom - textareaRect.top - textarea.scrollTop 
    };
}

function showSuggestionPopup(suggestions, prefix = "") {
    DOM.suggestionPopup.innerHTML = '';
    if (suggestions.length === 0) {
        hideSuggestionPopup();
        return;
    }

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.textContent = suggestion;
        item.addEventListener('mousedown', (e) => { 
            e.preventDefault();
            insertSuggestion(suggestion, prefix);
        });
        DOM.suggestionPopup.appendChild(item);
    });

    const cursorPos = getCursorXY();
    const textareaRect = DOM.scriptInput.getBoundingClientRect();
    const wrapperRect = DOM.scriptEditorWrapper.getBoundingClientRect();

    DOM.suggestionPopup.style.left = `${cursorPos.x}px`;
    DOM.suggestionPopup.style.top = `${cursorPos.y}px`; 
    DOM.suggestionPopup.style.display = 'block';
    suggestionPopupSelectedIndex = -1;
    if (cursorPos.y + DOM.suggestionPopup.offsetHeight > DOM.scriptInput.clientHeight) {
        const popupHeight = DOM.suggestionPopup.offsetHeight;
        const approxLineHeight = parseInt(getComputedStyle(DOM.scriptInput).lineHeight) || 16;
        DOM.suggestionPopup.style.top = `${cursorPos.y - popupHeight - approxLineHeight}px`;
    }
}

function hideSuggestionPopup() {
    DOM.suggestionPopup.style.display = 'none';
    suggestionPopupSelectedIndex = -1;
}

function insertSuggestion(suggestion, prefixToRemove) {
    const textarea = DOM.scriptInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    let textToInsert = suggestion;
    let replacementStart = start;

    if (prefixToRemove && textarea.value.substring(0, start).endsWith(prefixToRemove)) {
        replacementStart = start - prefixToRemove.length;
    }
    
    let cursorOffset = textToInsert.length;
    if (textToInsert.includes("''")) { 
        cursorOffset = textToInsert.indexOf("''") + 1;
    } else if (textToInsert.includes("()")) { 
        cursorOffset = textToInsert.indexOf("()") +1;
    } else if (textToInsert.endsWith(".")) { 
        cursorOffset = textToInsert.length; 
    } else if (textToInsert.includes("\n  \n}")) { 
        cursorOffset = textToInsert.indexOf("\n  \n}") + 3; 
    }

    textarea.setRangeText(textToInsert, replacementStart, end, 'end');
    textarea.selectionStart = textarea.selectionEnd = replacementStart + cursorOffset;

    textarea.focus();
    updateLineNumbers(); 
    hideSuggestionPopup();
    DOM.scriptInput.dispatchEvent(new Event('input')); 
}

function handleScriptInputChangeForSuggestions() {
    const textarea = DOM.scriptInput;
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    const textBeforeCursor = text.substring(0, cursorPos);
    
    if (textBeforeCursor.endsWith('object.')) {
        showSuggestionPopup(SCRIPT_SUGGESTIONS.object, "object.");
    } else if (textBeforeCursor.endsWith('key.')) {
        showSuggestionPopup(SCRIPT_SUGGESTIONS.key, "key.");
    } else if (textBeforeCursor.endsWith('game.')) {
        showSuggestionPopup(SCRIPT_SUGGESTIONS.game, "game.");
    } else if (textBeforeCursor.endsWith('outsider.')) {
        const sceneObjectNames = Object.keys(ObjectManager.getSceneObjects());
        const outsiderSuggestions = sceneObjectNames.map(name => `${name}.`);
        showSuggestionPopup(outsiderSuggestions, "outsider.");
    } else {
        const currentLine = textBeforeCursor.substring(textBeforeCursor.lastIndexOf('\n') + 1);
        const currentWordMatch = currentLine.match(/([a-zA-Z0-9_]+)$/);
        const currentWord = currentWordMatch ? currentWordMatch[1] : "";

        if (currentWord.length > 0) {
            const filteredGlobals = SCRIPT_SUGGESTIONS.globals.filter(s => 
                s.toLowerCase().startsWith(currentWord.toLowerCase())
            );
            if (filteredGlobals.length > 0) {
                showSuggestionPopup(filteredGlobals, currentWord);
                return;
            }
        }
        hideSuggestionPopup();
    }
}

function handleKeyDownForSuggestions(event) {
    if (DOM.suggestionPopup.style.display === 'block') {
        const items = DOM.suggestionPopup.querySelectorAll('div');
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            suggestionPopupSelectedIndex = (suggestionPopupSelectedIndex + 1) % items.length;
            updateSuggestionSelection(items);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            suggestionPopupSelectedIndex = (suggestionPopupSelectedIndex - 1 + items.length) % items.length;
            updateSuggestionSelection(items);
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (suggestionPopupSelectedIndex !== -1 && items[suggestionPopupSelectedIndex]) {
                const selectedSuggestion = items[suggestionPopupSelectedIndex].textContent;
                
                const textBeforeCursor = DOM.scriptInput.value.substring(0, DOM.scriptInput.selectionStart);
                let prefix = "";
                if (textBeforeCursor.endsWith("object.")) prefix = "object.";
                else if (textBeforeCursor.endsWith("key.")) prefix = "key.";
                else if (textBeforeCursor.endsWith("game.")) prefix = "game.";
                else if (textBeforeCursor.endsWith("outsider.")) prefix = "outsider.";
                else { 
                    const currentLine = textBeforeCursor.substring(textBeforeCursor.lastIndexOf('\n') + 1);
                    const currentWordMatch = currentLine.match(/([a-zA-Z0-9_]+)$/);
                    prefix = currentWordMatch ? currentWordMatch[1] : "";
                }
                insertSuggestion(selectedSuggestion, prefix);
            } else if (items.length > 0 && suggestionPopupSelectedIndex === -1) { 
            }
            hideSuggestionPopup();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            hideSuggestionPopup();
        }
    }
}

function updateSuggestionSelection(items) {
    items.forEach((item, index) => {
        if (index === suggestionPopupSelectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function setupTextScriptEditorControls() {
    DOM.runUpdateBtn.addEventListener('click', () => { 
        ScriptEngine.clearOutputMessages();
        const scriptContent = DOM.scriptInput.value;
        const openTextScriptName = currentTextScriptFileNameInEditor || FileManager.getCurrentOpenTextScriptPath();
        if (openTextScriptName) {
            const success = ScriptEngine.compileScript(openTextScriptName, scriptContent);
            if (success) {
                DOM.scriptInput.classList.remove('error-state');
            } else {
                DOM.scriptInput.classList.add('error-state');
            }
        } else {
            ScriptEngine.customConsole.error("No text script file is currently open/associated in the editor. Save the script first.");
            DOM.scriptInput.classList.add('error-state');
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

    DOM.scriptInput.addEventListener('input', () => {
        updateLineNumbers();
        DOM.scriptInput.classList.remove('error-state'); 
        handleScriptInputChangeForSuggestions(); 
    });
    DOM.scriptInput.addEventListener('scroll', syncScroll);
    DOM.scriptInput.addEventListener('focus', () => {
        updateLineNumbers();
    }); 
    DOM.scriptInput.addEventListener('click', handleScriptInputChangeForSuggestions); 

    DOM.scriptInput.addEventListener('keydown', handleKeyDownForSuggestions);
    DOM.scriptInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!DOM.suggestionPopup.matches(':hover')) { 
                hideSuggestionPopup();
            }
        }, 150);
    });

    const computedStyle = getComputedStyle(DOM.scriptInput);
    DOM.scriptInput.style.lineHeight = computedStyle.lineHeight; 
    DOM.lineNumbersDiv.style.lineHeight = computedStyle.lineHeight;

    if (DOM.scriptInput.value) {
        updateLineNumbers();
    }
}

export function initScriptEditorManager() {
    setupTextScriptEditorControls();
    
    _textEditorInterfaceForProjectFiles = {
        loadTextScriptIntoEditor: loadTextScriptIntoEditor,
        clearTextEditorToUntitled: clearTextEditorToUntitled,
        updateTextScriptEditorTabName: updateTextScriptEditorTabName,
        getCurrentTextScriptFileNameInEditor: () => currentTextScriptFileNameInEditor,
        setCurrentTextScriptFileNameInEditor: (name) => { currentTextScriptFileNameInEditor = name; }
    };

    updateTextScriptEditorTabName(FileManager.getCurrentOpenTextScriptPath() || 'Untitled'); 
    updateLineNumbers(); 
}

export function getTextEditorInterfaceForProjectFiles() {
    return _textEditorInterfaceForProjectFiles;
}

export const handleScriptDeleted = (scriptName, scriptType) => { 
    if (scriptType === 'text' && (currentTextScriptFileNameInEditor === scriptName || FileManager.getCurrentOpenTextScriptPath() === scriptName)) {
        clearTextEditorToUntitled();
    } else if (scriptType === 'visual' && FileManager.getCurrentOpenVisualScriptPath() === scriptName) {
        VisualScriptEditorManager.clearEditor(); 
    }
};