// Extension of the CraftingCalculator class with machine-related functionality
CraftingCalculator.prototype.addMachine = function() {
    const id = this.nextMachineId++;
    const name = `Machine ${id}`;

    // Create machine element
    const machine = document.createElement('div');
    machine.className = 'machine';
    machine.dataset.id = id;
    machine.style.left = `${-this.panX/this.scale + window.innerWidth/(2*this.scale) - 100}px`;
    machine.style.top = `${-this.panY/this.scale + window.innerHeight/(2*this.scale) - 100}px`;

    const efficiency = document.createElement('span');
    efficiency.className = 'efficiency';

    const headerName = document.createElement('span');
    headerName.className = 'machine-header-name';
    headerName.textContent = name;

    // Add machine header with name
    const header = document.createElement('div');
    header.className = 'machine-header';
    header.appendChild(headerName);
    header.appendChild(efficiency);
    header.title = "Click to rename";

    // Add click to rename
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        const machineId = parseInt(machine.dataset.id);
        const machineObj = this.machines.find(m => m.id === machineId);
        this.renameMachine(machineObj);
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
        const machineObj = this.machines.find(m => m.id === machineId);
        this.setMachineCount(machineObj);
    });
    machine.appendChild(countBadge);

    // Add rates section for machine inputs and outputs
    const rates = document.createElement('div');
    rates.className = 'machine-rates';

    // Create inputs container with proper structure
    const inputsContainer = this.createInputsContainer(machine);
    rates.appendChild(inputsContainer);

    // Create outputs container with proper structure
    const outputsContainer = this.createOutputsContainer(machine);
    rates.appendChild(outputsContainer);

    machine.appendChild(rates);
    this.canvas.appendChild(machine);

    // Add to machines array
    const machineObj = {
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
    };
    this.machines.push(machineObj);

    // Make draggable
    machine.addEventListener('mousedown', (e) => this.handleMachineMouseDown(e, machine));

    // Add context menu
    machine.addEventListener('contextmenu', (e) => this.handleMachineContextMenu(e, machine));

    this.updateMachineStatuses();
    return machineObj;
};

CraftingCalculator.prototype.createInputsContainer = function(machine) {
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

    // If no inputs, add a placeholder message
    const placeholder = document.createElement('div');
    placeholder.textContent = 'No inputs configured';
    placeholder.className = 'no-inputs-message';

    inputsList.appendChild(placeholder);

    // Assemble the inputs container
    inputsContainer.appendChild(inputsHeader);
    inputsContainer.appendChild(inputsList);

    // Set up event handler for the add button
    addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const machineId = parseInt(machine.dataset.id);
        const machineObj = this.machines.find(m => m.id === machineId);
        this.addInputItem(machineObj);
    });

    return inputsContainer;
};

CraftingCalculator.prototype.createOutputsContainer = function(machine) {
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

    // If no inputs, add a placeholder message
    const placeholder = document.createElement('div');
    placeholder.textContent = 'No outputs configured';
    placeholder.className = 'no-outputs-message';

    outputsList.appendChild(placeholder);

    // Assemble the outputs container
    outputsContainer.appendChild(outputsHeader);
    outputsContainer.appendChild(outputsList);

    // Set up event handler for the add button
    addOutputButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const machineId = parseInt(machine.dataset.id);
        const machineObj = this.machines.find(m => m.id === machineId);
        this.addOutputItem(machineObj);
    });

    return outputsContainer;
};

CraftingCalculator.prototype.handleMachineMouseDown = function(e, machine) {
    // Only handle left mouse button
    if (e.button !== 0) return;

    e.stopPropagation();

    let startX = parseInt(machine.style.left);
    let startY = parseInt(machine.style.top);
    let mouseStartX = e.clientX;
    let mouseStartY = e.clientY;
    let isDragging = true;

    const mouseMoveHandler = (e) => {
        if (!isDragging) return;

        const dx = (e.clientX - mouseStartX) / this.scale;
        const dy = (e.clientY - mouseStartY) / this.scale;

        machine.style.left = `${startX + dx}px`;
        machine.style.top = `${startY + dy}px`;

        // Update any connected links
        this.updateLinks();
    };

    const mouseUpHandler = () => {
        isDragging = false;
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
};

CraftingCalculator.prototype.handleMachineContextMenu = function(e, machineElement) {
    e.preventDefault();
    e.stopPropagation();

    const machineId = parseInt(machineElement.dataset.id);
    const machine = this.machines.find(m => m.id === machineId);

    // Close any existing context menu
    this.closeContextMenu();

    // Create context menu
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'context-menu';
    this.contextMenu.style.left = `${e.clientX}px`;
    this.contextMenu.style.top = `${e.clientY}px`;

    // Add menu items
    const menuItems = [
        { text: 'Add Link', action: () => this.startLinkCreation(machine) },
        { text: 'Delete', action: () => this.deleteMachine(machine) }
    ];

    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.text;
        menuItem.addEventListener('click', () => {
            this.closeContextMenu();
            item.action();
        });
        this.contextMenu.appendChild(menuItem);
    });

    document.body.appendChild(this.contextMenu);

    // Close menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', () => this.closeContextMenu(), { once: true });
    }, 0);
};

CraftingCalculator.prototype.renameMachine = function(machine) {
    const newName = prompt('Enter new name:', machine.name);
    if (newName !== null && newName.trim() !== '') {
        machine.name = newName.trim();
        const headerName = machine.element.querySelector('.machine-header-name');
        headerName.textContent = newName.trim();
    }
};

CraftingCalculator.prototype.setMachineCount = function(machine) {
    const input = prompt('Enter number of machines:', machine.count);
    const count = parseFloat(input);

    if (!isNaN(count) && count > 0) {
        machine.count = count;

        // Update count badge
        const countBadge = machine.element.querySelector('.machine-count');
        countBadge.textContent = count;
        countBadge.style.display = count > 1 ? 'flex' : 'none';

        // Update effective output rate based on machine count
        this.updateMachineStatuses();
    }
};

CraftingCalculator.prototype.deleteMachine = function(machine) {
    // First, delete all connected links
    const connectedLinks = this.links.filter(link =>
      link.source.id === machine.id || link.target.id === machine.id);

    // Make a copy of the array to avoid modification during iteration
    [...connectedLinks].forEach(link => this.deleteLink(link));

    // Remove from DOM
    machine.element.remove();

    // Remove from machines array
    const machineIdx = this.machines.findIndex(m => m.id === machine.id);
    if (machineIdx !== -1) {
        this.machines.splice(machineIdx, 1);
    }
};
