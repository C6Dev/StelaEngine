// visual-script-execution-manager.js
import * as THREE from 'three';
import { NODE_TYPES } from './visual-script-node-types.js';

export class VisualScriptExecutionManager {
    constructor(graphInstance) {
        this.graph = graphInstance; // Reference to the main VisualScriptGraph instance
    }

    /**
     * Executes event nodes of a specific type (e.g., 'event-start', 'event-update', 'event-key-input').
     * @param {string} eventType - The type of event node to trigger.
     */
    executeEvent(eventType) {
        const gameContext = this.graph.executionContext.game;
        const keyState = this.graph.executionContext.keyState;

        if (!gameContext) {
            // This can happen if the graph is executed outside of play mode (e.g. from editor button)
            // For now, let's just return if gameContext isn't fully available during play.
            // If certain events SHOULD run in editor, this check needs to be more nuanced.
            if (eventType === 'event-start' || eventType === 'event-update' || eventType === 'event-key-input') {
                 if (!gameContext || (gameContext && !gameContext.isPlaying && eventType !== 'event-start' && eventType !== 'event-update' )) {
                    // If not playing, only allow potentially editor-driven events or ensure context is mocked
                    // For actual game events, require gameContext.isPlaying
                    // this.graph.executionContext.customConsole.warn(`Game context not fully available for event type: ${eventType}`);
                    return;
                 }
            }
        }


        if (eventType === 'event-start') {
            // Ensure gameContext.isFirstFrame is available and true
            if (!gameContext || !gameContext.isFirstFrame) return; 
            const eventNodes = this.graph.nodes.filter(node => node.type === 'event-start');
            eventNodes.forEach(nodeData => this._executeFlow(nodeData.id, 'flowOut', new Set()));
        } else if (eventType === 'event-update') {
            if (!gameContext || !gameContext.isPlaying) return; // Ensure game is playing for update
            const eventNodes = this.graph.nodes.filter(node => node.type === 'event-update');
            eventNodes.forEach(nodeData => this._executeFlow(nodeData.id, 'flowOut', new Set()));
        } else if (eventType === 'event-key-input') {
            if (!gameContext || !gameContext.isPlaying || !keyState) return; // Ensure game is playing for key input
            const keyPressNodes = this.graph.nodes.filter(node => node.type === 'event-key-press');
            keyPressNodes.forEach(nodeData => {
                const nodeConfig = NODE_TYPES[nodeData.type];
                const keyNameValue = nodeData.values.keyName || nodeConfig.inputs.keyName.default;
                const targetKey = String(keyNameValue).toUpperCase();
                if (keyState[targetKey]) { // keyState reflects current press state
                    this._executeFlow(nodeData.id, 'flowOut', new Set());
                }
            });
        }
    }

    _executeFlow(sourceNodeId, outputFlowPinName, visitedInThisFlow) {
        if (visitedInThisFlow.has(sourceNodeId + '+' + outputFlowPinName)) {
            this.graph.executionContext.customConsole.error(`Loop detected in visual script execution at node ${sourceNodeId}, pin ${outputFlowPinName}. Halting this path.`);
            return;
        }
        visitedInThisFlow.add(sourceNodeId + '+' + outputFlowPinName);

        const outgoingConnections = this.graph.connections.filter(
            conn => conn.fromNodeId === sourceNodeId && conn.fromPinName === outputFlowPinName
        );

        for (const conn of outgoingConnections) {
            const targetNodeData = this.graph.nodes.find(n => n.id === conn.toNodeId);
            if (!targetNodeData) continue;

            const targetNodeConfig = NODE_TYPES[targetNodeData.type];
            if (!targetNodeConfig) continue;

            // Ensure the target pin is a flow input pin
            if (!targetNodeConfig.inputs[conn.toPinName] || targetNodeConfig.inputs[conn.toPinName].type !== 'flow') {
                this.graph.executionContext.customConsole.warn(`Execution flow attempted into non-flow pin "${conn.toPinName}" on node ${targetNodeData.type} (ID: ${targetNodeData.id}). Skipping.`);
                continue;
            }
            
            this._performNodeAction(targetNodeData, targetNodeConfig);

            if (targetNodeConfig.type === 'action' && targetNodeConfig.outputs && targetNodeConfig.outputs.flowOut) {
                this._executeFlow(targetNodeData.id, 'flowOut', new Set(visitedInThisFlow)); 
            }
        }
    }
    
    _performNodeAction(nodeData, nodeConfig) {
        const { gameObject, sceneObjects, keyState, game, customConsole } = this.graph.executionContext;

        try {
            switch (nodeData.type) {
                case 'action-log': {
                    const message = this._evaluatePinValue(nodeData.id, 'message', nodeConfig.inputs.message);
                    customConsole.log(message);
                    break;
                }
                case 'action-branch': {
                    const condition = this._evaluatePinValue(nodeData.id, 'condition', nodeConfig.inputs.condition);
                    if (Boolean(condition)) {
                        this._executeFlow(nodeData.id, 'flowOutTrue', new Set());
                    } else {
                        this._executeFlow(nodeData.id, 'flowOutFalse', new Set());
                    }
                    break;
                }
                // Add other action node handlers here
            }
        } catch (e) {
            customConsole.error(`Error executing node ${nodeData.type} (ID: ${nodeData.id}): ${e.message}`);
            console.error(e.stack); // Also log stack trace to browser console for easier debugging
        }
    }

    _evaluatePinValue(nodeId, inputPinName, pinConfig) {
        const connection = this.graph.connections.find(
            conn => conn.toNodeId === nodeId && conn.toPinName === inputPinName
        );

        if (connection) { // Value comes from a connected node
            const sourceNodeData = this.graph.nodes.find(n => n.id === connection.fromNodeId);
            const sourceNodeConfig = NODE_TYPES[sourceNodeData.type];
            if (!sourceNodeData || !sourceNodeConfig) {
                this.graph.executionContext.customConsole.error(`Source node for pin ${inputPinName} on node ${nodeId} not found.`);
                return pinConfig.default !== undefined ? pinConfig.default : null;
            }
            
            // Ensure the source pin is an output pin and matches the expected type if possible
            const sourcePinName = connection.fromPinName;
            if (!sourceNodeConfig.outputs || !sourceNodeConfig.outputs[sourcePinName]) {
                 this.graph.executionContext.customConsole.error(`Source pin "${sourcePinName}" not found on source node ${sourceNodeData.type} (ID: ${sourceNodeData.id}).`);
                 return pinConfig.default !== undefined ? pinConfig.default : null;
            }

            // For value nodes, the value is usually in `nodeData.values.value`
            if (sourceNodeConfig.type === 'value') {
                const rawValue = sourceNodeData.values.value; // This is the input field's value in 'value-number', 'value-string'
                if (pinConfig.type === 'number') {
                    return parseFloat(rawValue);
                } else if (pinConfig.type === 'string') {
                    return String(rawValue);
                } else if (pinConfig.type === 'boolean') {
                    // Convert common string/number representations of boolean
                    if (typeof rawValue === 'string') {
                        const lowerVal = rawValue.toLowerCase();
                        if (lowerVal === 'true' || lowerVal === '1') return true;
                        if (lowerVal === 'false' || lowerVal === '0') return false;
                    }
                    return Boolean(rawValue);
                }
                return rawValue; // Passthrough for other types
            }
            
            // TODO: Handle evaluation of complex output pins from non-value nodes if needed.
            // For now, this path is a warning, and we'd fall back to local or default.
            this.graph.executionContext.customConsole.warn(`Data flow from non-value node type '${sourceNodeData.type}' (pin: ${sourcePinName}) to input pin ${inputPinName} not fully implemented yet for value retrieval.`);
            return pinConfig.default !== undefined ? pinConfig.default : null;

        } else { // Value is local to the node (from its input field)
            const nodeData = this.graph.nodes.find(n => n.id === nodeId);
            let val = nodeData.values[inputPinName];

            if (val === undefined && pinConfig.default !== undefined) {
                val = pinConfig.default;
            }

            if (pinConfig.type === 'number') {
                 return parseFloat(val);
            } else if (pinConfig.type === 'string') {
                 return String(val);
            } else if (pinConfig.type === 'boolean') {
                if (typeof val === 'string') {
                    const lowerVal = val.toLowerCase();
                    if (lowerVal === 'true' || lowerVal === '1') return true;
                    if (lowerVal === 'false' || lowerVal === '0') return false;
                }
                return Boolean(val);
            }
            return val;
        }
    }
}