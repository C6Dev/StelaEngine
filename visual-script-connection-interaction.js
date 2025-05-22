// visual-script-connection-interaction.js
import * as DOM from './dom-elements.js';
import * as ConnectionDOM from './visual-script-connection-dom.js';

export class VisualScriptConnectionInteraction {
    constructor(interactionManager) {
        this.manager = interactionManager; // Main VisualScriptInteractionManager

        this.isDrawingConnection = false;
        this.pendingConnection = {
            line: null,
            fromNodeId: null,
            fromPinName: null,
            fromPinElement: null,
            type: null,      // 'input' or 'output' of the originating pin
            dataType: null   // 'flow', 'number', 'string', etc. of the originating pin
        };

        // Bind methods
        this.handlePinClick = this.handlePinClick.bind(this);
        this._onDrawingConnectionMouseMove = this._onDrawingConnectionMouseMove.bind(this);
        this._onDrawingConnectionMouseUp = this._onDrawingConnectionMouseUp.bind(this);
        this.handleSvgDblClick = this.handleSvgDblClick.bind(this);
    }

    _getPinLogicalPosition(pinElement) {
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
        const pinRect = pinElement.getBoundingClientRect();
        const { panX, panY, currentScale } = this.manager.getTransform();

        // Center of the pin in screen coordinates relative to the graph container
        const screenRelX = pinRect.left - graphRect.left + pinRect.width / 2;
        const screenRelY = pinRect.top - graphRect.top + pinRect.height / 2;

        // Convert to logical coordinates
        const logicalX = (screenRelX - panX) / currentScale;
        const logicalY = (screenRelY - panY) / currentScale;
        return { x: logicalX, y: logicalY };
    }

    handlePinClick(event, nodeId, pinName, pinType, dataType) {
        event.stopPropagation(); // Prevent node drag or other underlying listeners
        const pinElement = event.currentTarget;
        const graph = this.manager.getGraph();

        if (!this.isDrawingConnection) { // Start drawing a new connection
            this.isDrawingConnection = true;
            this.pendingConnection.fromNodeId = nodeId;
            this.pendingConnection.fromPinName = pinName;
            this.pendingConnection.fromPinElement = pinElement;
            this.pendingConnection.type = pinType; // 'input' or 'output'
            this.pendingConnection.dataType = dataType;

            const startPosLogical = this._getPinLogicalPosition(pinElement);
            this.pendingConnection.line = ConnectionDOM.createConnectionLineElement('pending', true);
            ConnectionDOM.updateConnectionLineElement(this.pendingConnection.line, startPosLogical, startPosLogical);

            document.addEventListener('mousemove', this._onDrawingConnectionMouseMove);
            document.addEventListener('mouseup', this._onDrawingConnectionMouseUp, { once: true });

        } else { // Complete or cancel an existing connection attempt
             // Ensure global mouse listeners are removed if this click completes the action
            document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove);
            // document.removeEventListener('mouseup', this._onDrawingConnectionMouseUp); // This is {once:true} for the drag
            
            // Prevent connecting a pin to itself or its own node in a way that makes no sense
            if (this.pendingConnection.fromNodeId === nodeId && this.pendingConnection.fromPinName === pinName) {
                this._cancelDrawingConnection();
                return;
            }
            // Prevent connecting output to output, or input to input
            if (this.pendingConnection.type === pinType) {
                graph.executionContext.customConsole.warn("Cannot connect pin of same type (e.g., output to output).");
                this._cancelDrawingConnection();
                return;
            }
            // Prevent connecting flow to data or vice-versa
            const isFlowToFlow = this.pendingConnection.dataType === 'flow' && dataType === 'flow';
            const isDataToData = this.pendingConnection.dataType !== 'flow' && dataType !== 'flow';
            if (!isFlowToFlow && !isDataToData) {
                graph.executionContext.customConsole.warn(`Connection type mismatch: Cannot connect ${this.pendingConnection.dataType} to ${dataType}.`);
                this._cancelDrawingConnection();
                return;
            }
            // TODO: Add specific data type matching (e.g. number to number, but not number to string unless explicit conversion node exists)

            if (this.pendingConnection.line) {
                ConnectionDOM.removeConnectionLineElement(this.pendingConnection.line);
            }

            // Determine 'from' and 'to' based on which pin was 'output' and which was 'input'
            const fromNodeId = this.pendingConnection.type === 'output' ? this.pendingConnection.fromNodeId : nodeId;
            const fromPinName = this.pendingConnection.type === 'output' ? this.pendingConnection.fromPinName : pinName;
            const toNodeId = this.pendingConnection.type === 'input' ? this.pendingConnection.fromNodeId : nodeId;
            const toPinName = this.pendingConnection.type === 'input' ? this.pendingConnection.fromPinName : pinName;

            graph._addConnectionInternal(fromNodeId, fromPinName, toNodeId, toPinName);
            this._resetPendingConnectionState();
        }
    }

    _onDrawingConnectionMouseMove(event) {
        if (!this.isDrawingConnection || !this.pendingConnection.line) return;
        
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
        const { panX, panY, currentScale } = this.manager.getTransform();

        // Mouse position in screen coordinates relative to the graph container
        const mouseScreenRelX = event.clientX - graphRect.left;
        const mouseScreenRelY = event.clientY - graphRect.top;

        // Convert to logical coordinates for the end of the line
        const mouseLogicalX = (mouseScreenRelX - panX) / currentScale;
        const mouseLogicalY = (mouseScreenRelY - panY) / currentScale;
        
        const startPosLogical = this._getPinLogicalPosition(this.pendingConnection.fromPinElement);
        ConnectionDOM.updateConnectionLineElement(this.pendingConnection.line, startPosLogical, { x: mouseLogicalX, y: mouseLogicalY });
    }

    _onDrawingConnectionMouseUp(event) {
        // This mouseup is on the document. If it's not over a valid pin, cancel.
        // If it IS over a valid pin, that pin's own mousedown/click handler (handlePinClick) should have fired
        // and already completed the connection or cancelled it.
        // So, if we reach here, it means the mouse was released not over a valid target pin.
        
        const targetPinElement = event.target.closest('.vs-pin');
        
        // If the mouseup is on a pin, handlePinClick would have managed it.
        // If it's not on a pin, or if it's on the starting pin, cancel.
        if (!targetPinElement || targetPinElement === this.pendingConnection.fromPinElement) {
             this._cancelDrawingConnection();
        }
        // If targetPinElement is valid and different, handlePinClick should have already been called.
        // Redundant removal of listeners just in case.
        document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove);
    }

    _cancelDrawingConnection() {
        if (this.pendingConnection.line) {
            ConnectionDOM.removeConnectionLineElement(this.pendingConnection.line);
        }
        this._resetPendingConnectionState();
        // Ensure global listeners are removed
        document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove);
        document.removeEventListener('mouseup', this._onDrawingConnectionMouseUp); // Should be {once:true} but good to be safe
    }

    _resetPendingConnectionState() {
        this.isDrawingConnection = false;
        this.pendingConnection.line = null;
        this.pendingConnection.fromNodeId = null;
        this.pendingConnection.fromPinName = null;
        this.pendingConnection.fromPinElement = null;
        this.pendingConnection.type = null;
        this.pendingConnection.dataType = null;
    }

    handleSvgDblClick(event) {
        if (event.target.tagName === 'line' && event.target.classList.contains('vs-connection-line')) {
            const connectionId = parseInt(event.target.dataset.connectionId);
            if (!isNaN(connectionId)) {
                this.manager.getGraph().removeConnection(connectionId);
            }
        }
    }
    
    destroy() {
        // Clean up document listeners if a connection drawing was active
        if (this.isDrawingConnection) {
            this._cancelDrawingConnection(); // This should also remove listeners
        }
    }
}