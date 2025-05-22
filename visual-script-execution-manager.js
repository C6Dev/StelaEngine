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

        // Basic context check, might need refinement based on script needs
        if (!gameContext) {
            return;
        }

        if (eventType === 'event-start') {
            if (!gameContext.isFirstFrame) return; 
            const eventNodes = this.graph.nodes.filter(node => node.type === 'event-start');
            eventNodes.forEach(nodeData => this._executeFlow(nodeData.id, 'flowOut', new Set()));
        } else if (eventType === 'event-update') {
            // gameContext.isPlaying is implicitly true if this is called during play loop
            const eventNodes = this.graph.nodes.filter(node => node.type === 'event-update');
            eventNodes.forEach(nodeData => this._executeFlow(nodeData.id, 'flowOut', new Set()));
        } else if (eventType === 'event-key-input') {
            if (!keyState) return;
            const keyPressNodes = this.graph.nodes.filter(node => node.type === 'event-key-press');
            keyPressNodes.forEach(nodeData => {
                const nodeConfig = NODE_TYPES[nodeData.type];
                const keyNameValue = nodeData.values.keyName || nodeConfig.inputs.keyName.default; // Use stored or default
                const targetKey = String(keyNameValue).toUpperCase();
                if (keyState[targetKey]) {
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

            this._performNodeAction(targetNodeData, targetNodeConfig);

            // If the action node itself has a primary flow output, continue from it.
            // Branch nodes are handled inside _performNodeAction.
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
                    if (Boolean(condition)) { // Evaluate condition as boolean
                        this._executeFlow(nodeData.id, 'flowOutTrue', new Set()); // Pass new Set for fresh loop detection per branch
                    } else {
                        this._executeFlow(nodeData.id, 'flowOutFalse', new Set());
                    }
                    break;
                }
            }
        } catch (e) {
            customConsole.error(`Error executing node ${nodeData.type} (ID: ${nodeData.id}): ${e.message}`);
        }
    }

    _evaluatePinValue(nodeId, inputPinName, pinConfig) {
        const connection = this.graph.connections.find(
            conn => conn.toNodeId === nodeId && conn.toPinName === inputPinName
        );

        if (connection) {
            const sourceNodeData = this.graph.nodes.find(n => n.id === connection.fromNodeId);
            const sourceNodeConfig = NODE_TYPES[sourceNodeData.type];
            if (!sourceNodeData || !sourceNodeConfig) {
                this.graph.executionContext.customConsole.error(`Source node for pin ${inputPinName} on node ${nodeId} not found.`);
                return pinConfig.default !== undefined ? pinConfig.default : null;
            }
            
            if (sourceNodeConfig.type === 'value') {
                const outputPinName = connection.fromPinName; 
                if (sourceNodeData.type === 'value-number') {
                    return parseFloat(sourceNodeData.values.value);
                } else if (sourceNodeData.type === 'value-string') {
                    return String(sourceNodeData.values.value);
                }
            }
            this.graph.executionContext.customConsole.warn(`Data flow from non-value node type '${sourceNodeData.type}' not fully implemented yet for pin ${inputPinName}.`);
            return pinConfig.default !== undefined ? pinConfig.default : null;

        } else {
            const nodeData = this.graph.nodes.find(n => n.id === nodeId);
            let val = nodeData.values[inputPinName];
            if (pinConfig.type === 'number' && typeof val !== 'number') val = parseFloat(val);
            if (pinConfig.type === 'string' && typeof val !== 'string') val = String(val);
            return val;
        }
    }
}