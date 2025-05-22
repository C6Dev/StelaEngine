export const NODE_TYPES = {
    'event-start': {
        title: 'On Game Start',
        type: 'event',
        outputs: { 'flowOut': { label: 'Flow', type: 'flow' } },
        inputs: {} 
    },
    'event-update': {
        title: 'On Game Update',
        type: 'event',
        outputs: { 'flowOut': { label: 'Flow', type: 'flow' } },
        inputs: {}
    },
    'event-key-press': {
        title: 'On Key Press',
        type: 'event',
        inputs: {
            'keyName': { label: 'Key Name', type: 'string', default: 'SPACE', noPin: true } // User types key name here
        },
        outputs: { 'flowOut': { label: 'Pressed', type: 'flow' } }
    },
    'action-log': {
        title: 'Log Message',
        type: 'action',
        inputs: {
            'flowIn': { label: 'Flow', type: 'flow' },
            'message': { label: 'Message', type: 'string', default: 'Hello from VS' }
        },
        outputs: { 'flowOut': { label: 'Flow', type: 'flow' } }
    },
    'action-branch': {
        title: 'Branch (If)',
        type: 'action',
        inputs: {
            'flowIn': { label: 'Flow', type: 'flow' },
            'condition': { label: 'Condition', type: 'boolean' } // Connect a boolean value here
        },
        outputs: {
            'flowOutTrue': { label: 'True', type: 'flow' },
            'flowOutFalse': { label: 'False', type: 'flow' }
        }
    },
    'value-number': {
        title: 'Number',
        type: 'value',
        inputs: { 
            'value': { label: 'Value', type: 'number', default: 0, noPin: true }
        },
        outputs: { 
            'out': { label: 'Out', type: 'number' }
        }
    },
    'value-string': {
        title: 'String',
        type: 'value',
        inputs: {
            'value': { label: 'Value', type: 'string', default: '', noPin: true }
        },
        outputs: {
            'out': { label: 'Out', type: 'string' }
        }
    }
    // Future: 'value-boolean' node
};

