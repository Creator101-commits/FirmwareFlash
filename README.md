# Firmware Flash

> A cross-platform desktop app for detecting microcontrollers over USB and composing firmware visually.

![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Creator101-commits/FirmwareFlash?include_prereleases)
![GitHub last commit](https://img.shields.io/github/last-commit/Creator101-commits/FirmwareFlash)
![GitHub issues](https://img.shields.io/github/issues-raw/Creator101-commits/FirmwareFlash)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Creator101-commits/FirmwareFlash)
![GitHub](https://img.shields.io/github/license/Creator101-commits/FirmwareFlash)

Firmware Flash is a Tauri 2 desktop app built with Rust and React/TypeScript. It scans connected USB devices, lets you select your board, provides a drag-and-drop module composer that generates Arduino `.ino` code live, and compiles it with `arduino-cli`, streaming real build output directly to the UI.

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
5. Select your board on the Connect screen
6. Drag modules from the left panel into the Composer
7. Watch the `.ino` preview update live
8. Click **Compile** — see real `arduino-cli` output scroll in the log panel; a ✓ or ✕ appears when done

## Installation
[(Back to top)](#table-of-contents)

Pre-built installers will be published in GitHub Releases once the first stable build ships. For now, build from source.

### System requirements

- **Node.js** 18+ and **npm**
- **Rust** stable toolchain via [rustup](https://rustup.rs/)
- **libusb** for USB enumeration
- **arduino-cli** for compilation

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

**Connect screen** — Lists all detected USB devices. Select your board and press **Continue to Composer**.

**Composer screen** — Two-panel drag-and-drop interface:

- **Left panel** — Available firmware modules filtered to those compatible with your board.
- **Right panel** — Drop zone where modules stack vertically. Drag to reorder. Click ✕ to remove.
- **Generated .ino** — Read-only preview that regenerates live whenever the composition changes.
- **Compile button** — Writes the sketch to `/tmp/firmware_flash_build/sketch/sketch.ino`, runs `arduino-cli compile`, and streams every line of output into a scrolling log panel. A ✓ or ✕ badge appears on completion along with the path to the built artifact.

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
| `src/` | React/TypeScript frontend |
| `src/App.tsx` | Root component — Connect and Composer screens |
| `src/codegen.ts` | Pure `generateIno()` function — modules → `.ino` string |
| `src/components/` | ModuleLibrary, Composer, ModuleCard, InoPreview, CompilePanel |
| `src/modules/` | JSON definitions for each firmware module |
| `src/types/usb.ts` | USB device types and helpers |
| `src/types/module.ts` | FirmwareModule and ComposedModule types |
| `src/types/fqbn.ts` | Board name → arduino-cli FQBN mapping |
| `src-tauri/src/lib.rs` | Rust commands: `list_usb_devices`, `compile_sketch` |
| `src-tauri/src/main.rs` | Rust entry point |

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

Board name → FQBN mappings (`src/types/fqbn.ts`):

| Board | FQBN |
| --- | --- |
| Arduino Uno | `arduino:avr:uno` |
| ESP32 | `esp32:esp32:esp32` |
| CH340 (common ESP32 clone) | `esp32:esp32:esp32` |

## Module System
[(Back to top)](#table-of-contents)

Each module is a JSON file in `src/modules/` with the following schema:

```jsonc
{
  "id": "blink",
  "name": "Blink LED",
  "description": "Blink the built-in LED on pin 13 at 1 Hz.",
  "compatibleBoards": ["Arduino Uno", "ESP32"],
  "requiredLibraries": [],
  "setupCode": "  pinMode(13, OUTPUT);",
  "loopCode": "  digitalWrite(13, HIGH);\n  delay(500);\n  ..."
}
```

### Built-in modules

| Module | Compatible boards | Libraries needed |
|---|---|---|
| Blink LED | All | — |
| WiFi Scanner | ESP32, CH340 | WiFi |
| OLED Display | All | Adafruit_GFX, Adafruit_SSD1306 |
| Temperature Logger | All | DHT, Adafruit_Sensor |
| MQTT Publisher | ESP32, CH340 | WiFi, PubSubClient |

To add a new module, drop a new JSON file into `src/modules/` and import it in `App.tsx`.

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
* **0.3.0** *(current)*
    * `src/codegen.ts` — dedicated code generator module
    * `compile_sketch` Rust command — writes sketch, runs `arduino-cli compile`
    * Real-time build log streamed via Tauri events (`compile-log`)
    * Compile button with scrolling log panel, ✓/✕ status indicator
    * Board → FQBN mapping (`src/types/fqbn.ts`)

## License
[(Back to top)](#table-of-contents)

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

## Meta
[(Back to top)](#table-of-contents)

Creator101-commits — [https://github.com/Creator101-commits](https://github.com/Creator101-commits)

Project link: [https://github.com/Creator101-commits/FirmwareFlash](https://github.com/Creator101-commits/FirmwareFlash)
