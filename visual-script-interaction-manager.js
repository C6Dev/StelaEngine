// visual-script-interaction-manager.js
import * as DOM from './dom-elements.js';
import * as NodeDOM from './visual-script-node-dom.js';
// import * as ConnectionDOM from './visual-script-connection-dom.js'; // Not directly used by manager
import { VisualScriptViewControls } from './visual-script-view-controls.js';
import { VisualScriptNodeInteraction } from './visual-script-node-interaction.js';
import { VisualScriptConnectionInteraction } from './visual-script-connection-interaction.js';

export class VisualScriptInteractionManager {
    constructor(graphInstance) {
        this.graph = graphInstance; 

        this.selectedNodes = new Set(); 
        
        this.panX = 0;
        this.panY = 0;
        this.currentScale = 1.0;
        this.minScale = 0.2;
        this.maxScale = 3.0;

        this.viewControls = new VisualScriptViewControls(this);
        this.nodeInteraction = new VisualScriptNodeInteraction(this);
        this.connectionInteraction = new VisualScriptConnectionInteraction(this);

        this._onGraphWheelHandler = this.viewControls.handleGraphWheel.bind(this.viewControls);
        this._onGraphMouseDownHandler = this.viewControls.handleGraphMouseDown.bind(this.viewControls);
        this._onSvgDblClickHandler = this.connectionInteraction.handleSvgDblClick.bind(this.connectionInteraction);
        this._onGraphContextMenuHandler = this.viewControls._onGraphContextMenu.bind(this.viewControls); 

        this.boundHandleNodeMouseDown = this.nodeInteraction.handleNodeMouseDown;
        this.boundHandlePinClick = this.connectionInteraction.handlePinClick;

        this._initEventListeners();
    }

    _initEventListeners() {
        DOM.visualScriptSvgLayer.addEventListener('dblclick', this._onSvgDblClickHandler);
        DOM.visualScriptGraphContainer.addEventListener('wheel', this._onGraphWheelHandler, { passive: false });
        DOM.visualScriptGraphContainer.addEventListener('mousedown', this._onGraphMouseDownHandler);
        DOM.visualScriptGraphContainer.addEventListener('contextmenu', this._onGraphContextMenuHandler); 
    }

    // --- Methods for sub-managers to access/modify shared state ---
    getGraph() { return this.graph; }
    getTransform() { return { panX: this.panX, panY: this.panY, currentScale: this.currentScale }; }
    getSelectedNodes() { return this.selectedNodes; }

    updateSelectedNodesVisuals() {
        this.graph.nodes.forEach(node => {
            NodeDOM.setNodeSelectedVisualState(node.element, this.selectedNodes.has(node.id));
        });
    }

    clearSelection(updateVisuals = true) {
        this.selectedNodes.clear();
        if (updateVisuals) {
            this.updateSelectedNodesVisuals();
        }
    }

    selectNode(nodeId, additive = false) {
        if (!additive) {
            this.clearSelection(false); 
        }
        this.selectedNodes.add(nodeId);
        this.updateSelectedNodesVisuals();
    }

    toggleNodeSelection(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.selectedNodes.delete(nodeId);
        } else {
            this.selectedNodes.add(nodeId);
        }
        this.updateSelectedNodesVisuals();
    }
    
    setPan(newPanX, newPanY) {
        this.panX = newPanX;
        this.panY = newPanY;
        this._applyCurrentTransformToDOM();
    }

    updateScale(factor, mouseX, mouseY) { 
        const oldScale = this.currentScale;
        let newScale = oldScale * factor;
        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        
        if (newScale === oldScale) return;

        this.currentScale = newScale;
        
        this.panX = mouseX - (mouseX - this.panX) * (newScale / oldScale);
        this.panY = mouseY - (mouseY - this.panY) * (newScale / oldScale);
        
        this._applyCurrentTransformToDOM();
    }

    _applyCurrentTransformToDOM() {
        const transformValue = `translate(${this.panX}px, ${this.panY}px) scale(${this.currentScale})`;
        DOM.visualScriptNodesContainer.style.transform = transformValue;
        DOM.visualScriptSvgLayer.style.transform = transformValue;
    }
    
    redrawConnections() {
        this.graph.redrawAllConnections();
    }

    requestShowNodeContextMenu(screenClickX, screenClickY) { 
        if (this.graph && this.graph.onContextMenuRequested) {
            const logicalX = (screenClickX - this.panX) / this.currentScale;
            const logicalY = (screenClickY - this.panY) / this.currentScale;
            this.graph.onContextMenuRequested(logicalX, logicalY, screenClickX, screenClickY);
        }
    }


    destroy() {
        DOM.visualScriptSvgLayer.removeEventListener('dblclick', this._onSvgDblClickHandler);
        DOM.visualScriptGraphContainer.removeEventListener('wheel', this._onGraphWheelHandler);
        DOM.visualScriptGraphContainer.removeEventListener('mousedown', this._onGraphMouseDownHandler);
        DOM.visualScriptGraphContainer.removeEventListener('contextmenu', this._onGraphContextMenuHandler); 

        this.viewControls.destroy();
        this.nodeInteraction.destroy();
        this.connectionInteraction.destroy();
        
        this.selectedNodes.clear();
    }

    // --- Tombstone comments for moved logic ---

    // removed: selectedNodesDragOffsets Map;
    // removed: isDraggingNode, draggedNodeData, dragOffsetX, dragOffsetY;
    // removed: isDrawingConnection, pendingConnection object;
    // removed: isPanningGraph, panStartMouseX, panStartMouseY, panStartPanX, panStartPanY;
    // removed: isMarqueeSelecting, marqueeStartX, marqueeStartY;

    // removed function: _updateSelectedNodesVisuals() {} // Now on manager, called by sub-managers
    // removed function: _clearSelection() {} // Now on manager
    // removed function: _selectNode() {} // Now on manager
    // removed function: _toggleNodeSelection() {} // Now on manager
    // removed function: _applyCurrentTransform() {} // Renamed to _applyCurrentTransformToDOM and on manager
    
    // removed function: _onGraphWheel(event) {} // Moved to VisualScriptViewControls
    // removed function: _onGraphMouseDown(event) {} // Moved to VisualScriptViewControls
    // removed function: _onGraphMouseMove(event) {} // Moved to VisualScriptViewControls
    // removed function: _onGraphMouseUp(event) {} // Moved to VisualScriptViewControls
    
    // removed function: handleNodeMouseDown(event, nodeId) {} // Moved to VisualScriptNodeInteraction
    // removed function: _onNodeMouseMove(event) {} // Moved to VisualScriptNodeInteraction
    // removed function: _onNodeMouseUp() {} // Moved to VisualScriptNodeInteraction
    
    // removed function: getPinGlobalPosition(pinElement) {} // Moved to VisualScriptConnectionInteraction as _getPinLogicalPosition
    // removed function: handlePinClick(event, nodeId, pinName, pinType, dataType) {} // Moved to VisualScriptConnectionInteraction
    // removed function: _onDrawingConnectionMouseMove(event) {} // Moved to VisualScriptConnectionInteraction
    // removed function: _onDrawingConnectionMouseUp(event) {} // Moved to VisualScriptConnectionInteraction
    // removed function: _cancelDrawingConnection() {} // Moved to VisualScriptConnectionInteraction
    // removed function: _resetPendingConnection() {} // Moved to VisualScriptConnectionInteraction as _resetPendingConnectionState
    
    // removed function: _onSvgDblClick(event) {} // Moved to VisualScriptConnectionInteraction
}