// visual-script-graph.js
import * as THREE from 'three';
import * as DOM from './dom-elements.js';
import { NODE_TYPES } from './visual-script-node-types.js';
import * as NodeDOM from './visual-script-node-dom.js';
import * as ConnectionDOM from './visual-script-connection-dom.js';
import { VisualScriptInteractionManager } from './visual-script-interaction-manager.js';
import { VisualScriptExecutionManager } from './visual-script-execution-manager.js';

export class VisualScriptGraph {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.nodeIdCounter = 0;
        this.connectionIdCounter = 0;

        this.interactionManager = new VisualScriptInteractionManager(this);
        this.executionManager = new VisualScriptExecutionManager(this);

        this.executionContext = {
            gameObject: null,
            sceneObjects: {},
            keyState: {},
            game: null,
            customConsole: console
        };

        // Handlers for NodeDOM are now obtained from the interactionManager instance
        this._handleNodeMouseDown = this.interactionManager.boundHandleNodeMouseDown;
        this._handlePinClick = this.interactionManager.boundHandlePinClick;

        this._removeNodeAndConnections = this.removeNodeAndConnections.bind(this);
        this._isInputPinConnected = this._isInputPinConnected.bind(this);
    }

    setContext(gameObject, sceneObjects, keyState, gameContext, customConsole) {
        this.executionContext.gameObject = gameObject;
        this.executionContext.sceneObjects = sceneObjects;
        this.executionContext.keyState = keyState;
        this.executionContext.game = gameContext;
        this.executionContext.customConsole = customConsole || console;
    }

    addNode(type, x = 50, y = 50) {
        const config = NODE_TYPES[type];
        if (!config) {
            this.executionContext.customConsole.error("Unknown node type:", type);
            return null;
        }
        this.nodeIdCounter++;
        const newNodeData = {
            id: this.nodeIdCounter,
            type: type,
            x: x,
            y: y,
            values: {},
            element: null
        };

        Object.entries(config.inputs).forEach(([inputName, inputConfig]) => {
            if (inputConfig.default !== undefined) {
                newNodeData.values[inputName] = inputConfig.default;
            } else if (inputConfig.type === 'number') {
                newNodeData.values[inputName] = 0;
            } else if (inputConfig.type === 'string') {
                newNodeData.values[inputName] = '';
            }
        });

        const eventHandlers = {
            onValueChange: this._handleNodeValueChange.bind(this),
            onMouseDown: this._handleNodeMouseDown, // Uses the bound method from interactionManager
            onPinClick: this._handlePinClick,       // Uses the bound method from interactionManager
            isInputPinConnected: this._isInputPinConnected,
            onNodeDeleteRequest: this._removeNodeAndConnections
        };
        newNodeData.element = NodeDOM.createNodeElement(newNodeData, config, eventHandlers);
        this.nodes.push(newNodeData);
        return newNodeData;
    }

    _isInputPinConnected(nodeId, pinName) {
        return this.connections.some(conn => conn.toNodeId === nodeId && conn.toPinName === pinName);
    }

    _handleNodeValueChange(nodeId, valueKey, value) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.values[valueKey] = value;
        }
    }

    removeNodeAndConnections(nodeId) {
        const nodeIndex = this.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex > -1) {
            const nodeToRemove = this.nodes[nodeIndex];
            NodeDOM.removeNodeElement(nodeToRemove.element);
            this.nodes.splice(nodeIndex, 1);

            // Remove connections associated with this node
            const connectionsToRemove = this.connections.filter(
                conn => conn.fromNodeId === nodeId || conn.toNodeId === nodeId
            );
            connectionsToRemove.forEach(conn => this.removeConnection(conn.id));

            this.executionContext.customConsole.log(`Node ${nodeToRemove.type} (ID: ${nodeId}) and its connections removed.`);
        }
    }

    _addConnectionInternal(fromNodeId, fromPinName, toNodeId, toPinName) {
        const toNode = this.nodes.find(n => n.id === toNodeId);
        const toNodeConfig = NODE_TYPES[toNode.type];
        const toPinConfig = toNodeConfig.inputs[toPinName];

        if (toPinConfig && toPinConfig.type !== 'flow') {
            const existingInputConnection = this.connections.find(c => c.toNodeId === toNodeId && c.toPinName === toPinName);
            if (existingInputConnection) {
                this.executionContext.customConsole.warn(`Input pin ${toPinName} on node ${toNodeId} is already connected. Removing existing connection.`);
                this.removeConnection(existingInputConnection.id);
            }
        }

        this.connectionIdCounter++;
        const newConnectionData = {
            id: this.connectionIdCounter,
            fromNodeId: fromNodeId,
            fromPinName: fromPinName,
            toNodeId: toNodeId,
            toPinName: toPinName,
            lineElement: null
        };
        newConnectionData.lineElement = ConnectionDOM.createConnectionLineElement(newConnectionData.id);
        this.connections.push(newConnectionData);
        this._drawSingleConnection(newConnectionData);

        // Ensure the input field is disabled if it's now connected
        if (toNode && toNode.element && toPinConfig && toPinConfig.type !== 'flow' && !toPinConfig.noPin) {
             NodeDOM.updateNodeInputFieldsDisabledState(toNode.element, toNode.id, toNodeConfig, this._isInputPinConnected);
        }
        return newConnectionData;
    }

    _drawSingleConnection(connectionData) {
        const fromNode = this.nodes.find(n => n.id === connectionData.fromNodeId);
        const toNode = this.nodes.find(n => n.id === connectionData.toNodeId);
        if (!fromNode || !toNode || !fromNode.element || !toNode.element) return;

        const fromPinEl = fromNode.element.querySelector(`.vs-pin[data-pin-name="${connectionData.fromPinName}"][data-pin-type="output"]`);
        const toPinEl = toNode.element.querySelector(`.vs-pin[data-pin-name="${connectionData.toPinName}"][data-pin-type="input"]`);
        if (!fromPinEl || !toPinEl) return;

        // Get pin positions through the interaction manager's helper, which accounts for pan/zoom
        // The connection interaction sub-module now has _getPinLogicalPosition.
        // For drawing, we need logical positions.
        const startPos = this.interactionManager.connectionInteraction._getPinLogicalPosition(fromPinEl);
        const endPos = this.interactionManager.connectionInteraction._getPinLogicalPosition(toPinEl);
        ConnectionDOM.updateConnectionLineElement(connectionData.lineElement, startPos, endPos);
    }

    updateConnectionsForNode(nodeId) {
        this.connections.forEach(conn => {
            if (conn.fromNodeId === nodeId || conn.toNodeId === nodeId) {
                this._drawSingleConnection(conn);
            }
        });
    }

    removeConnection(connectionId) {
        const connIndex = this.connections.findIndex(c => c.id === connectionId);
        if (connIndex > -1) {
            const conn = this.connections[connIndex];
            ConnectionDOM.removeConnectionLineElement(conn.lineElement);
            this.connections.splice(connIndex, 1);

            const toNode = this.nodes.find(n => n.id === conn.toNodeId);
            if (toNode && toNode.element) {
                const toNodeConfig = NODE_TYPES[toNode.type];
                const toPinConfig = toNodeConfig.inputs[conn.toPinName];
                 if (toPinConfig && toPinConfig.type !== 'flow' && !toPinConfig.noPin) {
                    NodeDOM.updateNodeInputFieldsDisabledState(toNode.element, toNode.id, toNodeConfig, this._isInputPinConnected);
                }
            }
        }
    }

    clear() {
        this.nodes.forEach(node => NodeDOM.removeNodeElement(node.element));
        this.connections.forEach(conn => ConnectionDOM.removeConnectionLineElement(conn.lineElement));

        this.nodes = [];
        this.connections = [];
        this.nodeIdCounter = 0;
        this.connectionIdCounter = 0;
        if (this.interactionManager && this.interactionManager.connectionInteraction) {
            // Corrected call to the method on the connectionInteraction sub-manager
            this.interactionManager.connectionInteraction._resetPendingConnectionState();
        }
    }

    getState() {
        return {
            nodes: this.nodes.map(n => ({
                id: n.id, type: n.type, x: n.x, y: n.y, values: {...n.values}
            })),
            connections: this.connections.map(c => ({
                id: c.id, fromNodeId: c.fromNodeId, fromPinName: c.fromPinName,
                toNodeId: c.toNodeId, toPinName: c.toPinName
            })),
            nodeIdCounter: this.nodeIdCounter,
            connectionIdCounter: this.connectionIdCounter
        };
    }

    loadState(stateData) {
        this.clear();
        if (stateData && stateData.nodes && stateData.connections) {
            this.nodeIdCounter = stateData.nodeIdCounter || 0;
            this.connectionIdCounter = stateData.connectionIdCounter || 0;

            stateData.nodes.forEach(nodeSaveData => {
                const config = NODE_TYPES[nodeSaveData.type];
                if (!config) return;

                const newNodeData = {
                    id: nodeSaveData.id,
                    type: nodeSaveData.type,
                    x: nodeSaveData.x,
                    y: nodeSaveData.y,
                    values: {...nodeSaveData.values},
                    element: null
                };
                 const eventHandlers = {
                    onValueChange: this._handleNodeValueChange.bind(this),
                    onMouseDown: this._handleNodeMouseDown,
                    onPinClick: this._handlePinClick,
                    isInputPinConnected: this._isInputPinConnected,
                    onNodeDeleteRequest: this._removeNodeAndConnections // Add handler for deletion
                };
                newNodeData.element = NodeDOM.createNodeElement(newNodeData, config, eventHandlers);
                this.nodes.push(newNodeData);
                NodeDOM.updateNodeInputFieldsDisabledState(newNodeData.element, newNodeData.id, config, this._isInputPinConnected);
            });

            stateData.connections.forEach(connSaveData => {
                const newConn = this._addConnectionInternal(
                    connSaveData.fromNodeId, connSaveData.fromPinName,
                    connSaveData.toNodeId, connSaveData.toPinName
                );
                if(newConn && connSaveData.id) newConn.id = connSaveData.id;
            });
        } else {
             this.addNode(NODE_TYPES['event-start'] ? 'event-start' : Object.keys(NODE_TYPES)[0] , 50, 50);
        }
    }

    redrawAllConnections() {
        this.connections.forEach(conn => this._drawSingleConnection(conn));
    }

    executeEvent(eventType) {
        this.executionManager.executeEvent(eventType);
    }

    destroy() {
        if (this.interactionManager) {
            this.interactionManager.destroy();
        }
        this.clear();
    }
}