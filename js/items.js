// Extension of the CraftingCalculator class with input/output item functionality
CraftingCalculator.prototype.addInputItem = function(machine) {
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
            this.updateMachineInputItemsDisplay(machine);

            this.updateMachineStatuses();
        }
    }
};

CraftingCalculator.prototype.updateMachineInputItemsDisplay = function(machine) {
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
                this.editInputItemName(machine, item);
            });

            // Input rate (clickable to edit rate only)
            const itemRate = document.createElement('span');
            itemRate.textContent = `${rate}/min`;
            itemRate.className = 'input-item-rate';
            itemRate.title = "Click to edit input rate";
            itemRate.style.cursor = 'pointer';
            itemRate.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editInputItemRate(machine, item);
            });

            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '×';
            deleteButton.className = 'input-delete-button';
            deleteButton.title = "Delete this input";
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteInputItem(machine, item);
            });

            // Assemble the item details
            itemDetails.appendChild(this.createIconsHolder());
            itemDetails.appendChild(itemName);
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
};

CraftingCalculator.prototype.editInputItemName = function(machine, itemName) {
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
        this.updateMachineInputItemsDisplay(machine);
        this.updateMachineStatuses();
    }
};

CraftingCalculator.prototype.editInputItemRate = function(machine, itemName) {
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
    this.updateMachineInputItemsDisplay(machine);
    this.updateMachineStatuses();
};

CraftingCalculator.prototype.deleteInputItem = function(machine, itemName) {
    if (confirm(`Delete input item "${itemName}"?`)) {
        delete machine.inputItems[itemName];

        // Update total input rate
        machine.inputRate = Object.values(machine.inputItems).reduce((sum, rate) => sum + rate, 0);

        // Update the display
        this.updateMachineInputItemsDisplay(machine);
        this.updateMachineStatuses();
    }
};

// Output item methods
CraftingCalculator.prototype.addOutputItem = function(machine) {
    const itemName = prompt('Enter output item name:');

    if (itemName !== null && itemName.trim() !== '') {
        const itemRate = prompt(`Enter production rate for ${itemName} (items/min):`);
        const rate = parseFloat(itemRate);

        if (!isNaN(rate) && rate > 0) {
            // Store item and rate in machine's outputItems
            machine.outputItems[itemName.trim()] = rate;

            // Update total output rate
            machine.outputRate = Object.values(machine.outputItems).reduce((sum, rate) => sum + rate, 0);

            // Update all links outputting from this machine with this item if they aren't already carrying something
            for (const link of this.links) {
                if (link.source.id === machine.id && !link.item) {
                    link.item = itemName.trim();
                }
            }

            // Update the machine to show the output items
            this.updateMachineOutputItemsDisplay(machine);

            this.updateMachineStatuses();
        }
    }
};

CraftingCalculator.prototype.updateMachineOutputItemsDisplay = function(machine) {
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
                this.editOutputItemName(machine, item);
            });

            // Output rate (clickable to edit rate only)
            const itemRate = document.createElement('span');
            itemRate.textContent = `${rate}/min`;
            itemRate.className = 'output-item-rate';
            itemRate.title = "Click to edit output rate";
            itemRate.style.cursor = 'pointer';
            itemRate.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editOutputItemRate(machine, item);
            });

            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '×';
            deleteButton.className = 'output-delete-button';
            deleteButton.title = "Delete this output";
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteOutputItem(machine, item);
            });

            // Assemble the item details
            itemDetails.appendChild(this.createIconsHolder());
            itemDetails.appendChild(itemName);
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
};

CraftingCalculator.prototype.editOutputItemName = function(machine, itemName) {
    const currentRate = machine.outputItems[itemName];

    // Ask for new name
    const newName = prompt(`Edit output item name:`, itemName);

    // Return if canceled or empty
    if (newName === null || newName.trim() === '') return;

    // If the name changed, delete the old entry and add a new one with the same rate
    if (newName.trim() !== itemName) {
        delete machine.outputItems[itemName];
        machine.outputItems[newName.trim()] = currentRate;

        // Update all links outputting from this machine with this item if they aren't already carrying something or where already carrying this item
        for (const link of this.links) {
            if (link.source.id === machine.id && (link.item === itemName || !link.item)) {
                link.item = newName.trim();

                this.updateLinkLabel(link);
            }
        }

        // Update the display
        this.updateMachineOutputItemsDisplay(machine);
        this.updateMachineStatuses();
    }
};

CraftingCalculator.prototype.editOutputItemRate = function(machine, itemName) {
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
    this.updateMachineOutputItemsDisplay(machine);
    this.updateMachineStatuses();
};

CraftingCalculator.prototype.deleteOutputItem = function(machine, itemName) {
    if (confirm(`Delete output item "${itemName}"?`)) {
        delete machine.outputItems[itemName];

        // Update total output rate
        machine.outputRate = Object.values(machine.outputItems).reduce((sum, rate) => sum + rate, 0);

        // Update the display
        this.updateMachineOutputItemsDisplay(machine);
        this.updateMachineStatuses();
    }
};
