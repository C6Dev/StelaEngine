// visual-script-node-dom.js
import * as DOM from './dom-elements.js';

/**
 * Creates the DOM element for a visual script node.
 * @param {object} nodeData - The data object for the node.
 * @param {object} nodeConfig - The configuration for this node type from NODE_TYPES.
 * @param {object} eventHandlers - Callbacks for interactions.
 * @param {function} eventHandlers.onValueChange - (nodeId, valueKey, value) => {}
 * @param {function} eventHandlers.onMouseDown - (event, nodeId) => {}
 * @param {function} eventHandlers.onPinClick - (event, nodeId, pinName, pinType, dataType) => {}
 * @param {function} eventHandlers.isInputPinConnected - (nodeId, pinName) => boolean
 * @param {function} eventHandlers.onNodeDeleteRequest - (nodeId) => {} // New handler
 * @returns {HTMLElement} The created node element.
 */
export function createNodeElement(nodeData, nodeConfig, eventHandlers) {
    const nodeElement = document.createElement('div');
    nodeElement.classList.add('visual-script-node');
    nodeElement.id = `vs-node-${nodeData.id}`;
    nodeElement.style.left = `${nodeData.x}px`;
    nodeElement.style.top = `${nodeData.y}px`;
    nodeElement.dataset.nodeId = nodeData.id;

    const header = document.createElement('div');
    header.classList.add('vs-node-header');
    header.textContent = nodeConfig.title;
    nodeElement.appendChild(header);

    const content = document.createElement('div');
    content.classList.add('vs-node-content');

    const inputPinsContainer = document.createElement('div');
    inputPinsContainer.classList.add('vs-node-input-pins');
    const outputPinsContainer = document.createElement('div');
    outputPinsContainer.classList.add('vs-node-output-pins');

    // Create input fields and pins based on nodeConfig.inputs
    Object.entries(nodeConfig.inputs).forEach(([inputName, inputConfig]) => {
        // Create input pin unless noPin is true
        if (!inputConfig.noPin) {
            const pinRow = document.createElement('div');
            pinRow.classList.add('vs-node-row', 'input-row');
            
            const pinElement = document.createElement('div');
            pinElement.classList.add('vs-pin', 'input');
            pinElement.dataset.nodeId = nodeData.id;
            pinElement.dataset.pinName = inputName;
            pinElement.dataset.pinType = 'input';
            pinElement.dataset.dataType = inputConfig.type;
            pinElement.addEventListener('mousedown', (e) => eventHandlers.onPinClick(e, nodeData.id, inputName, 'input', inputConfig.type));
            pinRow.appendChild(pinElement);

            const pinLabel = document.createElement('span');
            pinLabel.classList.add('vs-pin-label');
            pinLabel.textContent = inputConfig.label;
            pinRow.appendChild(pinLabel);
            
            inputPinsContainer.appendChild(pinRow);
        }

        // Create input field if type is not 'flow' and not specified as 'noDisplayField'
        if (inputConfig.type !== 'flow' && !inputConfig.noDisplayField) {
            let inputField;
            const fieldWrapper = document.createElement('div');
            fieldWrapper.classList.add('vs-node-field');
            
            const fieldLabel = document.createElement('label');
            fieldLabel.textContent = inputConfig.label + ':';
            fieldWrapper.appendChild(fieldLabel);

            if (inputConfig.type === 'number') {
                inputField = document.createElement('input');
                inputField.type = 'number';
                inputField.value = nodeData.values[inputName] !== undefined ? nodeData.values[inputName] : (inputConfig.default !== undefined ? inputConfig.default : 0);
                inputField.step = (inputConfig.label.toLowerCase().includes('speed') || inputConfig.label.toLowerCase().includes('dir')) ? "0.01" : "1";
            } else { // string, or other types treated as text for now (e.g. keyName)
                inputField = document.createElement('input');
                inputField.type = 'text';
                inputField.value = nodeData.values[inputName] !== undefined ? nodeData.values[inputName] : (inputConfig.default !== undefined ? inputConfig.default : '');
            }
            inputField.dataset.valueKey = inputName; // Use a consistent key for value changes
            inputField.addEventListener('change', (e) => {
                let value = e.target.value;
                if (inputConfig.type === 'number') value = parseFloat(value);
                eventHandlers.onValueChange(nodeData.id, inputName, value);
            });
            inputField.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent node drag
            
            if (!inputConfig.noPin && eventHandlers.isInputPinConnected && eventHandlers.isInputPinConnected(nodeData.id, inputName)) {
                inputField.disabled = true;
                fieldWrapper.classList.add('disabled');
            }
            
            fieldWrapper.appendChild(inputField);
            content.appendChild(fieldWrapper);
        }
    });
    
    Object.entries(nodeConfig.outputs).forEach(([pinName, pinConfig]) => {
        const pinRow = document.createElement('div');
        pinRow.classList.add('vs-node-row', 'output-row');

        const pinLabel = document.createElement('span');
        pinLabel.classList.add('vs-pin-label');
        pinLabel.textContent = pinConfig.label;
        pinRow.appendChild(pinLabel);
        
        const pinElement = document.createElement('div');
        pinElement.classList.add('vs-pin', 'output');
        pinElement.dataset.nodeId = nodeData.id;
        pinElement.dataset.pinName = pinName;
        pinElement.dataset.pinType = 'output';
        pinElement.dataset.dataType = pinConfig.type;
        pinElement.addEventListener('mousedown', (e) => eventHandlers.onPinClick(e, nodeData.id, pinName, 'output', pinConfig.type));
        pinRow.appendChild(pinElement);
        
        outputPinsContainer.appendChild(pinRow);
    });

    const pinsWrapper = document.createElement('div');
    pinsWrapper.classList.add('vs-node-pins');
    pinsWrapper.appendChild(inputPinsContainer);
    pinsWrapper.appendChild(outputPinsContainer);
    
    nodeElement.appendChild(pinsWrapper);
    nodeElement.appendChild(content);

    nodeElement.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('vs-pin') || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            return; 
        }
        eventHandlers.onMouseDown(e, nodeData.id);
    });

    nodeElement.addEventListener('dblclick', (e) => {
        if (e.target.closest('input, select, .vs-pin, .vs-node-field label')) {
            return;
        }
        if (eventHandlers.onNodeDeleteRequest) {
            eventHandlers.onNodeDeleteRequest(nodeData.id);
        }
    });
    
    DOM.visualScriptNodesContainer.appendChild(nodeElement);
    return nodeElement;
}

export function updateNodeElementPosition(nodeElement, x, y) {
    if (nodeElement) {
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
    }
}

export function removeNodeElement(nodeElement) {
    if (nodeElement && nodeElement.parentElement) {
        nodeElement.parentElement.removeChild(nodeElement);
    }
}

export function updateNodeInputFieldsDisabledState(nodeElement, nodeId, nodeConfig, isInputPinConnectedFunc) {
    if (!nodeElement || !nodeConfig) return;

    const inputFields = nodeElement.querySelectorAll('.vs-node-content input[data-value-key]');
    inputFields.forEach(inputField => {
        const valueKey = inputField.dataset.valueKey;
        const inputConfig = nodeConfig.inputs[valueKey];
        if (inputConfig && !inputConfig.noPin) { 
            const isDisabled = isInputPinConnectedFunc(nodeId, valueKey);
            inputField.disabled = isDisabled;
            const fieldWrapper = inputField.closest('.vs-node-field');
            if (fieldWrapper) {
                isDisabled ? fieldWrapper.classList.add('disabled') : fieldWrapper.classList.remove('disabled');
            }
        }
    });
}

export function setNodeSelectedVisualState(nodeElement, isSelected) {
    if (nodeElement) {
        isSelected ? nodeElement.classList.add('selected') : nodeElement.classList.remove('selected');
    }
}