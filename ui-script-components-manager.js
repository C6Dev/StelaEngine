import * as DOM from './dom-elements.js';
import * as ObjectScriptingService from './object-scripting-service.js';
import * as ScriptEngine from './script-engine.js';
import * as FileManager from './file-manager.js';
import * as UIManager from './ui-manager.js';

export function setupScriptComponentControls() {
    DOM.addScriptComponentBtn.addEventListener('click', () => {
        const selectedObject = UIManager.getSelectedObject();
        const scriptName = DOM.availableScriptsDropdown.value;
        if (selectedObject && scriptName) {
            ObjectScriptingService.addScriptComponentToObject(selectedObject, scriptName);
            // populatePropertiesPanel() will be called by the service or its chain
        } else if (!selectedObject) {
            ScriptEngine.customConsole.error("No object selected to add script to.");
        } else if (!scriptName) {
            ScriptEngine.customConsole.error("No script selected from dropdown.");
        }
    });

    DOM.scriptComponentListDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-script-component-btn')) {
            const scriptName = event.target.dataset.scriptName;
            const selectedObject = UIManager.getSelectedObject();
            if (selectedObject && scriptName) {
                ObjectScriptingService.removeScriptComponentFromObject(selectedObject, scriptName);
                // populatePropertiesPanel() will be called by the service or its chain
            }
        }
    });
}

export function populateAvailableScriptsDropdown() {
    const stelaScripts = FileManager.listScripts();
    const visualScripts = FileManager.listVisualScripts();
    const allScripts = [...stelaScripts, ...visualScripts].sort();

    DOM.availableScriptsDropdown.innerHTML = '';
    if (allScripts.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No scripts available";
        DOM.availableScriptsDropdown.appendChild(option);
        DOM.addScriptComponentBtn.disabled = true;
    } else {
        allScripts.forEach(scriptName => {
            const option = document.createElement('option');
            option.value = scriptName;
            option.textContent = scriptName;
            DOM.availableScriptsDropdown.appendChild(option);
        });
        DOM.addScriptComponentBtn.disabled = false;
    }
}

export function populateScriptComponentListUI(selectedObject) {
    DOM.scriptComponentListDiv.innerHTML = '';
    if (selectedObject && selectedObject.userData && selectedObject.userData.scripts && selectedObject.userData.scripts.length > 0) {
        selectedObject.userData.scripts.forEach(scriptName => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('script-component-item');
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = scriptName;
            itemDiv.appendChild(nameSpan);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.classList.add('remove-script-component-btn');
            removeBtn.dataset.scriptName = scriptName;
            itemDiv.appendChild(removeBtn);
            
            DOM.scriptComponentListDiv.appendChild(itemDiv);
        });
    } else {
        DOM.scriptComponentListDiv.textContent = 'No scripts attached.';
    }
}

export function initScriptComponentsManager() {
    setupScriptComponentControls();
    populateAvailableScriptsDropdown(); 
}