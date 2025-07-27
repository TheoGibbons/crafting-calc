# Crafting Calculator

A visual web-based tool for designing and optimizing production chains. This calculator helps you plan complex manufacturing processes by connecting machines, specifying input/output rates, and analyzing throughput.

## Access the live demo

[Demo Here](https://theogibbons.github.io/crafting-calc/index.html)

## Features

- **Infinite interactive Canvas**: Drag, zoom, and pan to organize your production layout
- **Machine Management**: Add, rename, and configure machines with custom inputs and outputs
- **Connection System**: Create links between machines to visualize item flow
- **Throughput Analysis**: Automatically calculates and displays efficiency and bottlenecks
- **Save/Load Functionality**: Preserve your designs for future reference or sharing
- **Auto Save Functionality**: Every 10 seconds, your current configuration is saved to local storage.
- **Auto Load Functionality**: When the page is loaded, the last saved configuration is automatically loaded from local storage.

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server-side requirements - runs entirely in the browser

### Installation

1. No install required just access the [Demo Here](https://theogibbons.github.io/crafting-calc/index.html)

### Alternative installation, you can run the project locally:
1. Clone the repository:
   ```
   git clone https://github.com/TheoGibbons/crafting-calc.git
   ```
2. Open `index.html` in your web browser

## Usage

1. **Add a Machine**: Click the "Add Machine" button to place a new machine on the canvas
2. **Configure Machines**: Click on a machine header to rename it
3. **Add Inputs/Outputs**: Define what items a machine consumes and produces, along with their rates
4. **Create Connections**: Connect machines to establish item flow between them
5. **Analyze Efficiency**: The system will automatically calculate and display throughput information
6. **Save Your Work**: Use the save function to store your configuration for later use

## Controls

- **Left Mouse Button**: Drag to move machines
- **Click and drag Mouse**: Pan the canvas
- **Mouse Wheel**: Zoom in/out
- **Reset View Button**: Return to the default canvas view

## Project Structure

- `index.html` - Main application structure
- `css/styles.css` - Visual styling
- `js/app.js` - Core application logic
- `js/machine.js` - Machine creation and management
- `js/items.js` - Input/output item handling
- `js/links.js` - Connection system between machines
- `js/errorsAndThroughputs.js` - Calculation and validation logic

## License

This project is licensed under the terms included in the [LICENSE](LICENSE) file.

## Acknowledgments

- Built with vanilla JavaScript, HTML, and CSS
- Inspired by production planning tools in factory simulation games

