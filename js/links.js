// Extension of the CraftingCalculator class with link functionality
CraftingCalculator.prototype.startLinkCreation = function(machine) {
    this.activeLinkStart = machine;
    this.canvasContainer.style.cursor = 'crosshair';

    // Remove any existing handler to prevent duplicates
    document.removeEventListener('click', this.linkTargetHandler);

    // Create a handler bound to this instance
    this.linkTargetHandler = (e) => {
        // Only process if we're in link creation mode
        if (!this.activeLinkStart) return;

        // Find if we clicked on a machine
        let targetElement = e.target;

        // Look for machine element if we clicked inside one
        while (targetElement && !targetElement.classList.contains('machine') && targetElement !== document.body) {
            targetElement = targetElement.parentElement;
        }

        if (targetElement && targetElement.classList.contains('machine')) {
            const targetId = parseInt(targetElement.dataset.id);
            const targetMachine = this.machines.find(m => m.id === targetId);

            if (targetMachine && targetMachine !== this.activeLinkStart) {
                this.createLink(this.activeLinkStart, targetMachine);
                console.log(`Created link from ${this.activeLinkStart.name} to ${targetMachine.name}`);
            }

            // Clean up
            document.removeEventListener('click', this.linkTargetHandler);
            this.canvasContainer.style.cursor = 'grab';
            this.activeLinkStart = null;
        }
    };

    document.addEventListener('click', this.linkTargetHandler);
};

CraftingCalculator.prototype.createLink = function(sourceMachine, targetMachine) {
    // Check if link already exists
    const existingLink = this.links.find(link =>
        link.source === sourceMachine && link.target === targetMachine);

    if (existingLink) return;

    const id = this.nextLinkId++;
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
        const linkObj = this.links.find(l => l.label === label);
        if (linkObj) {
            this.setLinkThroughput(linkObj);
        }
    });

    linkGroup.appendChild(line);
    linkGroup.appendChild(hitbox);
    this.canvas.appendChild(linkGroup);
    this.canvas.appendChild(label);

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

    this.links.push(link);

    // Add source to target's inputs
    targetMachine.inputs.push(sourceMachine.id);

    // Add target to source's outputs
    sourceMachine.outputs.push(targetMachine.id);

    // If source has an output item and target has that as input item, connect them
    if (sourceMachine.outputItem && targetMachine.inputItems[sourceMachine.outputItem]) {
        link.item = sourceMachine.outputItem;
    }

    // Position the link
    this.updateLinkPosition(link);

    // Add event listener for context menu
    hitbox.addEventListener('contextmenu', (e) => this.handleLinkContextMenu(e, link));

    this.updateMachineStatus();
};

CraftingCalculator.prototype.handleLinkContextMenu = function(e, link) {
    e.preventDefault();
    e.stopPropagation();

    // Close any existing context menu
    this.closeContextMenu();

    // Create context menu
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'context-menu';
    this.contextMenu.style.left = `${e.clientX}px`;
    this.contextMenu.style.top = `${e.clientY}px`;

    // Add menu items
    const menuItems = [
        { text: 'Set Item', action: () => this.setLinkItem(link) },
        { text: 'Set Max Throughput Rate', action: () => this.setLinkThroughput(link) },
        { text: 'Delete Link', action: () => this.deleteLink(link) }
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

CraftingCalculator.prototype.setLinkItem = function(link) {
    const input = prompt('Enter item name transported by this link:', link.item);
    if (input !== null) {
        link.item = input.trim();
        this.updateLinkLabel(link);
        this.updateMachineStatus();
    }
};

CraftingCalculator.prototype.updateLinkPosition = function(link) {
    const sourceRect = link.source.element.getBoundingClientRect();
    const targetRect = link.target.element.getBoundingClientRect();

    // Calculate center points in canvas space
    const sourceX = (sourceRect.left - this.panX) / this.scale + sourceRect.width / 2;
    const sourceY = (sourceRect.top - this.panY) / this.scale + sourceRect.height / 2;
    const targetX = (targetRect.left - this.panX) / this.scale + targetRect.width / 2;
    const targetY = (targetRect.top - this.panY) / this.scale + targetRect.height / 2;

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
};

CraftingCalculator.prototype.updateLinkLabel = function(link) {
    const itemText = link.item ? `<span class="item-badge">${link.item}</span>` : '';
    const rateText = `${link.throughput || '?'} items/min`;
    link.label.innerHTML = itemText + ' ' + rateText;
};

CraftingCalculator.prototype.setLinkThroughput = function(link) {
    const input = prompt('Enter max throughput rate (items/min):', link.throughput);
    const rate = parseFloat(input);

    if (!isNaN(rate) && rate >= 0) {
        link.throughput = rate;
        this.updateLinkLabel(link);
        this.updateMachineStatus();
    }
};

CraftingCalculator.prototype.deleteLink = function(link) {
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
    const linkIdx = this.links.findIndex(l => l.id === link.id);
    if (linkIdx !== -1) {
        this.links.splice(linkIdx, 1);
    }

    this.updateMachineStatus();
};
