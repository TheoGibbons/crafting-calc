<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crafting Calculator</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }

        #canvas-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            cursor: grab;
            background: #f0f0f0;
            background-image:
                linear-gradient(#ccc 1px, transparent 1px),
                linear-gradient(90deg, #ccc 1px, transparent 1px);
            background-size: 20px 20px;
        }

        #canvas {
            position: absolute;
            transform-origin: 0 0;
        }

        .machine {
            position: absolute;
            width: 200px;
            height: 200px;
            background-color: #fff;
            border: 2px solid #333;
            border-radius: 5px;
            cursor: pointer;
            user-select: none;
            display: flex;
            flex-direction: column;
            overflow: visible;
        }

        .machine-header {
            background: #ddd;
            padding: 5px;
            text-align: center;
            font-weight: bold;
            border-bottom: 1px solid #333;
            overflow:  hidden;
        }

        .machine-count {
            position: absolute;
            top: -10px;
            right: -10px;
            background: #4285f4;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .machine-rates {
            display: flex;
            flex-direction: column;
            padding: 5px;
            font-size: 12px;
            overflow: hidden;
            gap: 10px;
        }

        .machine-rates div {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }

        .context-menu {
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
            z-index: 1000;
        }

        .context-menu-item {
            padding: 8px 12px;
            cursor: pointer;
        }

        .context-menu-item:hover {
            background-color: #f0f0f0;
        }

        .link {
            position: absolute;
            z-index: -1;
            pointer-events: none;
        }

        .link-line {
            stroke: #555;
            stroke-width: 2px;
            marker-end: url(#arrowhead);
        }

        .link-hitbox {
            stroke: transparent;
            stroke-width: 20px;
            pointer-events: all;
            cursor: pointer;
        }

        .throughput-label {
            font-size: 12px;
            background: white;
            padding: 2px 5px;
            border-radius: 3px;
            border: 1px solid #ccc;
            white-space: nowrap;
        }

        .control-panel {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 100;
        }

        button {
            padding: 8px 16px;
            cursor: pointer;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            margin-right: 5px;
        }

        button:hover {
            background: #3367d6;
        }

        /* Status colors */
        .status-green {
            border-color: #0a0;
        }

        .status-yellow {
            border-color: #fc0;
        }

        .status-orange {
            border-color: #f80;
        }

        .status-red {
            border-color: #f00;
        }

        /* Item badges for connections */
        .item-badge {
            display: inline-block;
            background: #eee;
            border-radius: 3px;
            padding: 1px 3px;
            margin: 0 2px;
            font-size: 10px;
            border: 1px solid #ccc;
        }
        #arrowDefs {
            position: absolute;
        }

        /* New classes to replace nth-child selectors and inline styles */
        .inputs-container {
            display: flex;
            flex-direction: column;
        }

        .inputs-header {
            display: flex;
            align-items: center;
            flex-direction: row !important;
            justify-content: center;
        }

        .output-container {
            display: flex;
            flex-direction: column;
        }

        .output-rate {
            cursor: pointer;
        }

        .input-item-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 3px 0;
            flex-direction: row;
        }

        .input-item-details {
            cursor: pointer;
            flex-direction: row !important;
            justify-content: center;
        }

        .input-delete-button {
            font-size: 12px;
            padding: 0 5px;
            margin-left: 5px;
            cursor: pointer;
        }

        .add-input-button {
            margin-left: 5px;
            padding: 0px 5px;
            font-size: 12px;
            cursor: pointer;
        }

        .no-inputs-message {
            font-style: italic;
            color: #999;
            font-size: 10px;
            margin: 3px 0;
        }

        /* New classes for outputs section */
        .outputs-container {
            display: flex;
            flex-direction: column;
        }

        .outputs-header {
            display: flex;
            align-items: center;
            flex-direction: row !important;
            justify-content: center;
        }

        .add-output-button {
            margin-left: 5px;
            padding: 0px 5px;
            font-size: 12px;
            cursor: pointer;
        }

        .outputs-list {
            width: 100%;
        }

        .output-item-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 3px 0;
            flex-direction: row;
        }

        .output-item-details {
            cursor: pointer;
            flex-direction: row !important;
            justify-content: center;
        }

        .output-delete-button {
            font-size: 12px;
            padding: 0 5px;
            margin-left: 5px;
            cursor: pointer;
        }

        .no-outputs-message {
            font-style: italic;
            color: #999;
            font-size: 10px;
            margin: 3px 0;
        }
    </style>
</head>
<body>
    <!-- SVG Definitions for Arrow Markers -->
    <svg id="arrowDefs" width="0" height="0">
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#555"/>
            </marker>
        </defs>
    </svg>

    <div id="canvas-container">
        <div id="canvas"></div>
    </div>

    <div class="control-panel">
        <button id="add-machine-btn">Add Machine</button>
        <button id="reset-view-btn">Reset View</button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const canvasContainer = document.getElementById('canvas-container');
            const canvas = document.getElementById('canvas');
            const addMachineBtn = document.getElementById('add-machine-btn');
            const resetViewBtn = document.getElementById('reset-view-btn');

            // Canvas state
            let scale = 1;
            let panX = 0;
            let panY = 0;
            let isPanning = false;
            let startPanX = 0;
            let startPanY = 0;
            let lastMouseX = 0;
            let lastMouseY = 0;

            // Machine and link tracking
            let machines = [];
            let links = [];
            let nextMachineId = 1;
            let nextLinkId = 1;
            let activeLinkStart = null;
            let contextMenu = null;

            // Apply transform to the canvas
            function updateCanvasTransform() {
                canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            }

            // Initialize with center transform
            updateCanvasTransform();

            // Add a new machine to the canvas
            function addMachine() {
                const id = nextMachineId++;
                const name = `Machine ${id}`;

                // Create machine element
                const machine = document.createElement('div');
                machine.className = 'machine';
                machine.dataset.id = id;
                machine.style.left = `${-panX/scale + window.innerWidth/(2*scale) - 100}px`;
                machine.style.top = `${-panY/scale + window.innerHeight/(2*scale) - 100}px`;

                // Add machine header with name
                const header = document.createElement('div');
                header.className = 'machine-header';
                header.textContent = name;
                header.title = "Click to rename";
                // Add click to rename
                header.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const machineId = parseInt(machine.dataset.id);
                    const machineObj = machines.find(m => m.id === machineId);
                    renameMachine(machineObj);
                });
                machine.appendChild(header);

                // Add machine count badge (default 1)
                const countBadge = document.createElement('div');
                countBadge.className = 'machine-count';
                countBadge.textContent = '1';
                countBadge.title = "Click to change machine count";
                // Add click to set count
                countBadge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const machineId = parseInt(machine.dataset.id);
                    const machineObj = machines.find(m => m.id === machineId);
                    setMachineCount(machineObj);
                });
                machine.appendChild(countBadge);

                // Add rates section for machine inputs and outputs
                const rates = document.createElement('div');
                rates.className = 'machine-rates';

                // Create inputs container with proper structure
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'inputs-container';

                // Create header with label and add button
                const inputsHeader = document.createElement('div');
                inputsHeader.className = 'inputs-header';

                const inputsLabel = document.createElement('span');
                inputsLabel.textContent = 'Inputs:';

                // Add button for adding new input items
                const addButton = document.createElement('button');
                addButton.textContent = '+';
                addButton.className = 'add-input-button';
                addButton.title = "Add new input";

                // Assemble header components
                inputsHeader.appendChild(inputsLabel);
                inputsHeader.appendChild(addButton);

                // Create container for the list of input items
                const inputsList = document.createElement('div');
                inputsList.className = 'inputs-list';

                // Assemble the inputs container
                inputsContainer.appendChild(inputsHeader);
                inputsContainer.appendChild(inputsList);

                // Set up event handler for the add button
                addButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const machineId = parseInt(machine.dataset.id);
                    const machineObj = machines.find(m => m.id === machineId);
                    addInputItem(machineObj);
                });

                rates.appendChild(inputsContainer);

                // Create outputs container with proper structure
                const outputsContainer = document.createElement('div');
                outputsContainer.className = 'outputs-container';

                // Create header with label and add button
                const outputsHeader = document.createElement('div');
                outputsHeader.className = 'outputs-header';

                const outputsLabel = document.createElement('span');
                outputsLabel.textContent = 'Outputs:';

                // Add button for adding new output items
                const addOutputButton = document.createElement('button');
                addOutputButton.textContent = '+';
                addOutputButton.className = 'add-output-button';
                addOutputButton.title = "Add new output";

                // Assemble header components
                outputsHeader.appendChild(outputsLabel);
                outputsHeader.appendChild(addOutputButton);

                // Create container for the list of output items
                const outputsList = document.createElement('div');
                outputsList.className = 'outputs-list';

                // Assemble the outputs container
                outputsContainer.appendChild(outputsHeader);
                outputsContainer.appendChild(outputsList);

                // Set up event handler for the add button
                addOutputButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const machineId = parseInt(machine.dataset.id);
                    const machineObj = machines.find(m => m.id === machineId);
                    addOutputItem(machineObj);
                });

                rates.appendChild(outputsContainer);

                machine.appendChild(rates);
                canvas.appendChild(machine);

                // Add to machines array
                machines.push({
                    id,
                    element: machine,
                    name,
                    count: 1,
                    inputRate: 0,
                    outputRate: 0,
                    inputs: [],
                    outputs: [],
                    inputItems: {},  // Map item names to required rates
                    outputItems: {}  // Map item names to produced rates
                });

                // Make draggable
                machine.addEventListener('mousedown', handleMachineMouseDown);
                // Add context menu
                machine.addEventListener('contextmenu', handleMachineContextMenu);

                updateMachineStatus();
            }

            // Mouse down handler for machines
            function handleMachineMouseDown(e) {
                // Only handle left mouse button
                if (e.button !== 0) return;

                e.stopPropagation();

                const machine = e.currentTarget;
                let startX = parseInt(machine.style.left);
                let startY = parseInt(machine.style.top);
                let mouseStartX = e.clientX;
                let mouseStartY = e.clientY;
                let isDragging = true;

                function mouseMoveHandler(e) {
                    if (!isDragging) return;

                    const dx = (e.clientX - mouseStartX) / scale;
                    const dy = (e.clientY - mouseStartY) / scale;

                    machine.style.left = `${startX + dx}px`;
                    machine.style.top = `${startY + dy}px`;

                    // Update any connected links
                    updateLinks();
                }

                function mouseUpHandler() {
                    isDragging = false;
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                }

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            }

            // Create a context menu for a machine
            function handleMachineContextMenu(e) {
                e.preventDefault();
                e.stopPropagation();

                const machineElement = e.currentTarget;
                const machineId = parseInt(machineElement.dataset.id);
                const machine = machines.find(m => m.id === machineId);

                // Close any existing context menu
                closeContextMenu();

                // Create context menu
                contextMenu = document.createElement('div');
                contextMenu.className = 'context-menu';
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.top = `${e.clientY}px`;

                // Add menu items
                const menuItems = [
                    { text: 'Add Link', action: () => startLinkCreation(machine) },
                    { text: 'Delete', action: () => deleteMachine(machine) }
                ];

                menuItems.forEach(item => {
                    const menuItem = document.createElement('div');
                    menuItem.className = 'context-menu-item';
                    menuItem.textContent = item.text;
                    menuItem.addEventListener('click', () => {
                        closeContextMenu();
                        item.action();
                    });
                    contextMenu.appendChild(menuItem);
                });

                document.body.appendChild(contextMenu);

                // Close menu when clicking elsewhere
                setTimeout(() => {
                    document.addEventListener('click', closeContextMenu, { once: true });
                }, 0);
            }

            // Create a context menu for a link
            function handleLinkContextMenu(e, link) {
                e.preventDefault();
                e.stopPropagation();

                // Close any existing context menu
                closeContextMenu();

                // Create context menu
                contextMenu = document.createElement('div');
                contextMenu.className = 'context-menu';
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.top = `${e.clientY}px`;

                // Add menu items
                const menuItems = [
                    { text: 'Set Item', action: () => setLinkItem(link) },
                    { text: 'Set Max Throughput Rate', action: () => setLinkThroughput(link) },
                    { text: 'Delete Link', action: () => deleteLink(link) }
                ];

                menuItems.forEach(item => {
                    const menuItem = document.createElement('div');
                    menuItem.className = 'context-menu-item';
                    menuItem.textContent = item.text;
                    menuItem.addEventListener('click', () => {
                        closeContextMenu();
                        item.action();
                    });
                    contextMenu.appendChild(menuItem);
                });

                document.body.appendChild(contextMenu);

                // Close menu when clicking elsewhere
                setTimeout(() => {
                    document.addEventListener('click', closeContextMenu, { once: true });
                }, 0);
            }

            // Close any open context menu
            function closeContextMenu() {
                if (contextMenu) {
                    contextMenu.remove();
                    contextMenu = null;
                }
            }

            // Rename a machine
            function renameMachine(machine) {
                const newName = prompt('Enter new name:', machine.name);
                if (newName !== null && newName.trim() !== '') {
                    machine.name = newName.trim();
                    const header = machine.element.querySelector('.machine-header');
                    header.textContent = newName.trim();
                }
            }

            // Set machine count (number of identical machines)
            function setMachineCount(machine) {
                const input = prompt('Enter number of machines:', machine.count);
                const count = parseInt(input);

                if (!isNaN(count) && count > 0) {
                    machine.count = count;

                    // Update count badge
                    const countBadge = machine.element.querySelector('.machine-count');
                    countBadge.textContent = count;
                    countBadge.style.display = count > 1 ? 'flex' : 'none';

                    // Update effective output rate based on machine count
                    updateMachineStatus();
                }
            }

            // Add input item (allows multiple inputs)
            function addInputItem(machine) {
                const itemName = prompt('Enter input item name:');

                if (itemName !== null && itemName.trim() !== '') {
                    const itemRate = prompt(`Enter consumption rate for ${itemName} (items/min):`);
                    const rate = parseFloat(itemRate);

                    if (!isNaN(rate) && rate > 0) {
                        // Store item and rate in machine's inputItems
                        machine.inputItems[itemName.trim()] = rate;

                        // Update total input rate
                        machine.inputRate = Object.values(machine.inputItems).reduce((sum, rate) => sum + rate, 0);

                        // Update the machine to show the input items
                        updateMachineInputItemsDisplay(machine);

                        // Update rate display
                        // const rateDisplay = machine.element.querySelector('.machine-rates div:nth-child(1) span:nth-child(2)');
                        // const totalRate = (machine.inputRate * machine.count).toFixed(1);
                        // rateDisplay.textContent = `${totalRate}/min`;

                        updateMachineStatus();
                    }
                }
            }

            // Update the machine to display all input items
            function updateMachineInputItemsDisplay(machine) {
                // Look for the inputs list container in the machine-rates section
                let inputsList = machine.element.querySelector('.inputs-list');

                if (!inputsList) {
                    // This shouldn't happen with the new structure, but create it if missing
                    const inputsContainer = machine.element.querySelector('.machine-rates div:first-child');
                    inputsList = document.createElement('div');
                    inputsList.className = 'inputs-list';
                    inputsContainer.appendChild(inputsList);
                }

                // Clear existing inputs
                inputsList.innerHTML = '';

                // Add each input item (always displayed, even if empty)
                if (Object.keys(machine.inputItems).length > 0) {
                    for (const [item, rate] of Object.entries(machine.inputItems)) {
                        const itemElement = document.createElement('div');
                        itemElement.className = 'input-item-row';

                        // Input item details (split into separate name and rate elements)
                        const itemDetails = document.createElement('div');
                        itemDetails.className = 'input-item-details';

                        // Input name (clickable to edit name only)
                        const itemName = document.createElement('span');
                        itemName.textContent = item;
                        itemName.className = 'input-item-name';
                        itemName.title = "Click to edit input name";
                        itemName.style.cursor = 'pointer';
                        itemName.addEventListener('click', (e) => {
                            e.stopPropagation();
                            editInputItemName(machine, item);
                        });

                        // Separator
                        const separator = document.createElement('span');
                        separator.textContent = ': ';

                        // Input rate (clickable to edit rate only)
                        const itemRate = document.createElement('span');
                        itemRate.textContent = `${rate}/min`;
                        itemRate.className = 'input-item-rate';
                        itemRate.title = "Click to edit input rate";
                        itemRate.style.cursor = 'pointer';
                        itemRate.addEventListener('click', (e) => {
                            e.stopPropagation();
                            editInputItemRate(machine, item);
                        });

                      // Delete button
                      const deleteButton = document.createElement('button');
                      deleteButton.textContent = '×';
                      deleteButton.className = 'input-delete-button';
                      deleteButton.title = "Delete this input";
                      deleteButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteInputItem(machine, item);
                      });

                        // Assemble the item details
                        itemDetails.appendChild(itemName);
                        itemDetails.appendChild(separator);
                        itemDetails.appendChild(itemRate);
                        itemDetails.appendChild(deleteButton);

                        itemElement.appendChild(itemDetails);
                        inputsList.appendChild(itemElement);
                    }
                } else {
                    // If no inputs, add a placeholder message
                    const placeholder = document.createElement('div');
                    placeholder.textContent = 'No inputs configured';
                    placeholder.className = 'no-inputs-message';
                    inputsList.appendChild(placeholder);
                }
            }

            // Edit an input item name only
            function editInputItemName(machine, itemName) {
                const currentRate = machine.inputItems[itemName];

                // Ask for new name
                const newName = prompt(`Edit input item name:`, itemName);

                // Return if canceled or empty
                if (newName === null || newName.trim() === '') return;

                // If the name changed, delete the old entry and add a new one with the same rate
                if (newName.trim() !== itemName) {
                    delete machine.inputItems[itemName];
                    machine.inputItems[newName.trim()] = currentRate;

                    // Update the display
                    updateMachineInputItemsDisplay(machine);
                    updateMachineStatus();
                }
            }

            // Edit an input item rate only
            function editInputItemRate(machine, itemName) {
                const currentRate = machine.inputItems[itemName];

                // Ask for new rate
                const rateInput = prompt(`Enter consumption rate for ${itemName} (items/min):`, currentRate);
                const newRate = parseFloat(rateInput);

                // Validate rate
                if (isNaN(newRate) || newRate <= 0) {
                    alert('Please enter a valid positive number for the rate');
                    return;
                }

                // Update with new rate
                machine.inputItems[itemName] = newRate;

                // Update total input rate
                machine.inputRate = Object.values(machine.inputItems).reduce((sum, rate) => sum + rate, 0);

                // Update the display
                updateMachineInputItemsDisplay(machine);
                updateMachineStatus();
            }

            // Delete an input item
            function deleteInputItem(machine, itemName) {
                if (confirm(`Delete input item "${itemName}"?`)) {
                    delete machine.inputItems[itemName];

                    // Update total input rate
                    machine.inputRate = Object.values(machine.inputItems).reduce((sum, rate) => sum + rate, 0);

                    // Update the display
                    updateMachineInputItemsDisplay(machine);
                    updateMachineStatus();
                }
            }

            // Add output item function (allows multiple outputs)
            function addOutputItem(machine) {
                const itemName = prompt('Enter output item name:');

                if (itemName !== null && itemName.trim() !== '') {
                    const itemRate = prompt(`Enter production rate for ${itemName} (items/min):`);
                    const rate = parseFloat(itemRate);

                    if (!isNaN(rate) && rate > 0) {
                        // Store item and rate in machine's outputItems
                        machine.outputItems[itemName.trim()] = rate;

                        // Update total output rate
                        machine.outputRate = Object.values(machine.outputItems).reduce((sum, rate) => sum + rate, 0);

                        // Update the machine to show the output items
                        updateMachineOutputItemsDisplay(machine);

                        updateMachineStatus();
                    }
                }
            }

            // Update the machine to display all output items
            function updateMachineOutputItemsDisplay(machine) {
                // Look for the outputs list container in the machine-rates section
                let outputsList = machine.element.querySelector('.outputs-list');

                if (!outputsList) {
                    // This shouldn't happen with the new structure, but create it if missing
                    const outputsContainer = machine.element.querySelector('.outputs-container');
                    outputsList = document.createElement('div');
                    outputsList.className = 'outputs-list';
                    outputsContainer.appendChild(outputsList);
                }

                // Clear existing outputs
                outputsList.innerHTML = '';

                // Add each output item
                if (Object.keys(machine.outputItems).length > 0) {
                    for (const [item, rate] of Object.entries(machine.outputItems)) {
                        const itemElement = document.createElement('div');
                        itemElement.className = 'output-item-row';

                        // Output item details (split into separate name and rate elements)
                        const itemDetails = document.createElement('div');
                        itemDetails.className = 'output-item-details';

                        // Output name (clickable to edit name only)
                        const itemName = document.createElement('span');
                        itemName.textContent = item;
                        itemName.className = 'output-item-name';
                        itemName.title = "Click to edit output name";
                        itemName.style.cursor = 'pointer';
                        itemName.addEventListener('click', (e) => {
                            e.stopPropagation();
                            editOutputItemName(machine, item);
                        });

                        // Separator
                        const separator = document.createElement('span');
                        separator.textContent = ': ';

                        // Output rate (clickable to edit rate only)
                        const itemRate = document.createElement('span');
                        itemRate.textContent = `${rate}/min`;
                        itemRate.className = 'output-item-rate';
                        itemRate.title = "Click to edit output rate";
                        itemRate.style.cursor = 'pointer';
                        itemRate.addEventListener('click', (e) => {
                            e.stopPropagation();
                            editOutputItemRate(machine, item);
                        });

                        // Delete button
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = '×';
                        deleteButton.className = 'output-delete-button';
                        deleteButton.title = "Delete this output";
                        deleteButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deleteOutputItem(machine, item);
                        });

                        // Assemble the item details
                        itemDetails.appendChild(itemName);
                        itemDetails.appendChild(separator);
                        itemDetails.appendChild(itemRate);
                        itemDetails.appendChild(deleteButton);

                        itemElement.appendChild(itemDetails);
                        outputsList.appendChild(itemElement);
                    }
                } else {
                    // If no outputs, add a placeholder message
                    const placeholder = document.createElement('div');
                    placeholder.textContent = 'No outputs configured';
                    placeholder.className = 'no-outputs-message';
                    outputsList.appendChild(placeholder);
                }
            }

            // Edit an output item name only
            function editOutputItemName(machine, itemName) {
                const currentRate = machine.outputItems[itemName];

                // Ask for new name
                const newName = prompt(`Edit output item name:`, itemName);

                // Return if canceled or empty
                if (newName === null || newName.trim() === '') return;

                // If the name changed, delete the old entry and add a new one with the same rate
                if (newName.trim() !== itemName) {
                    delete machine.outputItems[itemName];
                    machine.outputItems[newName.trim()] = currentRate;

                    // Update the display
                    updateMachineOutputItemsDisplay(machine);
                    updateMachineStatus();
                }
            }

            // Edit an output item rate only
            function editOutputItemRate(machine, itemName) {
                const currentRate = machine.outputItems[itemName];

                // Ask for new rate
                const rateInput = prompt(`Enter production rate for ${itemName} (items/min):`, currentRate);
                const newRate = parseFloat(rateInput);

                // Validate rate
                if (isNaN(newRate) || newRate <= 0) {
                    alert('Please enter a valid positive number for the rate');
                    return;
                }

                // Update with new rate
                machine.outputItems[itemName] = newRate;

                // Update total output rate
                machine.outputRate = Object.values(machine.outputItems).reduce((sum, rate) => sum + rate, 0);

                // Update the display
                updateMachineOutputItemsDisplay(machine);
                updateMachineStatus();
            }

            // Delete an output item
            function deleteOutputItem(machine, itemName) {
                if (confirm(`Delete output item "${itemName}"?`)) {
                    delete machine.outputItems[itemName];

                    // Update total output rate
                    machine.outputRate = Object.values(machine.outputItems).reduce((sum, rate) => sum + rate, 0);

                    // Update the display
                    updateMachineOutputItemsDisplay(machine);
                    updateMachineStatus();
                }
            }

            // Start creating a link from a machine
            function startLinkCreation(machine) {
                activeLinkStart = machine;
                canvasContainer.style.cursor = 'crosshair';

                // alert("Now click on another machine to create a link");

                // Remove any existing handler to prevent duplicates
                document.removeEventListener('click', linkTargetHandler);

                // Add click handler to document
                function linkTargetHandler(e) {
                    // Only process if we're in link creation mode
                    if (!activeLinkStart) return;

                    // Find if we clicked on a machine
                    let targetElement = e.target;

                    // Look for machine element if we clicked inside one
                    while (targetElement && !targetElement.classList.contains('machine') && targetElement !== document.body) {
                        targetElement = targetElement.parentElement;
                    }

                    if (targetElement && targetElement.classList.contains('machine')) {
                        const targetId = parseInt(targetElement.dataset.id);
                        const targetMachine = machines.find(m => m.id === targetId);

                        if (targetMachine && targetMachine !== activeLinkStart) {
                            createLink(activeLinkStart, targetMachine);
                            console.log(`Created link from ${activeLinkStart.name} to ${targetMachine.name}`);
                        }

                      // Clean up
                      document.removeEventListener('click', linkTargetHandler);
                      canvasContainer.style.cursor = 'grab';
                      activeLinkStart = null;
                    }

                }

                document.addEventListener('click', linkTargetHandler);
            }

            // Create a link between two machines
            function createLink(sourceMachine, targetMachine) {
                // Check if link already exists
                const existingLink = links.find(link =>
                    link.source === sourceMachine && link.target === targetMachine);

                if (existingLink) return;

                const id = nextLinkId++;
                const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                linkGroup.classList.add('link');
                linkGroup.dataset.id = id;
                linkGroup.style.overflow = 'visible';

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.classList.add('link-line');

                const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                hitbox.classList.add('link-hitbox');

                const label = document.createElement('div');
                label.classList.add('throughput-label');
                label.textContent = '? items/min';
                label.title = "Click to set throughput rate";
                label.style.cursor = 'pointer';

                // Add click event to set throughput
                label.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const linkObj = links.find(l => l.label === label);
                    if (linkObj) {
                        setLinkThroughput(linkObj);
                    }
                });

                linkGroup.appendChild(line);
                linkGroup.appendChild(hitbox);
                canvas.appendChild(linkGroup);
                canvas.appendChild(label);

                const link = {
                    id,
                    source: sourceMachine,
                    target: targetMachine,
                    element: linkGroup,
                    line,
                    hitbox,
                    label,
                    throughput: 0,
                    item: sourceMachine.outputItem || '' // Default to source machine's output item
                };

                links.push(link);

                // Add source to target's inputs
                targetMachine.inputs.push(sourceMachine.id);

                // Add target to source's outputs
                sourceMachine.outputs.push(targetMachine.id);

                // If source has an output item and target has that as input item, connect them
                if (sourceMachine.outputItem && targetMachine.inputItems[sourceMachine.outputItem]) {
                    link.item = sourceMachine.outputItem;
                }

                // Position the link
                updateLinkPosition(link);

                // Add event listener for context menu
                hitbox.addEventListener('contextmenu', (e) => handleLinkContextMenu(e, link));

                updateMachineStatus();
            }

            // Set the item transported by a link
            function setLinkItem(link) {
                const input = prompt('Enter item name transported by this link:', link.item);
                if (input !== null) {
                    link.item = input.trim();
                    updateLinkLabel(link);
                    updateMachineStatus();
                }
            }

            // Update the position of all links
            function updateLinks() {
                links.forEach(updateLinkPosition);
            }

            // Update the position of a specific link
            function updateLinkPosition(link) {
                const sourceRect = link.source.element.getBoundingClientRect();
                const targetRect = link.target.element.getBoundingClientRect();

                // Calculate center points in canvas space
                const sourceX = (sourceRect.left - panX) / scale + sourceRect.width / 2;
                const sourceY = (sourceRect.top - panY) / scale + sourceRect.height / 2;
                const targetX = (targetRect.left - panX) / scale + targetRect.width / 2;
                const targetY = (targetRect.top - panY) / scale + targetRect.height / 2;

                // Calculate direction vector
                const dx = targetX - sourceX;
                const dy = targetY - sourceY;
                const length = Math.sqrt(dx*dx + dy*dy);

                // Normalize direction vector
                const ndx = dx / length;
                const ndy = dy / length;

                // Adjust start and end points to be at the edge of squares, not centers
                // This makes arrows point to the edge of machines
                const margin = 100; // Half the width/height of machine (updated to 100 from 50 for bigger machines)
                const startX = sourceX + ndx * margin;
                const startY = sourceY + ndy * margin;
                const endX = targetX - ndx * margin;
                const endY = targetY - ndy * margin;

                // Calculate svg dimensions and position
                const left = Math.min(startX, endX);
                const top = Math.min(startY, endY);
                const width = Math.abs(endX - startX);
                const height = Math.abs(endY - startY);

                // Set svg attributes with a minimum size to prevent issues
                link.element.style.left = `${left}px`;
                link.element.style.top = `${top}px`;
                link.element.style.width = `${Math.max(width, 1)}px`;
                link.element.style.height = `${Math.max(height, 1)}px`;

                // Set line coordinates
                link.line.setAttribute('x1', startX > endX ? width : 0);
                link.line.setAttribute('y1', startY > endY ? height : 0);
                link.line.setAttribute('x2', startX > endX ? 0 : width);
                link.line.setAttribute('y2', startY > endY ? 0 : height);

                // Set hitbox coordinates (same as line)
                link.hitbox.setAttribute('x1', link.line.getAttribute('x1'));
                link.hitbox.setAttribute('y1', link.line.getAttribute('y1'));
                link.hitbox.setAttribute('x2', link.line.getAttribute('x2'));
                link.hitbox.setAttribute('y2', link.line.getAttribute('y2'));

                // Position label at midpoint
                const midX = left + width / 2;
                const midY = top + height / 2;

                // Position the label in the parent coordinate system (canvas)
                link.label.style.position = 'absolute';
                link.label.style.left = `${midX}px`;
                link.label.style.top = `${midY}px`;
                link.label.style.transform = 'translate(-50%, -50%)';
                link.label.style.zIndex = '10'; // Ensure label is above the link line
            }

            // Update link label with item and throughput info
            function updateLinkLabel(link) {
                const itemText = link.item ? `<span class="item-badge">${link.item}XXX</span>` : '';
                const rateText = `${link.throughput || '?'} items/min`;
                link.label.innerHTML = itemText + ' ' + rateText;
            }

            // Set throughput for a link
            function setLinkThroughput(link) {
                const input = prompt('Enter max throughput rate (items/min):', link.throughput);
                const rate = parseFloat(input);

                if (!isNaN(rate) && rate >= 0) {
                    link.throughput = rate;
                    updateLinkLabel(link);
                    updateMachineStatus();
                }
            }

            // Delete a link
            function deleteLink(link) {
                // Remove from DOM
                link.element.remove();
                link.label.remove();

                // Remove from source's outputs
                const sourceOutputIdx = link.source.outputs.indexOf(link.target.id);
                if (sourceOutputIdx !== -1) {
                    link.source.outputs.splice(sourceOutputIdx, 1);
                }

                // Remove from target's inputs
                const targetInputIdx = link.target.inputs.indexOf(link.source.id);
                if (targetInputIdx !== -1) {
                    link.target.inputs.splice(targetInputIdx, 1);
                }

                // Remove from links array
                const linkIdx = links.findIndex(l => l.id === link.id);
                if (linkIdx !== -1) {
                    links.splice(linkIdx, 1);
                }

                updateMachineStatus();
            }

            // Delete a machine
            function deleteMachine(machine) {
                // First, delete all connected links
                const connectedLinks = links.filter(link =>
                    link.source.id === machine.id || link.target.id === machine.id);

                // Make a copy of the array to avoid modification during iteration
                [...connectedLinks].forEach(deleteLink);

                // Remove from DOM
                machine.element.remove();

                // Remove from machines array
                const machineIdx = machines.findIndex(m => m.id === machine.id);
                if (machineIdx !== -1) {
                    machines.splice(machineIdx, 1);
                }
            }

            // Update the status (color) of all machines based on rate calculations
            function updateMachineStatus() {
                // Update all machines
                machines.forEach(machine => {
                    // Calculate actual input rates by item type
                    const itemInputRates = {};

                    // Track for each input item
                    links.forEach(link => {
                        if (link.target.id === machine.id && link.item) {
                            // Source total output considering number of machines
                            const sourceOutputRate = link.source.outputRate * link.source.count;
                            const linkThroughput = link.throughput;

                            // Use the minimum of source output rate and link throughput
                            const effectiveRate = linkThroughput > 0 ?
                                Math.min(sourceOutputRate, linkThroughput) : sourceOutputRate;

                            // Add to the correct item bucket
                            if (!itemInputRates[link.item]) {
                                itemInputRates[link.item] = 0;
                            }
                            itemInputRates[link.item] += effectiveRate;
                        }
                    });

                    // Determine status based on item requirements
                    let worstRatio = 1; // Start with "sufficient" and find the worst case

                    for (const [item, requiredRate] of Object.entries(machine.inputItems)) {
                        const totalRequiredRate = requiredRate * machine.count;
                        const actualRate = itemInputRates[item] || 0;

                        if (totalRequiredRate > 0) {
                            const ratio = actualRate / totalRequiredRate;
                            worstRatio = Math.min(worstRatio, ratio);
                        }
                    }

                    // Set status based on the worst ratio
                    let status = '';

                    if (Object.keys(machine.inputItems).length > 0) {
                        if (worstRatio >= 1) {
                            status = 'status-green'; // Sufficient input
                        } else if (worstRatio >= 0.8) {
                            status = 'status-yellow'; // Slightly insufficient (80-99%)
                        } else if (worstRatio >= 0.5) {
                            status = 'status-orange'; // Moderately insufficient (50-79%)
                        } else {
                            status = 'status-red'; // Severely insufficient (<50%)
                        }
                    }

                    // Remove all status classes
                    machine.element.classList.remove('status-green', 'status-yellow', 'status-orange', 'status-red');

                    // Add appropriate status class
                    if (status) {
                        machine.element.classList.add(status);
                    }

                    // Update rate displays to show total rates including machine count
                    // const outputRateDisplay = machine.element.querySelector('.machine-rates div:nth-child(2) span:nth-child(2)');
                    //
                    // const totalOutputRate = (machine.outputRate * machine.count).toFixed(1);
                    //
                    // outputRateDisplay.textContent = `${totalOutputRate}/min`;
                });

                // Update all link labels
                links.forEach(updateLinkLabel);
            }

            // Pan and zoom functionality
            canvasContainer.addEventListener('mousedown', function(e) {
                // Only handle left mouse button
                if (e.button !== 0) return;

                isPanning = true;
                startPanX = e.clientX - panX;
                startPanY = e.clientY - panY;
                canvasContainer.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', function(e) {
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;

                if (isPanning) {
                    panX = e.clientX - startPanX;
                    panY = e.clientY - startPanY;
                    updateCanvasTransform();
                    updateLinks();
                }
            });

            document.addEventListener('mouseup', function() {
                isPanning = false;
                canvasContainer.style.cursor = 'grab';
            });

            // Zoom functionality
            canvasContainer.addEventListener('wheel', function(e) {
                e.preventDefault();

                // Calculate where in the canvas we're zooming
                const rect = canvasContainer.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Calculate current mouse position in canvas space
                const canvasX = (mouseX - panX) / scale;
                const canvasY = (mouseY - panY) / scale;

                // Adjust scale with wheel delta
                const delta = -Math.sign(e.deltaY) * 0.1;
                const newScale = Math.max(0.5, Math.min(3, scale + delta));

                // If scale hasn't changed, don't do anything
                if (newScale === scale) return;

                // Update scale
                scale = newScale;

                // Adjust pan to keep mouse position fixed
                panX = mouseX - canvasX * scale;
                panY = mouseY - canvasY * scale;

                // Update transform
                updateCanvasTransform();
                updateLinks();
            });

            // Reset view
            resetViewBtn.addEventListener('click', function() {
                scale = 1;
                panX = 0;
                panY = 0;
                updateCanvasTransform();
                updateLinks();
            });

            // Add machine button
            addMachineBtn.addEventListener('click', addMachine);

            // Add a few starter machines
            addMachine();
        });
    </script>
</body>
</html>
