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
            width: 100px;
            height: 100px;
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
            justify-content: space-between;
            padding: 5px;
            font-size: 12px;
            overflow: hidden;
        }

        .machine-rates div {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .machine-item {
            font-size: 11px;
            font-style: italic;
            text-align: center;
            padding: 2px 0;
            color: #555;
            overflow: hidden;
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
                machine.style.left = `${-panX/scale + window.innerWidth/(2*scale) - 50}px`;
                machine.style.top = `${-panY/scale + window.innerHeight/(2*scale) - 50}px`;

                // Add machine header with name
                const header = document.createElement('div');
                header.className = 'machine-header';
                header.textContent = name;
                machine.appendChild(header);

                // Add machine count badge (default 1)
                const countBadge = document.createElement('div');
                countBadge.className = 'machine-count';
                countBadge.textContent = '1';
                machine.appendChild(countBadge);

                // Add item output field
                const itemOutput = document.createElement('div');
                itemOutput.className = 'machine-item';
                itemOutput.textContent = 'Produces: ?';
                machine.appendChild(itemOutput);

                // Add rates section
                const rates = document.createElement('div');
                rates.className = 'machine-rates';

                const input = document.createElement('div');
                input.innerHTML = '<span>Max Consumption:</span><span>0/min</span>';
                rates.appendChild(input);

                const output = document.createElement('div');
                output.innerHTML = '<span>Output:</span><span>0/min</span>';
                rates.appendChild(output);

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
                    outputItem: '',
                    inputs: [],
                    inputItems: {},  // Map item names to required rates
                    outputs: []
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
                    { text: 'Rename', action: () => renameMachine(machine) },
                    { text: 'Set Machine Count', action: () => setMachineCount(machine) },
                    { text: 'Add Link', action: () => startLinkCreation(machine) },
                    { text: 'Set Output Item', action: () => setOutputItem(machine) },
                    { text: 'Set Output Rate', action: () => setOutputRate(machine) },
                    { text: 'Set Input Item', action: () => setInputItem(machine) },
                    { text: 'Set Max Consumption Rate', action: () => setInputRate(machine) },
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

            // Set output item
            function setOutputItem(machine) {
                const input = prompt('Enter output item name:', machine.outputItem || '');
                if (input !== null && input.trim() !== '') {
                    machine.outputItem = input.trim();

                    // Update item display
                    const itemOutput = machine.element.querySelector('.machine-item');
                    itemOutput.textContent = `Produces: ${machine.outputItem}`;

                    updateMachineStatus();
                }
            }

            // Set input item and rate
            function setInputItem(machine) {
                const itemName = prompt('Enter input item name:');

                if (itemName !== null && itemName.trim() !== '') {
                    const itemRate = prompt(`Enter consumption rate for ${itemName} (items/min):`);
                    const rate = parseFloat(itemRate);

                    if (!isNaN(rate) && rate > 0) {
                        // Store item and rate in machine's inputItems
                        machine.inputItems[itemName.trim()] = rate;

                        // Update total input rate
                        machine.inputRate = Object.values(machine.inputItems).reduce((sum, rate) => sum + rate, 0);

                        // Update rate display
                        const rateDisplay = machine.element.querySelector('.machine-rates div:nth-child(1) span:nth-child(2)');
                        rateDisplay.textContent = `${machine.inputRate}/min`;

                        updateMachineStatus();
                    }
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
                const margin = 50; // Half the width/height of machine
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
                const itemText = link.item ? `<span class="item-badge">${link.item}</span>` : '';
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

            // Set output rate for a machine
            function setOutputRate(machine) {
                const input = prompt('Enter output rate per machine (items/min):', machine.outputRate);
                const rate = parseFloat(input);

                if (!isNaN(rate) && rate >= 0) {
                    machine.outputRate = rate;

                    // Update rate display
                    const rateDisplay = machine.element.querySelector('.machine-rates div:nth-child(2) span:nth-child(2)');
                    const totalRate = (rate * machine.count).toFixed(1);
                    rateDisplay.textContent = `${totalRate}/min`;

                    updateMachineStatus();
                }
            }

            // Set input rate for a machine
            function setInputRate(machine) {
                const input = prompt('Enter max consumption rate per machine (items/min):', machine.inputRate);
                const rate = parseFloat(input);

                if (!isNaN(rate) && rate >= 0) {
                    machine.inputRate = rate;

                    // Update rate display
                    const rateDisplay = machine.element.querySelector('.machine-rates div:nth-child(1) span:nth-child(2)');
                    const totalRate = (rate * machine.count).toFixed(1);
                    rateDisplay.textContent = `${totalRate}/min`;

                    updateMachineStatus();
                }
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
                    const inputRateDisplay = machine.element.querySelector('.machine-rates div:nth-child(1) span:nth-child(2)');
                    const outputRateDisplay = machine.element.querySelector('.machine-rates div:nth-child(2) span:nth-child(2)');

                    const totalInputRate = (machine.inputRate * machine.count).toFixed(1);
                    const totalOutputRate = (machine.outputRate * machine.count).toFixed(1);

                    inputRateDisplay.textContent = `${totalInputRate}/min`;
                    outputRateDisplay.textContent = `${totalOutputRate}/min`;
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
