# Firmware Flash

> A cross-platform desktop app for detecting microcontrollers over USB, composing firmware visually from modules, compiling with arduino-cli, and flashing over serial via STK500v1.

![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Creator101-commits/FirmwareFlash?include_prereleases)
![GitHub last commit](https://img.shields.io/github/last-commit/Creator101-commits/FirmwareFlash)
![GitHub issues](https://img.shields.io/github/issues-raw/Creator101-commits/FirmwareFlash)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Creator101-commits/FirmwareFlash)
![GitHub](https://img.shields.io/github/license/Creator101-commits/FirmwareFlash)

Firmware Flash is a Tauri 2 desktop app built with Rust and React/TypeScript. It scans connected USB devices, lets you select your board, provides a drag-and-drop module composer that generates Arduino `.ino` code live, compiles with `arduino-cli` (streaming real output to the UI), and flashes the compiled binary to the board over serial using the STK500v1 protocol. Every flash is automatically verified by reading pages back and comparing them byte-for-byte. Every module ships with configurable parameters, a visual wiring diagram, and a printable PDF wiring guide.

## Table of Contents

- [Firmware Flash](#firmware-flash)
- [Quickstart / Demo](#quickstart--demo)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Module System](#module-system)
- [Supported Boards](#supported-boards)
- [Contributing](#contributing)
- [Release History](#release-history)
- [License](#license)
- [Meta](#meta)

## Quickstart / Demo
[(Back to top)](#table-of-contents)

1. Clone and install dependencies (see [Development](#development))
2. Install `arduino-cli` (see [Installation](#installation))
3. Plug in a supported board over USB
4. Run `npm run tauri dev`
5. Select your board on the Connect screen (or tap a **Recently used** chip)
6. Drag modules from the left panel into the Composer; edit their parameters inline
7. Watch the `.ino` preview update live with your parameter values substituted in
8. Expand **Wiring Diagram** to see the SVG wiring guide; click **Print Wiring Guide** for a PDF
9. Click **Compile** — real `arduino-cli` output scrolls in the log panel; a plain-English tip appears on failure
10. Click **Flash** — select the serial port, watch the write progress bar, then the verification bar; a green banner confirms all pages match
11. Click **🕐 History** to see past flash attempts; click "Restore" on any entry to reload its composition

## Installation
[(Back to top)](#table-of-contents)

Pre-built installers will be published in GitHub Releases once the first stable build ships. For now, build from source.

### System requirements

- **Node.js** 18+ and **npm**
- **Rust** stable toolchain via [rustup](https://rustup.rs/)
- **libusb** for USB enumeration
- **arduino-cli** for compilation
- A USB-to-serial adapter or direct USB board (e.g. Arduino Uno) for flashing

**macOS**

```sh
brew install libusb arduino-cli
```

**Linux (Debian/Ubuntu)**

```sh
sudo apt update && sudo apt install libusb-1.0-0-dev pkg-config
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
```

**Windows** — Install [libusb](https://libusb.info/) and download `arduino-cli` from the [official releases](https://github.com/arduino/arduino-cli/releases).

## Usage
[(Back to top)](#table-of-contents)

```sh
npm run tauri dev
```

**Connect screen** — Lists all detected USB devices. The top of the screen shows up to 3 **recently used** board chips (persisted via `tauri-plugin-store`) for one-click re-entry. Select your board and press **Continue to Composer**.

**Composer screen** — Two-panel drag-and-drop interface with a toolbar across the top:

- **Left panel** — Available firmware modules filtered to those compatible with your board. Includes a **search box** and **category filter pills** (Sensors, Actuators, Connectivity, Display).
- **Right panel** — Drop zone where modules stack vertically. Drag to reorder. Click ✕ to remove. Each module exposes a **parameter form** — fill in pin numbers, intervals, SSIDs, etc. and the `.ino` preview updates instantly.
- **Toolbar** — Undo (⌘Z) / Redo (⌘⇧Z) buttons track structural changes (add/remove/reorder). **Save Recipe** serialises the composer state to a `.json` download. **Load Recipe** restores it from a file picker. **Export Project** zips the generated `.ino` plus `libraries.txt` into a ready-to-open Arduino project archive.
- **Generated .ino** — Read-only preview with `{{param}}` placeholders substituted.
- **Wiring Diagram** — Collapsible SVG showing every board-pin → component connection for all modules currently in the composer, colour-coded by component. Parts list shown below. **Print Wiring Guide** exports a formatted PDF of all connections and parts.
- **Compile button** — Writes the sketch to `/tmp/firmware_flash_build/sketch/sketch.ino`, runs `arduino-cli compile`, streams every line into a scrolling log panel. A ✓ or ✕ badge appears on completion.
- **Flash panel** (appears after a successful compile) — Select the serial port, click **Flash**. The app resets the board via DTR, syncs with the optiboot bootloader using STK500v1, and writes each 128-byte page (write progress bar). After writing, every page is read back using `STK_READ_PAGE` and compared byte-for-byte (verification progress bar, purple). A green banner with page count confirms success; a red banner lists any mismatched pages with a **Retry Flash** button. All flash attempts are automatically saved to the **Flash History** sidebar (🕐 header button) — click any entry to restore its exact composition.
- **Error troubleshooter** — Any error from compilation or flash is matched against 20+ known patterns and a plain-English fix suggestion is shown above the technical detail. Errors that have no matching pattern show a collapsible "Technical details" block.
- **Pin conflict detection** — On every composer change, module wiring diagrams are scanned for shared board pins. Conflicting modules get a red border and ⚠ badge; a **ConflictBanner** at the top of the composer lists each conflict and suggests adjusting pin parameters.
- **Memory usage bars** — Below the Composer, two live progress bars estimate incremental flash and SRAM usage. Bars turn yellow at 75% and red at 90%, with a warning message.

Build a production bundle:

```sh
npm run tauri build
```

## Development
[(Back to top)](#table-of-contents)

```sh
git clone https://github.com/Creator101-commits/FirmwareFlash.git
cd FirmwareFlash
npm install
npm run tauri dev
```

### Project layout

| Path | Purpose |
|---|---|
| `src/App.tsx` | Root component — Connect and Composer screens, undo/redo, save/load, export |
| `src/codegen.ts` | `generateIno()` — modules + param values → `.ino` string |
| `src/hooks/useHistory.ts` | Generic undo/redo stack hook (`push` / `set` / `undo` / `redo`) |
| `src/utils/recentBoards.ts` | `tauri-plugin-store` helpers for persisting recent board selections |
| `src/components/ModuleLibrary.tsx` | Left panel with search box and category filter pills |
| `src/components/Composer.tsx` | Drop zone; renders sortable ComposedModuleItems |
| `src/components/ComposedModuleItem.tsx` | Per-module card with param form inputs |
| `src/components/InoPreview.tsx` | Read-only `.ino` code preview |
| `src/components/WiringDiagram.tsx` | SVG renderer — board pins → component connections |
| `src/components/WiringPanel.tsx` | Collapsible wiring panel + Print Wiring Guide button |
| `src/components/CompilePanel.tsx` | Compile button, log panel, status badge, troubleshooter tip |
| `src/components/FlashPanel.tsx` | Serial port picker, Flash button, write/verify progress bars, result banner |
| `src/components/ErrorDisplay.tsx` | Plain-English fix + collapsible raw error |
| `src/components/MemoryBars.tsx` | Live flash + SRAM usage progress bars |
| `src/components/ConflictBanner.tsx` | Pin conflict warning banner |
| `src/components/FlashHistory.tsx` | Flash history sidebar with restore button |
| `src/errors/troubleshooter.ts` | 20+ error pattern → plain-English fix rules |
| `src/conflicts/detector.ts` | Pin conflict detection across composed modules |
| `src/memory/estimator.ts` | Memory usage estimator with board profiles |
| `src/utils/flashHistory.ts` | `tauri-plugin-store` helpers for persisting flash history |
| `src/modules/` | JSON definitions for all 10 firmware modules |
| `src/types/module.ts` | `FirmwareModule`, `ComposedModule`, `ModuleParam`, `WiringConnection` |
| `src/types/usb.ts` | USB device types and helpers |
| `src/types/fqbn.ts` | Board name → arduino-cli FQBN mapping |
| `src-tauri/src/lib.rs` | Rust commands: `list_usb_devices`, `compile_sketch`, `list_serial_ports`, `flash_firmware` |
| `src-tauri/src/stk500.rs` | STK500v1 protocol implementation and Intel HEX parser |

### Frontend scripts

```sh
npm run dev          # Vite dev server (UI only, no USB)
npm run build        # Type-check + production build
npm run tauri dev    # Full desktop app
npm run tauri build  # Distribute-ready bundle
```

### Rust commands

**`list_usb_devices`** — Enumerates all connected USB devices via `rusb` and returns each device's VID, PID, manufacturer string, and resolved board name.

**`compile_sketch(ino_content, board_fqbn)`** — Writes the sketch to `/tmp/firmware_flash_build/sketch/sketch.ino`, spawns `arduino-cli compile --fqbn <fqbn> --output-dir <output>`, and streams every line of stdout and stderr to the frontend as `compile-log` Tauri events. Returns the path to the compiled artifact (`.hex` for AVR, `.bin` for ESP32) on success.

**`list_serial_ports()`** — Returns a list of all available serial port names via the `serialport` crate.

**`flash_firmware(port_name, hex_path)`** — Parses the Intel HEX file, opens the serial port at 115200 baud, resets the board via DTR toggle, syncs with the bootloader, and writes each 128-byte page using STK500v1. Emits `flash-progress` events (`{ page, total, percent }`) after each write. Then reads every page back using `STK_READ_PAGE` and emits `verify-progress` events. Returns `{ verified: bool, mismatch_pages: Vec<u32> }` — the frontend uses this to display the verification result banner.

Board name → FQBN mappings (`src/types/fqbn.ts`):

| Board | FQBN |
| --- | --- |
| Arduino Uno | `arduino:avr:uno` |
| ESP32 | `esp32:esp32:esp32` |
| CH340 (common ESP32 clone) | `esp32:esp32:esp32` |

### STK500v1 protocol (`src-tauri/src/stk500.rs`)

| Constant | Value | Purpose |
| --- | --- | --- |
| `STK_OK` | `0x10` | Acknowledge |
| `STK_INSYNC` | `0x14` | In-sync marker |
| `CRC_EOP` | `0x20` | End of packet |
| `STK_GET_SYNC` | `0x30` | Sync request |
| `STK_ENTER_PROGMODE` | `0x50` | Enter programming mode |
| `STK_LEAVE_PROGMODE` | `0x51` | Leave programming mode |
| `STK_LOAD_ADDRESS` | `0x55` | Set word address |
| `STK_PROG_PAGE` | `0x64` | Write flash page |
| `STK_READ_PAGE` | `0x74` | Read flash page |

## Module System
[(Back to top)](#table-of-contents)

Each module is a JSON file in `src/modules/` with the following schema (all fields used at runtime):

```jsonc
{
  "id": "blink",
  "name": "Blink LED",
  "description": "Blink an LED at a configurable interval.",
  "category": "Actuators",
  "compatibleBoards": ["Arduino Uno", "ESP32", "CH340 (common ESP32 clone)"],
  "requiredLibraries": [],
  "params": [
    { "key": "pin",      "label": "LED Pin",       "type": "number", "default": "13" },
    { "key": "interval", "label": "Interval (ms)", "type": "number", "default": "500" }
  ],
  "wiringDiagram": [
    { "component": "LED",          "boardPin": "D13", "componentPin": "Anode (+)" },
    { "component": "LED",          "boardPin": "GND", "componentPin": "Cathode (−)" },
    { "component": "220Ω Resistor","boardPin": "D13", "componentPin": "In series with LED" }
  ],
  "flashBytes": 924,
  "ramBytes": 9,
  "setupCode": "  pinMode({{pin}}, OUTPUT);",
  "loopCode":  "  digitalWrite({{pin}}, HIGH);\n  delay({{interval}});\n  ..."
}
```

`{{paramKey}}` placeholders in `setupCode` / `loopCode` are substituted with the user's values before the `.ino` is generated or compiled. `flashBytes` / `ramBytes` are incremental estimates used by the memory bars; `wiringDiagram` drives the SVG diagram and PDF wiring guide.

### Built-in modules (10 total)

| Module | Category | Compatible boards | Libraries needed |
|---|---|---|---|
| Blink LED | Actuators | All | — |
| Servo Control | Actuators | All | Servo |
| Relay Trigger | Actuators | All | — |
| RGB LED Fade | Actuators | All | — |
| WiFi Scanner | Connectivity | ESP32, CH340 | WiFi |
| MQTT Publisher | Connectivity | ESP32, CH340 | WiFi, PubSubClient |
| OLED Display | Display | All | Adafruit_GFX, Adafruit_SSD1306 |
| Temperature Logger | Sensors | All | DHT, Adafruit_Sensor |
| Ultrasonic Distance | Sensors | All | — |
| Button (Debounced) | Sensors | All | — |

To add a new module, drop a JSON file into `src/modules/` and import it in `App.tsx`.

## Supported Boards
[(Back to top)](#table-of-contents)

Board detection is VID/PID based. The composer only shows modules compatible with the selected board.

| VID | PID | Board |
|---|---|---|
| `0x2341` | `0x0043` | Arduino Uno |
| `0x10C4` | `0xEA60` | ESP32 |
| `0x1A86` | `0x7523` | CH340 (common ESP32 clone) |

## Contributing
[(Back to top)](#table-of-contents)

1. Fork it (<https://github.com/Creator101-commits/FirmwareFlash/fork>)
2. Create your feature branch (`git checkout -b feature/my-change`)
3. Commit your changes (`git commit -am 'Add my change'`)
4. Push to the branch (`git push origin feature/my-change`)
5. Open a Pull Request

Ensure `npm run build` and `cargo check` both pass before opening a PR.

## Release History
[(Back to top)](#table-of-contents)

* **0.1.0**
    * Tauri 2 + React/TypeScript + Tailwind scaffold
    * USB device enumeration via `rusb`
    * Connect screen with board selection
* **0.2.0**
    * Visual module composer with drag-and-drop (`@dnd-kit`)
    * Five built-in firmware modules
    * Live `.ino` code preview
* **0.3.0**
    * `src/codegen.ts` — dedicated code generator module
    * `compile_sketch` Rust command — writes sketch, runs `arduino-cli compile`
    * Real-time build log streamed via Tauri events (`compile-log`)
    * Compile button with scrolling log panel, ✓/✕ status indicator
    * Board → FQBN mapping (`src/types/fqbn.ts`)
* **0.4.0**
    * `src-tauri/src/stk500.rs` — full STK500v1 protocol implementation
    * Intel HEX parser (no external crate)
    * `list_serial_ports` and `flash_firmware` Rust commands
    * DTR-triggered bootloader reset, 3-attempt sync, page-by-page programming
    * `FlashPanel` component — port selector, Refresh button, live progress bar, ✓/✕ status
* **0.5.0**
    * Five new modules: Servo Control, Ultrasonic Distance, Relay Trigger, RGB LED Fade, Button (Debounced)
    * Module JSON schema extended with `params[]`, `wiringDiagram[]`, and `category`
    * All 10 modules have configurable parameters — `{{param}}` substitution in setup/loop code
    * SVG wiring diagram renderer (`WiringDiagram.tsx`) — colour-coded board pins → components
    * Collapsible `WiringPanel` with parts list and **Print Wiring Guide** PDF button (jsPDF)
    * `useHistory` undo/redo hook — ⌘Z / ⌘⇧Z keyboard shortcuts, Undo/Redo toolbar buttons
    * **Save Recipe** / **Load Recipe** — serialise/restore composer state as `.json`
    * **Export Project** — JSZip archive of `.ino` + `libraries.txt` + `README.txt`
    * Module search box and category filter pills in the left panel
    * **Recently used boards** persisted via `tauri-plugin-store`, shown as quick-select chips
* **0.6.0** *(current)*
    * **Flash verification** — after writing, every page is read back via `STK_READ_PAGE` and compared byte-for-byte; `flash_firmware` returns `{ verified, mismatch_pages }`; purple verification progress bar + green/red result banner
    * **Error troubleshooter** (`src/errors/troubleshooter.ts`) — 20+ regex rules map raw error strings to plain-English fix suggestions; shown prominently in `CompilePanel` and `FlashPanel` with raw error in a collapsible "Technical details" block
    * **Pin conflict detector** (`src/conflicts/detector.ts`) — scans all `wiringDiagram` entries on every composer change; conflicting module cards get red border + ⚠ badge; `ConflictBanner` above the composer lists each conflict
    * **Flash history** (`src/utils/flashHistory.ts`, `FlashHistory.tsx`) — every flash attempt is saved to `tauri-plugin-store` (last 50 entries) with timestamp, board, modules, params, and verification result; 🕐 History sidebar lists entries newest-first with a **Restore this composition** button
    * **Memory usage bars** (`src/memory/estimator.ts`, `MemoryBars.tsx`) — each module JSON gains `flashBytes` / `ramBytes`; two live progress bars below the Composer show estimated flash and SRAM usage against board limits (Uno: 32KB/2KB, ESP32: 4MB/320KB); turn yellow at 75%, red at 90%

## License
[(Back to top)](#table-of-contents)

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

## Meta
[(Back to top)](#table-of-contents)

Creator101-commits — [https://github.com/Creator101-commits](https://github.com/Creator101-commits)

Project link: [https://github.com/Creator101-commits/FirmwareFlash](https://github.com/Creator101-commits/FirmwareFlash)
