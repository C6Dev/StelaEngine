import * as THREE from 'three';
import { NODE_TYPES } from './visual-script-node-types.js';

// Helper function to indent a block of code
function indentCode(codeBlock, indentString = "  ") {
    if (!codeBlock || codeBlock.trim() === "") return "";
    return codeBlock.split('\n')
        .filter(line => line.trim() !== "")
        .map(line => `${indentString}${line}`)
        .join('\n') + '\n';
}

export function convertVisualScriptToStela(graphData) {
    let stelaOutput = "// Converted from Visual Script\n";
    const { nodes, connections } = graphData;

    const getNode = (id) => nodes.find(n => n.id === id);

    function getInputValue(nodeId, pinName, nodeConfig) {
        const node = getNode(nodeId);
        const inputPinDetails = nodeConfig.inputs[pinName];

        const connection = connections.find(c => c.toNodeId === nodeId && c.toPinName === pinName);
        if (connection) {
            const sourceNode = getNode(connection.fromNodeId);
            if (sourceNode) {
                const sourceNodeConfig = NODE_TYPES[sourceNode.type];
                if (sourceNodeConfig && sourceNodeConfig.type === 'value') {
                    const connectedValue = sourceNode.values.value; 

                    if (inputPinDetails.type === 'boolean') {
                        if (sourceNode.type === 'value-string') {
                            // If the source is a value-string, its content is the Stela expression
                            return String(connectedValue).trim() === "" ? "0" : String(connectedValue);
                        } else if (sourceNode.type === 'value-number') {
                            const numVal = parseFloat(connectedValue);
                            return isNaN(numVal) ? 0 : (numVal ? 1 : 0); // Convert number to 0 or 1
                        }
                        // Add handling for a dedicated 'value-boolean' node if it exists
                        // else if (sourceNode.type === 'value-boolean') { ... }

                        // Fallback for boolean if connected to an unexpected value node type
                        const numVal = parseFloat(connectedValue);
                        if (!isNaN(numVal)) return numVal ? 1 : 0;
                        if (typeof connectedValue === 'string') {
                            if (connectedValue.toLowerCase() === 'true') return 1;
                            if (connectedValue.toLowerCase() === 'false') return 0;
                             // If it's some other string from an unknown value node, treat as expression
                            return String(connectedValue).trim() === "" ? "0" : String(connectedValue);
                        }
                        return 0; // Default to false
                    }

                    if (inputPinDetails.type === 'number') {
                        const numVal = parseFloat(connectedValue);
                        return isNaN(numVal) ? null : numVal;
                    }
                    if (inputPinDetails.type === 'string') {
                        if (pinName === 'message' && sourceNode.type === 'value-string') {
                            return `'${String(connectedValue).replace(/'/g, "\\'")}'`;
                        }
                        return String(connectedValue); // Raw string for keyName, etc.
                    }
                    return connectedValue; // For other types or direct pass-through
                } else if (sourceNodeConfig) {
                    console.warn(`Pin ${pinName} on node ${nodeId} (type ${node.type}) is connected to a non-value node ${sourceNode.type}. This scenario is not fully handled for value retrieval.`);
                }
            }
        }

        // Local value if not connected (or connection failed to resolve)
        let localValue = node.values[pinName];
        if (localValue === undefined && inputPinDetails.default !== undefined) {
            localValue = inputPinDetails.default;
        } else if (localValue === undefined) {
            // Default based on type if no default specified and no value
            if (inputPinDetails.type === 'number') localValue = 0;
            else if (inputPinDetails.type === 'boolean') localValue = 0; 
            else if (inputPinDetails.type === 'string') localValue = "";
            else localValue = null; 
        }
        
        // Process local value according to pin type
        if (inputPinDetails.type === 'boolean') {
            if (typeof localValue === 'string') {
                 if (localValue.toLowerCase() === 'true' || localValue === '1') return 1;
                 if (localValue.toLowerCase() === 'false' || localValue === '0') return 0;
                 // If it's a string meant for an expression (e.g. typed into a future field for condition)
                 return String(localValue).trim() === "" ? "0" : String(localValue);
            }
            return localValue ? 1 : 0;
        }
        if (inputPinDetails.type === 'number') {
            const numVal = parseFloat(localValue);
            return isNaN(numVal) ? (inputPinDetails.default !== undefined ? parseFloat(inputPinDetails.default) : 0) : numVal;
        }
        if (inputPinDetails.type === 'string') {
            if (pinName === 'message') return `'${String(localValue).replace(/'/g, "\\'")}'`;
            return String(localValue);
        }
        return localValue;
    }

    function generateStelaForFlow(startNodeId, outputFlowPinName, processedActionsInThisBranch) {
        let stelaBlock = "";
        const queue = [{ nodeId: startNodeId, pinName: outputFlowPinName }];
        const visitedFlowLinks = new Set(); 

        while (queue.length > 0) {
            const current = queue.shift();
            const flowLinkKey = `${current.nodeId}->${current.pinName}`;

            if (visitedFlowLinks.has(flowLinkKey)) continue;
            visitedFlowLinks.add(flowLinkKey);
            
            const outgoingConns = connections.filter(
                c => c.fromNodeId === current.nodeId && c.fromPinName === current.pinName
            );

            for (const conn of outgoingConns) {
                const nextNode = getNode(conn.toNodeId);
                if (!nextNode) continue;

                const nextNodeConfig = NODE_TYPES[nextNode.type];
                if (!nextNodeConfig || (nextNodeConfig.type !== 'action' && nextNode.type !== 'action-branch')) { // Allow action-branch here
                     if (nextNodeConfig && nextNodeConfig.outputs && nextNodeConfig.outputs.flowOut) {
                        // If it's an event node or something non-action but has flow, just pass through
                        queue.push({ nodeId: nextNode.id, pinName: 'flowOut' });
                    }
                    continue;
                }
                
                if (processedActionsInThisBranch.has(nextNode.id)) continue;
                processedActionsInThisBranch.add(nextNode.id);

                let actionCode = "";
                switch (nextNode.type) {
                    case 'action-log': {
                        const msg = getInputValue(nextNode.id, 'message', nextNodeConfig);
                        // getInputValue for 'message' already quotes it.
                        actionCode += `print(${msg});\n`;
                        break;
                    }
                    case 'action-branch': {
                        const conditionValue = getInputValue(nextNode.id, 'condition', nextNodeConfig);
                        actionCode += `if (${conditionValue}) {\n`;
                        // Process true branch with a new set for processed actions within that branch
                        const trueBranchCode = generateStelaForFlow(nextNode.id, 'flowOutTrue', new Set());
                        actionCode += indentCode(trueBranchCode);
                        actionCode += `}`;

                        const falseFlowConnection = connections.find(
                            c => c.fromNodeId === nextNode.id && c.fromPinName === 'flowOutFalse'
                        );
                        if (falseFlowConnection) {
                            actionCode += ` else {\n`;
                            // Process false branch with a new set
                            const falseBranchCode = generateStelaForFlow(nextNode.id, 'flowOutFalse', new Set());
                            actionCode += indentCode(falseBranchCode);
                            actionCode += `}`;
                        }
                        actionCode += '\n';
                        // Branch node itself generates its structure; subsequent flow is handled by recursive calls.
                        // So, we don't queue flowOutTrue/False here.
                        stelaBlock += actionCode;
                        continue; // Skip the generic flowOut queuing for branch node
                    }
                }
                stelaBlock += actionCode;

                // For standard action nodes that have a single 'flowOut'
                if (nextNodeConfig.outputs && nextNodeConfig.outputs.flowOut && nextNode.type !== 'action-branch') {
                    queue.push({ nodeId: nextNode.id, pinName: 'flowOut' });
                }
            }
        }
        return stelaBlock;
    }
    
    let startLogicCombined = "";
    const processedStartActions = new Set(); // Actions processed within any "On Game Start"
    nodes.filter(n => n.type === 'event-start').forEach(eventNode => {
        startLogicCombined += generateStelaForFlow(eventNode.id, 'flowOut', processedStartActions);
    });

    if (startLogicCombined.trim() !== "") {
        stelaOutput += "// --- Logic from On Game Start ---\n";
        stelaOutput += "if (game.isFirstFrame) {\n";
        stelaOutput += indentCode(startLogicCombined, "  "); 
        stelaOutput += "}\n\n";
    } else if (nodes.some(n => n.type === 'event-start')) {
        stelaOutput += "// --- Logic from On Game Start ---\n";
        stelaOutput += "// (No actions connected to On Game Start event(s))\n\n";
    }

    let updateLogicCombined = "";
    const processedUpdateActions = new Set(); // Actions processed within any "On Game Update"
    nodes.filter(n => n.type === 'event-update').forEach(eventNode => {
        updateLogicCombined += generateStelaForFlow(eventNode.id, 'flowOut', processedUpdateActions);
    });

    if (updateLogicCombined.trim() !== "") {
        stelaOutput += "// --- Logic from On Game Update ---\n";
        stelaOutput += updateLogicCombined; 
        if (!updateLogicCombined.endsWith("\n\n") && !updateLogicCombined.endsWith("\n")) stelaOutput += "\n";
        if (!updateLogicCombined.endsWith("\n\n")) stelaOutput += "\n";

    } else if (nodes.some(n => n.type === 'event-update')) {
        stelaOutput += "// --- Logic from On Game Update ---\n";
        stelaOutput += "// (No actions connected to On Game Update event(s))\n\n";
    }
    
    const keyPressEventNodes = nodes.filter(n => n.type === 'event-key-press');
    let keyPressLogicCombined = "";
    if (keyPressEventNodes.length > 0) {
        let tempKeyPressOutput = "// --- Logic from On Key Press Events ---\n";
        let actualKeyPressLogicGenerated = false;
        keyPressEventNodes.forEach(eventNode => {
            const eventNodeConfig = NODE_TYPES[eventNode.type];
            // getInputValue for 'keyName' returns the raw string.
            let rawKeyName = getInputValue(eventNode.id, 'keyName', eventNodeConfig); 
            rawKeyName = String(rawKeyName).toLowerCase(); // Ensure it's lowercase for key.key_name

            // Each key press event's flow is independent.
            const keyLogic = generateStelaForFlow(eventNode.id, 'flowOut', new Set());
            if (keyLogic.trim() !== "") {
                tempKeyPressOutput += `if (key.${rawKeyName}) {\n`;
                tempKeyPressOutput += indentCode(keyLogic, "  ");
                tempKeyPressOutput += "}\n";
                actualKeyPressLogicGenerated = true;
            }
        });
        if (actualKeyPressLogicGenerated) {
            keyPressLogicCombined = tempKeyPressOutput + "\n";
            stelaOutput += keyPressLogicCombined;
        } else {
             stelaOutput += "// --- Logic from On Key Press Events ---\n";
             stelaOutput += "// (No actions connected to On Key Press event(s))\n\n";
        }
    }


    // Check if any meaningful code was generated
    let hasExecutableLogic = false;
    if (startLogicCombined.trim() !== "") hasExecutableLogic = true;
    if (updateLogicCombined.trim() !== "") hasExecutableLogic = true;
    if (keyPressLogicCombined.includes("if (key.")) { // A bit simplistic, but checks if any key press block was formed
         // More robustly: check if keyPressLogicCombined contains more than just its header comment
        const keyPressHeader = "// --- Logic from On Key Press Events ---\n";
        const keyPressCommentOnly = "// (No actions connected to On Key Press event(s))\n\n";
        if (keyPressLogicCombined.replace(keyPressHeader, "").replace(keyPressCommentOnly, "").trim() !== "") {
            hasExecutableLogic = true;
        }
    }


    if (!hasExecutableLogic && nodes.length > 0) {
        // Overwrite previous content if no actual logic from events.
        stelaOutput = "// Converted from Visual Script\n";
        stelaOutput += "// No executable logic found connected to Start, Update, or Key Press events.\n";
    } else if (nodes.length === 0) {
        stelaOutput = "// Visual script is empty.\n";
    }
    
    return stelaOutput.trim() === "" ? "// Visual script is empty." : stelaOutput;
}