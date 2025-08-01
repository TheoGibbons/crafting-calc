/**
 * Simple test framework for Crafting Calculator
 */

class ErrorWithDetails extends Error {
    constructor(message, additional) {
        super(message);
        this.name = 'ErrorWithDetails';
        this.additional = additional;
    }

    toString() {
        return `${this.name}: ${this.message} - ${this.additional}`;
    }
}

class TestFramework {
    constructor() {
        this.testSuites = [];
        this.currentSuite = null;
        this.totalTests = 0;
        this.passedTests = 0;
        this.resultsElement = document.getElementById('test-results');
        this.summaryElement = document.getElementById('summary');
        this.visualizationIframe = document.getElementById('visualization-iframe');
        this.visualizableTests = new Map(); // Store tests that can be visualized
    }

    /**
     * Create a new test suite
     * @param {string} name - Name of the test suite
     * @param {Function} callback - Function containing the tests
     */
    suite(name, callback) {
        const suiteElement = document.createElement('div');
        suiteElement.className = 'test-suite';

        const headerElement = document.createElement('div');
        headerElement.className = 'test-suite-header';
        headerElement.textContent = name;
        suiteElement.appendChild(headerElement);

        const testsElement = document.createElement('div');
        testsElement.className = 'test-cases';
        suiteElement.appendChild(testsElement);

        this.resultsElement.appendChild(suiteElement);

        const suite = {
            name,
            element: suiteElement,
            testsElement,
            tests: []
        };

        this.testSuites.push(suite);
        this.currentSuite = suite;

        // Run the suite's tests
        try {
            callback.call(this);
        } catch (error) {
            console.error(`Error in test suite ${name}:`, error);
            this.logError(`Suite execution error: ${error.message}`);
        }

        this.currentSuite = null;
    }

    /**
     * Add a test case to the current suite
     * @param {string} name - Name of the test
     * @param {Function} callback - Test function
     */
    test(name, callback) {
        if (!this.currentSuite) {
            throw new Error('Cannot add test outside of a suite');
        }

        const testElement = document.createElement('div');
        testElement.className = 'test-case';

        const resultElement = document.createElement('span');
        resultElement.className = 'test-result';
        testElement.appendChild(resultElement);

        const nameElement = document.createElement('span');
        nameElement.className = 'test-name';
        nameElement.textContent = name;
        testElement.appendChild(nameElement);

        // Add visualize button (initially hidden)
        const visualizeButton = document.createElement('button');
        visualizeButton.className = 'visualize-test-btn';
        visualizeButton.textContent = 'Visualize';
        visualizeButton.style.display = 'none';
        testElement.appendChild(visualizeButton);

        const detailsElement = document.createElement('div');
        detailsElement.className = 'test-details';
        testElement.appendChild(detailsElement);

        this.currentSuite.testsElement.appendChild(testElement);

        this.totalTests++;

        // Run the test
        try {
            // Check if the test function contains machine operations
            const functionStr = callback.toString().toLowerCase();
            const isVisualizable = functionStr.includes('addmachine') &&
                                  (functionStr.includes('createlink') ||
                                   functionStr.includes('addinputitem') ||
                                   functionStr.includes('addoutputitem'));

            // If this test creates machines/links, store it for visualization
            if (isVisualizable) {
                this.visualizableTests.set(testElement, callback);
                visualizeButton.style.display = 'block';

                // Add click event for visualization
                visualizeButton.addEventListener('click', () => {
                    this.visualizeTest(testElement, callback, name);
                });
            }

            const result = callback.call(this);

            if (result === false) {
                this.fail(testElement, detailsElement, 'Test returned false');
            } else {
                this.pass(testElement, detailsElement);
            }
        } catch (error) {
            if (error instanceof ErrorWithDetails) {
                this.fail(testElement, detailsElement, `Error: ${e(error.message)} - <small style="opacity: 0.5;">${e(error.additional)}</small>`, true);
            } else {
                this.fail(testElement, detailsElement, `Error: ${error.message}`);
            }
            console.error(`Error in test ${name}:`, error);
        }

        this.updateSummary();
    }

    /**
     * Visualize a test in the iframe
     * @param {HTMLElement} testElement - The test element
     * @param {Function} callback - The test function to run
     * @param {string} name - The test name
     */
    visualizeTest(testElement, callback, name) {
        // Show or hide the iframe
        if (this.visualizationIframe.style.display === 'block' &&
            this.visualizationIframe.dataset.currentTest === name) {
            // If already showing this test, just hide it
            this.visualizationIframe.style.display = 'none';
            const buttons = document.querySelectorAll('.visualize-test-btn');
            buttons.forEach(btn => btn.textContent = 'Visualize');
            return;
        }

        // Mark this as the current test being visualized
        this.visualizationIframe.dataset.currentTest = name;

        // Update all buttons
        const buttons = document.querySelectorAll('.visualize-test-btn');
        buttons.forEach(btn => {
            if (btn.parentElement === testElement) {
                btn.textContent = 'Hide Visualization';
            } else {
                btn.textContent = 'Visualize';
            }
        });

        // Show iframe
        this.visualizationIframe.style.display = 'block';

        // Scroll to iframe
        this.visualizationIframe.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Wait for iframe to be ready
        this.waitForIframeLoad().then(() => {
            // Run the test in a clean calculator
            const iframeWindow = this.visualizationIframe.contentWindow;
            const originalCreateCalculator = window.createCalculator;

            try {

                try {
                    // Run the test to build the machines and links
                    callback.call(this);
                } catch (error) {}

                // Get the current state of the application
                const state = app.getExportData(name);

                iframeWindow.app.applyStateObject(state.data);

            } catch (error) {
                console.error('Error visualizing test:', error);
            } finally {
                // Restore original createCalculator
                window.createCalculator = originalCreateCalculator;
            }
        });
    }

    /**
     * Wait for iframe to be fully loaded
     */
    waitForIframeLoad() {
        return new Promise((resolve) => {
            if (this.visualizationIframe.contentWindow &&
                this.visualizationIframe.contentWindow.app) {
                resolve();
            } else {
                this.visualizationIframe.onload = resolve;
            }
        });
    }

    /**
     * Mark a test as passed
     */
    pass(testElement, detailsElement, message, html = false) {
        testElement.classList.add('pass');
        this.passedTests++;
        if (message) {
            if (html) {
                detailsElement.innerHTML = message;
            } else {
                detailsElement.textContent = message;
            }
        }
    }

    /**
     * Mark a test as failed
     */
    fail(testElement, detailsElement, message, html = false) {
        testElement.classList.add('fail');
        if (message) {
            if (html) {
                detailsElement.innerHTML = message;
            } else {
                detailsElement.textContent = message;
            }
        }
    }

    /**
     * Log an error message
     */
    logError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'test-case fail';
        errorElement.innerHTML = `<span class="test-result"></span><span>${message}</span>`;
        this.resultsElement.appendChild(errorElement);
    }

    /**
     * Update the test summary
     */
    updateSummary() {
        this.summaryElement.textContent = `Tests: ${this.passedTests} passed, ${this.totalTests - this.passedTests} failed, ${this.totalTests} total`;
    }

    /**
     * Assert that a condition is true
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
        return true;
    }

    /**
     * Assert that two values are equal
     */
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            // throw new Error(message + `<span>Expected ${expected}, but got ${actual}</span>`);
            throw new ErrorWithDetails(message, `Expected ${expected}, but got ${actual}`);
        }
        return true;
    }

    /**
     * Assert that a function throws an error
     */
    assertThrows(fn, errorType, message) {
        try {
            fn();
            throw new Error(message || 'Expected function to throw an error');
        } catch (error) {
            if (errorType && !(error instanceof errorType)) {
                throw new Error(message || `Expected error of type ${errorType.name}, but got ${error.constructor.name}`);
            }
            return true;
        }
    }
}

// Create global instance
const testRunner = new TestFramework();

// Convenience methods
function suite(name, callback) {
    testRunner.suite(name, callback);
}

function test(name, callback) {
    testRunner.test(name, callback);
}

function assert(condition, message) {
    return testRunner.assert(condition, message);
}

function assertEqual(actual, expected, message) {
    return testRunner.assertEqual(actual, expected, message);
}

function assertThrows(fn, errorType, message) {
    return testRunner.assertThrows(fn, errorType, message);
}

/**
 * HTML escape function
 */
function e(string) {
    return string
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Run tests after the page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('Running tests...');
    // Tests will be loaded from tests.js
});
