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
        this._completeConnectionAttempt = this._completeConnectionAttempt.bind(this);
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

        if (!this.isDrawingConnection) { // Start drawing a new connection
            this.isDrawingConnection = true;
            this.pendingConnection.fromNodeId = parseInt(nodeId);
            this.pendingConnection.fromPinName = pinName;
            this.pendingConnection.fromPinElement = pinElement;
            this.pendingConnection.type = pinType; // 'input' or 'output'
            this.pendingConnection.dataType = dataType;

            const startPosLogical = this._getPinLogicalPosition(pinElement);
            this.pendingConnection.line = ConnectionDOM.createConnectionLineElement('pending', true);
            ConnectionDOM.updateConnectionLineElement(this.pendingConnection.line, startPosLogical, startPosLogical);

            document.addEventListener('mousemove', this._onDrawingConnectionMouseMove);
            document.addEventListener('mouseup', this._onDrawingConnectionMouseUp, { once: true });

        } else { // Mousedown on a pin WHILE already drawing: complete connection
            document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove); // Stop further mousemoves for this drag
            // The mouseup listener on document ({once:true}) will still fire and call _onDrawingConnectionMouseUp.
            // _onDrawingConnectionMouseUp will see isDrawingConnection is false (if this succeeds) and do minimal cleanup.
            this._completeConnectionAttempt(parseInt(nodeId), pinName, pinType, dataType);
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
        document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove); // Ensure mousemove is always cleaned up

        if (!this.isDrawingConnection) {
            // If not drawing (e.g., connection completed by mousedown, or cancelled prior),
            // ensure any lingering pending line is gone.
            this._cancelDrawingConnection(); // This is safe to call even if already cancelled.
            return;
        }

        const targetPinElement = event.target.closest('.vs-pin');
        if (targetPinElement && targetPinElement !== this.pendingConnection.fromPinElement) {
            // Mouseup is on a valid, different pin. Treat this as completion.
            const toNodeId = targetPinElement.dataset.nodeId;
            const toPinName = targetPinElement.dataset.pinName;
            const toPinType = targetPinElement.dataset.pinType;
            const toDataType = targetPinElement.dataset.dataType;

            this._completeConnectionAttempt(
                parseInt(toNodeId),
                toPinName,
                toPinType,
                toDataType
            );
        } else {
            // Mouseup was not on a valid target pin, or on the starting pin. Cancel.
            this._cancelDrawingConnection();
        }
    }
    
    _completeConnectionAttempt(toNodeId, toPinName, toPinType, toDataType) {
        const graph = this.manager.getGraph();

        // Prevent connecting a pin to itself is implicitly handled by the fromPinElement check in mouseup
        // and would require a very specific sequence for mousedown completion (click A, click A again while drawing)
        if (this.pendingConnection.fromNodeId === toNodeId && this.pendingConnection.fromPinName === toPinName) {
            this._cancelDrawingConnection();
            return;
        }
        // Prevent connecting output to output, or input to input
        if (this.pendingConnection.type === toPinType) {
            graph.executionContext.customConsole.warn("Cannot connect pin of same type (e.g., output to output).");
            this._cancelDrawingConnection();
            return;
        }
        // Prevent connecting flow to data or vice-versa
        const isFlowToFlow = this.pendingConnection.dataType === 'flow' && toDataType === 'flow';
        const isDataToData = this.pendingConnection.dataType !== 'flow' && toDataType !== 'flow';
        if (!isFlowToFlow && !isDataToData) {
            graph.executionContext.customConsole.warn(`Connection type mismatch: Cannot connect ${this.pendingConnection.dataType} to ${toDataType}.`);
            this._cancelDrawingConnection();
            return;
        }
        // TODO: Add specific data type matching (e.g. number to number, but not number to string unless explicit conversion node exists)

        if (this.pendingConnection.line) {
            ConnectionDOM.removeConnectionLineElement(this.pendingConnection.line);
        }

        // Determine 'from' and 'to' based on which pin was 'output' and which was 'input'
        const finalFromNodeId = this.pendingConnection.type === 'output' ? this.pendingConnection.fromNodeId : toNodeId;
        const finalFromPinName = this.pendingConnection.type === 'output' ? this.pendingConnection.fromPinName : toPinName;
        const finalToNodeId = this.pendingConnection.type === 'input' ? this.pendingConnection.fromNodeId : toNodeId;
        const finalToPinName = this.pendingConnection.type === 'input' ? this.pendingConnection.fromPinName : toPinName;
        
        graph._addConnectionInternal(finalFromNodeId, finalFromPinName, finalToNodeId, finalToPinName);
        this._resetPendingConnectionState();
    }


    _cancelDrawingConnection() {
        if (this.pendingConnection.line) {
            ConnectionDOM.removeConnectionLineElement(this.pendingConnection.line);
        }
        this._resetPendingConnectionState();
        // Ensure global listeners are removed (mousemove specifically, mouseup is {once:true})
        document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove);
    }

    _resetPendingConnectionState() {
        this.isDrawingConnection = false;
        this.pendingConnection.line = null;
        this.pendingConnection.fromNodeId = null;
        this.pendingConnection.fromPinName = null;
        this.pendingConnection.fromPinElement = null;
        this.pendingConnection.type = null;
        this.pendingConnection.dataType = null;
        // Ensure mousemove listener is removed when connection drawing state is reset,
        // regardless of how it was reset (cancel or success).
        document.removeEventListener('mousemove', this._onDrawingConnectionMouseMove);
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