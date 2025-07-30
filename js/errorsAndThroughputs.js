/**
 * Check for user config errors and display them
 * Update the throughput values on machines and links
 */
CraftingCalculator.prototype.updateMachineStatuses = function () {
    // return;

    // Reset all the state values stored in machines and links
    this.resetThroughputsOnMachineAndLinks();

    // If there are no loops
    if (!this.setMajorErrors()) {

        // If no loops, set all machines and links current throughput's
        this.updateMachineThroughputs();

        this.setSimpleErrors()
    }

    this.showMachineAndLinkErrorsAndThroughputs();
};

CraftingCalculator.prototype.resetThroughputsOnMachineAndLinks = function () {
    // Reset all machines and links to default state

    for (const machine of this.machines) {
        for (const [item, inputItem] of Object.entries(machine.inputItems)) {
            inputItem.currentThroughput = null;
            inputItem.attemptedThroughput = null;
            inputItem.efficiency = null;
            inputItem.state = 'normal';
            inputItem.errorMessages = [];
        }
        for (const [item, outputItem] of Object.entries(machine.outputItems)) {
            outputItem.currentThroughput = null;
            outputItem.state = 'normal';
            outputItem.errorMessages = [];
        }
    }

    for (const link of this.links) {
        link.state = 'normal';
        link.errorMessages = [];
        link.currentThroughput = 0;
        link.attemptedThroughput = 0;
        link.capacity = null;
        link.efficiency = 0;
    }
};

CraftingCalculator.prototype.setMajorErrors = function () {
    const linksInALoop = this.getAllLinksInALoop();
    if (linksInALoop.length) {

        // Set all machines and links in the loop to error state
        for (const link of linksInALoop) {
            link.state = 'error';
            link.errorMessages.push('In Loop');
        }

        return true;
    }

    return false;
};

CraftingCalculator.prototype.getAllLinksInALoop = function () {
    const linksInLoop = new Set();

    // Helper: DFS from each link, tracking path
    const dfs = (currentLink, pathLinks, visitedLinks) => {
        if (pathLinks.includes(currentLink)) {
            // Found a cycle, add all links in the cycle
            const cycleStart = pathLinks.indexOf(currentLink);
            for (let i = cycleStart; i < pathLinks.length; i++) {
                linksInLoop.add(pathLinks[i]);
            }
            return;
        }
        if (visitedLinks.has(currentLink)) return;

        visitedLinks.add(currentLink);
        pathLinks.push(currentLink);

        // Traverse to next links where source matches this link's target
        this.links.forEach(nextLink => {
            if (nextLink.source.id === currentLink.target.id) {
                dfs(nextLink, pathLinks, visitedLinks);
            }
        });

        pathLinks.pop();
    };

    this.links.forEach(link => {
        dfs(link, [], new Set());
    });

    return Array.from(linksInLoop);
};

CraftingCalculator.prototype.updateMachineThroughputs = function () {

// debugger

    // List of all machine IDs to keep track of all machines we've visited. Once complete this array will be empty
    const machineIds = this.machines.map(m => m.id);
    const machineIdsVisited = [];


    const getItemsActuallyInput = (machine) => {

        // create a list of all input items and their actual throughputs
        const inputLinks = this.links.filter(l => l.target.id === machine.id && l.item);
        const returnedItems = {};

        inputLinks.forEach(link => {
            dfs(link.source);
            returnedItems[link.item] = (returnedItems[link.item] ? returnedItems[link.item] : 0) + link.currentThroughput || 0;
        })

        return returnedItems;
    }

    // Depth-first search (DFS) to calculate throughput and errors
    // Note the deepest node is actually the one that doesn't have any input links
    const dfs = (machine) => {

        if (machineIdsVisited.indexOf(machine.id) !== -1) {
            return machine.outputItems
        }

        // Get the items and the rate of the items actually supplied to this machine
        const itemsActuallySupplied = getItemsActuallyInput(machine);

        Object.entries(machine.inputItems).forEach(([name, inputItem]) => {
            inputItem.attemptedThroughput = itemsActuallySupplied[name] || 0;
            inputItem.efficiency = inputItem.attemptedThroughput / (inputItem.rate * machine.count);
            inputItem.currentThroughput = Math.min(
                inputItem.rate * machine.count,
                (inputItem.rate * machine.count) * inputItem.efficiency
            );
        });

        // Get the min ratio of rate vs throughput
        machine.efficiency =
            Object.keys(machine.inputItems).length ?
                Math.min(...Object.values(machine.inputItems).map(inputItem => inputItem.currentThroughput / (inputItem.rate * machine.count))) :
                1.0     // There are no inputs for this machine so it can run at 100% efficiency

        Object.entries(machine.outputItems).forEach(([name, outputItem]) => {
            outputItem.currentThroughput = (outputItem.rate * machine.count) * machine.efficiency;

            // Put onto the output links
            const outputLinks = this.links.filter(l => l.source.id === machine.id && l.item === name)
                // .sort((a, b) => a.throughput - b.throughput);        // Sort links from slowest to fastest
                .sort((a, b) => this.getLinkCapacity(a) - this.getLinkCapacity(b));        // Sort links from slowest to fastest

            let outputItemThroughputRemaining = outputItem.currentThroughput;
            let linksVisited = 0;

            outputLinks.forEach(link => {
                link.attemptedThroughput = outputItemThroughputRemaining / (outputLinks.length - linksVisited);
                link.capacity = this.getLinkCapacity(link);
                link.currentThroughput = Math.min(link.attemptedThroughput, link.capacity);
                // link.currentThroughput = link.throughput === null ? link.attemptedThroughput : Math.min(link.attemptedThroughput, link.throughput);
                link.efficiency = link.attemptedThroughput / link.currentThroughput;

                outputItemThroughputRemaining -= link.currentThroughput;
                linksVisited++;
            })
        })

        machineIdsVisited.push(machine.id)

    }

    while (machineIds.length) {
        const searchMachineId = machineIds.shift();
        const machine = this.machines.find(m => m.id === searchMachineId);
        if (machine) {
            dfs(machine);
        } else {
            console.error(`Machine with ID ${searchMachineId} not found`);
        }
    }


    // //
    // // // List of generator machine IDs (machines that don't require anything to produce)
    // // const generatorMachines = this.machines.filter(
    // //   m => !this.links.filter(l => l.item && l.targetId === m.id).length
    // // );
    //
    // this.machines.forEach(m => {
    //     for (const [item, inputItem] of Object.entries(m.inputItems)) {
    //         inputItem.currentThroughput = 7.7;
    //     }
    //     for (const [item, outputItem] of Object.entries(m.outputItems)) {
    //         outputItem.currentThroughput = 7.7;
    //     }
    // });
    //
    // this.links.forEach(link => {
    //     link.state = 'normal';
    //     link.errorMessage = '';
    //     link.currentThroughput = 0;
    //
    //     // If the link has an item and throughput, set the current throughput
    //     if (link.item && link.throughput) {
    //         link.currentThroughput = 100;
    //     }
    // });

}

CraftingCalculator.prototype.getLinkCapacity = function (link) {
    if (link.capacity !== null) {
        // If the link already has a capacity set, return it
        return link.capacity;
    }

    const targetMachine = this.machines.find(m => m.id === link.target.id);
    if (!targetMachine) {
        console.error(`Target machine with ID ${link.target.id} not found for link ${link.id}`);
        return 0;
    }
    link.capacity = Math.min(
        typeof targetMachine.inputItems[link.item]?.rate === 'undefined' ?
            0 :
            targetMachine.inputItems[link.item].rate * targetMachine.count,
        link.throughput === null ? Infinity : link.throughput,
    );

    return link.capacity;
}

CraftingCalculator.prototype.percentageToColor = function (percentage) {
    return `hsl(${percentage * 120}deg, 100%, ${percentage * (25 - 50) + 50}%)`;
};

CraftingCalculator.prototype.showMachineAndLinkErrorsAndThroughputs = function () {

    this.machines.forEach(m => {
        // Input items
        const efficiencyElem = m.element.querySelector('.efficiency')
        efficiencyElem.textContent = (m.efficiency * 100).toFixed(0) + '%';
        efficiencyElem.style.color = this.percentageToColor(m.efficiency);
        efficiencyElem.title = `Machine running at ${(m.efficiency * 100).toFixed(0)}% capacity`;

        // Input items
        m.element.querySelectorAll('.input-item-row').forEach(row => {
            const rowName = row.querySelector('.input-item-name').textContent.trim();
            const errorIcon = row.querySelector('.error-icon');
            const infoIcon = row.querySelector('.info-icon');
            const inputItem = m.inputItems[rowName];

            if (!inputItem) {
                console.error(`Input item "${rowName}" not found in machine ${m.name}`);
            }

            errorIcon.style.display = 'none';
            infoIcon.style.display = 'none';
            infoIcon.style.background = '';

            if (inputItem.state === 'error') {
                errorIcon.style.display = '';
                errorIcon.title = inputItem.errorMessages.join("\n");
            } else if (inputItem.rate === null) {
                errorIcon.style.display = '';
                errorIcon.title = "Add throughput rate";        // Impossible
            } else {
                infoIcon.style.display = '';
                infoIcon.style.background = this.percentageToColor(inputItem.efficiency);
                infoIcon.title = `Max throughput: ${inputItem.rate * m.count} items/s\n` +
                    `Current throughput: ${inputItem.currentThroughput} items/s\n` +
                    (inputItem.currentThroughput !== inputItem.attemptedThroughput ? `!!! Input: ${inputItem.attemptedThroughput} items/s\n` : '') +
                    `Efficiency: ${(inputItem.efficiency * 100).toFixed(0)}%`;
            }
        })

        // Output items
        m.element.querySelectorAll('.output-item-row').forEach(row => {
            const rowName = row.querySelector('.output-item-name').textContent.trim();
            const errorIcon = row.querySelector('.error-icon');
            const infoIcon = row.querySelector('.info-icon');
            const outputItem = m.outputItems[rowName];

            if (!outputItem) {
                console.error(`Output item "${rowName}" not found in machine ${m.name}`);
            }

            errorIcon.style.display = 'none';
            infoIcon.style.display = 'none';
            infoIcon.style.background = '';

            if (outputItem.state === 'error') {
                errorIcon.style.display = '';
                errorIcon.title = outputItem.errorMessages.join("\n");
            } else if (outputItem.rate === null) {
                errorIcon.style.display = '';
                errorIcon.title = "Add throughput rate";        // Impossible
            } else {
                infoIcon.style.display = '';
                infoIcon.style.background = this.percentageToColor(m.efficiency);
                infoIcon.title = `Max throughput: ${outputItem.rate * m.count} items/s\n` +
                    `Current throughput: ${outputItem.currentThroughput} items/s\n` +
                    `Efficiency: ${(m.efficiency * 100).toFixed(0)}%`;
            }
        })
    })

    this.links.forEach(link => {
        const errorIcon = link.label.querySelector('.error-icon');
        const infoIcon = link.label.querySelector('.info-icon');
        const itemThroughput = link.label.querySelector('.item-throughput');

        errorIcon.style.display = 'none';
        infoIcon.style.display = 'none';
        infoIcon.style.background = '';

        if (link.state === 'error') {
            errorIcon.style.display = '';
            errorIcon.title = link.errorMessages.join("\n");
        } else {
            itemThroughput.textContent = `${link.currentThroughput} items/min`;
            infoIcon.style.display = '';
            infoIcon.style.background = this.percentageToColor(link.efficiency);
            infoIcon.title = `Max throughput: ${link.throughput === null ? 'Not set' : link.throughput + ' items/s'}\n` +
                `Current throughput: ${link.currentThroughput} items/s\n` +
                (link.currentThroughput !== link.attemptedThroughput ? `!!! Input: ${link.attemptedThroughput} items/s\n` : '') +
                `Efficiency: ${(link.efficiency * 100).toFixed(0)}%`;
        }
    })
};

CraftingCalculator.prototype.setSimpleErrors = function () {
    this.links.forEach(link => {
        if (!link.item) {
            // If there is no item set on the link
            link.state = 'error';
            link.errorMessages.push('Add item');
        // } else if (!link.throughput) {
        //     // If there is no throughput rate set on the link
        //     link.state = 'error';
        //     link.errorMessages.push('Add throughput rate');
        } else if (typeof link.source.outputItems[link.item] === 'undefined') {
            // If the link is transporting something that is not produced by the source machine
            link.state = 'error';
            link.errorMessages.push(`Item "${link.item}" not produced by source machine`);
        } else if (typeof link.target.inputItems[link.item] === 'undefined') {
            // If the link is transporting something that is not consumed by the target machine
            link.state = 'error';
            link.errorMessages.push(`Item "${link.item}" not consumed by target machine`);
        }
    })

    this.machines.forEach(machine => {
        const machinesInputLinks = this.links.filter(link => link.target.id === machine.id);
        const machinesOutputLinks = this.links.filter(link => link.source.id === machine.id);

        for (const [item, inputItem] of Object.entries(machine.inputItems)) {
            const isALinkFeedingThisItem = machinesInputLinks.some(link => link.item === item);
            if (!isALinkFeedingThisItem) {
                inputItem.state = 'error';
                inputItem.errorMessages.push(`No link feeding this item`);
            }
        }


        for (const [item, outputItem] of Object.entries(machine.outputItems)) {
            if (machinesOutputLinks.length) {
                // If the machine has an output link, then all items produced must have an output link
                const isALinkTakingThisItem = machinesOutputLinks.some(link => link.item === item);
                if (!isALinkTakingThisItem) {
                    outputItem.state = 'error';
                    outputItem.errorMessages.push(`No link taking this item`);
                }
            }
        }

    })

}

CraftingCalculator.prototype.optimizeMachineCount = function () {

    if (this.getAllLinksInALoop().length) {
        alert("Cannot optimize machine count when there are loops in the graph");
        return;
    }

    // First, update the current machine statuses to get accurate throughputs
    this.updateMachineStatuses();


    // List of generator machine IDs (machines that don't require anything to produce an output)
    const generatorMachines = this.machines.filter(
      m => !this.links.filter(l => l.item && l.targetId === m.id).length
    );

    // We are going to work through each generator machine and set the count of each connected machine to the maximum possible
    // All the way down the chain of machines
    // There will be an issue if we get to a machine that is feed by multiple machines, but we will just set the count to the maximum possible for that machine
    // and then work our way back up the chain

    // Keep track of machines we've processed
    const processedMachines = new Set();

    // Process each machine in the network, starting from generators
    const optimizeMachineAndDownstream = (machine, targetThroughput = null) => {
        if (processedMachines.has(machine.id)) {
            return;
        }

        // Mark this machine as processed
        processedMachines.add(machine.id);

        // For generator machines, keep their current count
        // For other machines, calculate optimal count based on inputs
        if (targetThroughput !== null) {
            // Find the limiting input item
            let maxRequiredCount = 0;

            Object.entries(machine.inputItems).forEach(([itemName, inputItem]) => {
                // Calculate how many machines needed to process this input
                const countNeeded = targetThroughput / inputItem.rate;
                maxRequiredCount = Math.max(maxRequiredCount, countNeeded);
            });

            // Update machine count (round up to ensure sufficient capacity)
            machine.count = Math.ceil(maxRequiredCount);
        }

        // Process outgoing links and downstream machines
        const outgoingLinks = this.links.filter(l => l.source.id === machine.id && l.item);

        // Group links by target machine
        const targetMachines = {};
        outgoingLinks.forEach(link => {
            if (!targetMachines[link.target.id]) {
                targetMachines[link.target.id] = {
                    machine: this.machines.find(m => m.id === link.target.id),
                    totalThroughput: 0,
                    items: {}
                };
            }

            const item = link.item;
            const outputItem = machine.outputItems[item];
            const throughput = outputItem.rate * machine.count;

            // Track throughput by item
            targetMachines[link.target.id].items[item] =
                (targetMachines[link.target.id].items[item] || 0) + throughput;

            // Track total throughput to this machine
            targetMachines[link.target.id].totalThroughput += throughput;
        });

        // Process each downstream machine
        Object.values(targetMachines).forEach(targetData => {
            optimizeMachineAndDownstream(targetData.machine, targetData.totalThroughput);
        });
    };

    // Start optimization from each generator
    generatorMachines.forEach(machine => {
        optimizeMachineAndDownstream(machine);
    });

    // Update all machine statuses to reflect new counts
    this.updateMachineStatuses();
};
