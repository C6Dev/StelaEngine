// visual-script-node-interaction.js
import * as DOM from './dom-elements.js';
import * as NodeDOM from './visual-script-node-dom.js';

export class VisualScriptNodeInteraction {
    constructor(interactionManager) {
        this.manager = interactionManager; // Main VisualScriptInteractionManager

        this.isDraggingNode = false;
        this.draggedNodeData = null; // Primary node being dragged
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.selectedNodesDragOffsets = new Map(); // Stores { dx, dy } for multi-drag

        // Bind methods
        this.handleNodeMouseDown = this.handleNodeMouseDown.bind(this);
        this._onNodeMouseMove = this._onNodeMouseMove.bind(this);
        this._onNodeMouseUp = this._onNodeMouseUp.bind(this);
    }

    handleNodeMouseDown(event, nodeId) {
        event.preventDefault();
        event.stopPropagation(); // Prevent graph's mousedown handler

        const graph = this.manager.getGraph();
        const nodeData = graph.nodes.find(n => n.id === nodeId);
        if (!nodeData) return;

        if (event.shiftKey) {
            this.manager.toggleNodeSelection(nodeId);
        } else {
            if (!this.manager.selectedNodes.has(nodeId)) {
                this.manager.selectNode(nodeId, false); // New selection, not additive
            }
            // If it is already selected (and shift is not pressed), we are initiating a drag of current selection
        }

        if (this.manager.selectedNodes.has(nodeId)) { // Check if the current node is part of the selection to be dragged
            this.isDraggingNode = true;
            this.draggedNodeData = nodeData; // The node directly clicked is the primary reference for drag offsets

            const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
            const { panX, panY, currentScale } = this.manager.getTransform();
            
            // Calculate initial drag offset relative to the primary dragged node's top-left
            // Node's X/Y are logical, so convert to screen first
            const primaryNodeScreenX = nodeData.x * currentScale + panX;
            const primaryNodeScreenY = nodeData.y * currentScale + panY;
            
            this.dragOffsetX = (event.clientX - graphRect.left) - primaryNodeScreenX;
            this.dragOffsetY = (event.clientY - graphRect.top) - primaryNodeScreenY;

            this.selectedNodesDragOffsets.clear();
            this.manager.selectedNodes.forEach(selectedId => {
                const sNode = graph.nodes.find(n => n.id === selectedId);
                if (sNode && sNode.element) {
                    sNode.element.classList.add('dragging');
                    // Store offset relative to the primary dragged node (nodeData)
                    this.selectedNodesDragOffsets.set(selectedId, {
                        dx: sNode.x - nodeData.x,
                        dy: sNode.y - nodeData.y
                    });
                }
            });

            document.addEventListener('mousemove', this._onNodeMouseMove);
            document.addEventListener('mouseup', this._onNodeMouseUp, { once: true });
        }
    }

    _onNodeMouseMove(event) {
        if (!this.isDraggingNode || !this.draggedNodeData) return;
        event.preventDefault();

        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
        const { panX, panY, currentScale } = this.manager.getTransform();
        const graph = this.manager.getGraph();

        // Mouse position in screen coordinates, relative to the graph container
        const mouseScreenRelX = event.clientX - graphRect.left;
        const mouseScreenRelY = event.clientY - graphRect.top;

        // New top-left screen position for the primary dragged node
        const primaryNodeNewScreenX = mouseScreenRelX - this.dragOffsetX;
        const primaryNodeNewScreenY = mouseScreenRelY - this.dragOffsetY;

        // Convert to new logical position for the primary dragged node
        const primaryNodeNewLogicalX = (primaryNodeNewScreenX - panX) / currentScale;
        const primaryNodeNewLogicalY = (primaryNodeNewScreenY - panY) / currentScale;

        // Update primary dragged node
        this.draggedNodeData.x = primaryNodeNewLogicalX;
        this.draggedNodeData.y = primaryNodeNewLogicalY;
        NodeDOM.updateNodeElementPosition(this.draggedNodeData.element, primaryNodeNewLogicalX, primaryNodeNewLogicalY);
        graph.updateConnectionsForNode(this.draggedNodeData.id);

        // Update other selected nodes based on their stored offsets from the primary node
        this.manager.selectedNodes.forEach(selectedId => {
            if (selectedId === this.draggedNodeData.id) return; // Already updated

            const sNodeToMove = graph.nodes.find(n => n.id === selectedId);
            const offset = this.selectedNodesDragOffsets.get(selectedId);
            if (sNodeToMove && offset) {
                sNodeToMove.x = primaryNodeNewLogicalX + offset.dx;
                sNodeToMove.y = primaryNodeNewLogicalY + offset.dy;
                NodeDOM.updateNodeElementPosition(sNodeToMove.element, sNodeToMove.x, sNodeToMove.y);
                graph.updateConnectionsForNode(selectedId);
            }
        });
    }

    _onNodeMouseUp(event) {
        if (!this.isDraggingNode) return;
        this.isDraggingNode = false;

        const graph = this.manager.getGraph();
        this.manager.selectedNodes.forEach(id => {
            const node = graph.nodes.find(n => n.id === id);
            if (node && node.element) {
                node.element.classList.remove('dragging');
            }
        });

        this.draggedNodeData = null;
        this.selectedNodesDragOffsets.clear();
        document.removeEventListener('mousemove', this._onNodeMouseMove);
        // mouseup listener is {once: true}
    }
    
    destroy() {
        // Clean up document listeners if a drag was active during destroy
        if (this.isDraggingNode) {
            document.removeEventListener('mousemove', this._onNodeMouseMove);
            document.removeEventListener('mouseup', this._onNodeMouseUp);
        }
    }
}
