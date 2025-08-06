/**
 * Test cases for Crafting Calculator
 */

// Wait for all application scripts to load
document.addEventListener('DOMContentLoaded', function () {

    // Create a clean calculator instance for testing
    function createCalculator() {
        return window.app.newProject(false, false)
    }

    // Sample test suite for basic functionality
    suite('Calculator Creation', function () {
        test('Calculator instance can be created', function () {
            const calculator = createCalculator();
            assert(calculator instanceof CraftingCalculator, 'Should be an instance of CraftingCalculator');
            assertEqual(calculator.machines.length, 0, 'Should start with no machines');
            assertEqual(calculator.links.length, 0, 'Should start with no links');
        });

        test('Calculator has expected initial values', function () {
            const calculator = createCalculator();
            assertEqual(calculator.scale, 1, 'Initial scale should be 1');
            assertEqual(calculator.panX, 0, 'Initial panX should be 0');
            assertEqual(calculator.panY, 0, 'Initial panY should be 0');
            assertEqual(calculator.nextMachineId, 1, 'Initial nextMachineId should be 1');
        });
    });

    // Test suite for machine-related functionality
    suite('Machine Operations', function () {
        test('Machine can be created', function () {
            const calculator = createCalculator();

            calculator.addMachine();

            assertEqual(calculator.machines.length, 1, 'Should have 1 machine after adding');
            assertEqual(calculator.nextMachineId, 2, 'nextMachineId should be incremented');
        });
        test('Machine count', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const link1 = calculator.createLink(machine1, machine2);
            const link2 = calculator.createLink(machine2, machine3);

            calculator.addOutputItem(machine1, 'item1', 1000);
            calculator.addOutputItem(machine2, 'item2', 100);

            calculator.addInputItem(machine2, 'item1', 100);
            calculator.addInputItem(machine3, 'item2', 100);

            calculator.setMachineCount(machine2, 5);

            assertEqual(machine2.inputItems.item1.attemptedThroughput, 500, 'Machine 2 should have attempted throughput of 500');
            assertEqual(machine2.inputItems.item1.currentThroughput, 500, 'Machine 2 should have current throughput of 500');
            assertEqual(link1.currentThroughput, 500, 'Link 1 should have current throughput of 500');
            assertEqual(link2.attemptedThroughput, 500, 'Link 2 should have current throughput of 100');
            assertEqual(link2.currentThroughput, 100, 'Link 2 should have current throughput of 100');
        });
    });

    suite('Link', function () {
        test('Link can be created', function () {
            const calculator = createCalculator();

            const sourceMachine = calculator.addMachine();
            const targetMachine = calculator.addMachine();
            const link = calculator.createLink(sourceMachine, targetMachine);

            assertEqual(link.source.id, sourceMachine.id, 'Should have 1 machine after adding');
        });
        test('Loop detection working', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            calculator.createLink(machine1, machine2);
            calculator.createLink(machine2, machine3);

            assertEqual(calculator.getAllLinksInALoop().length, 0, 'Should not detect a loop in links');

            calculator.createLink(machine3, machine1);

            assert(calculator.getAllLinksInALoop().length > 0, 'Should detect a loop in links');
        });
        test('Split Output between 2 equal links', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const link1 = calculator.createLink(machine1, machine2);
            const link2 = calculator.createLink(machine1, machine3);

            calculator.addOutputItem(machine1, 'item1', 100);

            calculator.addInputItem(machine2, 'item1', 50);
            calculator.addInputItem(machine3, 'item1', 50);

            assertEqual(link1.currentThroughput, 50, 'Link 1 should have attempted throughput of 50');
            assertEqual(link2.currentThroughput, 50, 'Link 2 should have attempted throughput of 50');

        });
        test('Split Output between 2 unequal links', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const link1 = calculator.createLink(machine1, machine2);
            const link2 = calculator.createLink(machine1, machine3);

            calculator.addOutputItem(machine1, 'item1', 100);

            calculator.addInputItem(machine2, 'item1', 10);
            calculator.addInputItem(machine3, 'item1', 50);

            assertEqual(link1.currentThroughput, 10, 'Link 1 should have attempted throughput of 10');
            assertEqual(link2.currentThroughput, 50, 'Link 2 should have attempted throughput of 50');

            calculator.editInputItemRate(machine2, 'item1', 50);
            calculator.editInputItemRate(machine3, 'item1', 10);

            assertEqual(link1.currentThroughput, 50, 'Link 1 should have attempted throughput of 50');
            assertEqual(link2.currentThroughput, 10, 'Link 2 should have attempted throughput of 10');

        });
        test('Check max throughput', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const link1 = calculator.createLink(machine1, machine2);
            const link2 = calculator.createLink(machine1, machine3);

            calculator.addOutputItem(machine1, 'item1', 100);

            calculator.addInputItem(machine2, 'item1', 50);
            calculator.addInputItem(machine3, 'item1', 50);

            calculator.setLinkThroughput(link1, 10)

            assertEqual(link1.currentThroughput, 10, 'Link 1 should have current throughput of 10');
            assertEqual(link2.currentThroughput, 50, 'Link 2 should have current throughput of 90');

        });
    });

    suite('Optimise Machine Counts', function () {
        test('Simple 2 Machine Optimisation', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const link1 = calculator.createLink(machine1, machine2);

            calculator.addOutputItem(machine1, 'item1', 1000);
            calculator.addInputItem(machine2, 'item1', 100);

            calculator.optimizeMachineCount3()

            assertEqual(machine2.count, 10, 'Machine 2 should have count of 10');

        });
        test('2 generators, one of which is under utilised', function () {
            const calculator = createCalculator();

            const generator1 = calculator.addMachine();
            const generator2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const link1 = calculator.createLink(generator1, machine3);
            const link2 = calculator.createLink(generator2, machine3);

            calculator.addOutputItem(generator1, 'item1', 1000);
            calculator.addOutputItem(generator2, 'item2', 200);
            calculator.addInputItem(machine3, 'item1', 100);
            calculator.addInputItem(machine3, 'item2', 100);

            calculator.optimizeMachineCount3()

            assertEqual(machine3.count, 2, 'Machine 2 should have count of 2');

        });
        test('2 generators, one of which is under utilised due to down the line generation limit', function () {
            const calculator = createCalculator();

            const generator1 = calculator.addMachine();
            const generator2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const machine4 = calculator.addMachine();
            const machine5 = calculator.addMachine();
            const link1 = calculator.createLink(generator1, machine3);
            const link2 = calculator.createLink(machine3, machine5);
            const link3 = calculator.createLink(generator2, machine4);
            const link4 = calculator.createLink(machine4, machine5);

            calculator.addOutputItem(generator1, 'item1', 100);

            calculator.addInputItem(machine3, 'item1', 100);
            calculator.addOutputItem(machine3, 'item2', 1000);

            calculator.addInputItem(machine4, 'item1', 50);
            calculator.addOutputItem(machine4, 'item4', 200);

            calculator.addOutputItem(generator2, 'item1', 100);

            calculator.addInputItem(machine5, 'item2', 100);
            calculator.addInputItem(machine5, 'item4', 80);
            calculator.addOutputItem(machine5, 'item3', 100);

            calculator.optimizeMachineCount3()

            assertEqual(generator1.count, 0.5, 'Generator 1 should have count of 0.5');
            assertEqual(generator2.count, 1, 'Generator 2 should have count of 1');
            assertEqual(machine3.count, 0.5, 'Machine 3 should have count of 0.5');
            assertEqual(machine4.count, 2, 'Machine 4 should have count of 2');
            assertEqual(machine5.count, 5, 'Machine 5 should have count of 5');

        });
        test('Split Join', function () {
            const calculator = createCalculator();

            const machine1 = calculator.addMachine();
            const machine2 = calculator.addMachine();
            const machine3 = calculator.addMachine();
            const machine4 = calculator.addMachine();

            const link1 = calculator.createLink(machine1, machine2);
            const link2 = calculator.createLink(machine1, machine3);
            const link3 = calculator.createLink(machine2, machine4);
            const link4 = calculator.createLink(machine3, machine4);

            calculator.addOutputItem(machine1, 'Iron Bar', 200);
            calculator.addOutputItem(machine2, 'Iron Plate', 50);
            calculator.addOutputItem(machine3, 'Iron Rod', 25);
            calculator.addOutputItem(machine4, 'Output Item', 1);

            calculator.addInputItem(machine2, 'Iron Bar', 50);
            calculator.addInputItem(machine3, 'Iron Bar', 25);
            calculator.addInputItem(machine4, 'Iron Plate', 50);
            calculator.addInputItem(machine4, 'Iron Rod', 25);

            calculator.optimizeMachineCount3()

            assertEqual(machine1.count, 1, 'Machine 1 should have count of 1');
            assertEqual(machine2.count.toFixed(1), 2.66.toFixed(1), 'Machine 2 should have count of 2.66');
            assertEqual(machine3.count.toFixed(1), 2.66.toFixed(1), 'Machine 3 should have count of 2.66');
            assertEqual(machine4.count.toFixed(1), 2.66.toFixed(1), 'Machine 4 should have count of 2.66');

        });
    });

});
