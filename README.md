# Firmware Flash

> A cross-platform desktop app for detecting and flashing firmware to microcontrollers over USB.

![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Creator101-commits/FirmwareFlash?include_prereleases)
![GitHub last commit](https://img.shields.io/github/last-commit/Creator101-commits/FirmwareFlash)
![GitHub issues](https://img.shields.io/github/issues-raw/Creator101-commits/FirmwareFlash)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Creator101-commits/FirmwareFlash)
![GitHub](https://img.shields.io/github/license/Creator101-commits/FirmwareFlash)

Firmware Flash is a Tauri 2 desktop application built with Rust and React/TypeScript. It scans connected USB devices, identifies common development boards, and provides a simple Connect flow so you can pick the board you want to work with before flashing firmware.

This release focuses on the project foundation: app scaffolding, Tailwind styling, USB enumeration via the `rusb` crate, and a Connect screen that lists detected boards as selectable cards.

## Table of Contents

- [Firmware Flash](#firmware-flash)
- [Quickstart / Demo](#quickstart--demo)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Supported Boards](#supported-boards)
- [Contributing](#contributing)
- [Release History](#release-history)
- [License](#license)
- [Meta](#meta)

## Quickstart / Demo
[(Back to top)](#table-of-contents)

1. Clone the repo and install dependencies (see [Development](#development)).
2. Plug in a supported board over USB (Arduino Uno, ESP32, or CH340-based clone).
3. Run `npm run tauri dev`.
4. The Connect screen loads automatically, scans USB devices, and shows each board as a card with VID, PID, and a **Select** button.

## Installation
[(Back to top)](#table-of-contents)

Firmware Flash is under active development. Pre-built installers will be published in GitHub Releases once the first stable build is ready.

For now, run from source using the [Development](#development) instructions below.

### System requirements

- **Node.js** 18+ and **npm**
- **Rust** stable (via [rustup](https://rustup.rs/))
- **libusb** (required by the `rusb` crate for USB access)

**macOS**

```sh
brew install libusb
```

**Linux (Debian/Ubuntu)**

```sh
sudo apt update
sudo apt install libusb-1.0-0-dev pkg-config
```

**Windows**

Install [libusb](https://libusb.info/) or use [Zadig](https://zadig.akeo.ie/) to configure USB drivers for your board when needed.

## Usage
[(Back to top)](#table-of-contents)

Launch the app in development mode:

```sh
npm run tauri dev
```

On the Connect screen:

1. Wait for the USB scan to finish.
2. Review detected devices shown as cards with board name, VID, and PID.
3. Click **Select** on the board you want to use.
4. The selected board appears in the footer and is stored in React state for the next steps of the flashing workflow.

Build a production desktop bundle:

```sh
npm run tauri build
```

Installers and binaries are written to `src-tauri/target/release/bundle/`.

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
| --- | --- |
| `src/` | React/TypeScript frontend (Connect screen, Tailwind UI) |
| `src/types/usb.ts` | Shared USB device types and formatting helpers |
| `src-tauri/src/lib.rs` | Tauri commands, including `list_usb_devices()` |
| `src-tauri/src/main.rs` | Rust entry point |
| `src-tauri/Cargo.toml` | Rust dependencies (`tauri`, `rusb`, `serde`) |

### Frontend scripts

```sh
npm run dev        # Vite dev server only
npm run build      # Type-check and build frontend
npm run tauri dev  # Full desktop app in dev mode
npm run tauri build
```

### Rust command: `list_usb_devices`

The backend enumerates all connected USB devices and returns:

- **vid** — vendor ID
- **pid** — product ID
- **manufacturer** — USB manufacturer string (when readable)
- **board_name** — friendly name for known VID/PID pairs

Known mappings:

| VID | PID | Board |
| --- | --- | --- |
| `0x2341` | `0x0043` | Arduino Uno |
| `0x10C4` | `0xEA60` | ESP32 |
| `0x1A86` | `0x7523` | CH340 (common ESP32 clone) |

## Supported Boards
[(Back to top)](#table-of-contents)

Board detection is VID/PID based. Recognized boards show a **Recognized** badge on the Connect screen. Unrecognized USB devices still appear so you can inspect VID/PID values.

## Contributing
[(Back to top)](#table-of-contents)

Contributions are welcome. To propose a change:

1. Fork it (<https://github.com/Creator101-commits/FirmwareFlash/fork>)
2. Create your feature branch (`git checkout -b feature/my-change`)
3. Commit your changes (`git commit -am 'Add my change'`)
4. Push to the branch (`git push origin feature/my-change`)
5. Open a new Pull Request

Please keep changes focused and ensure the app builds with `npm run tauri build` before opening a PR.

## Release History
[(Back to top)](#table-of-contents)

* **0.1.0**
    * Initial Tauri 2 + React/TypeScript scaffold
    * Tailwind CSS styling
    * USB device enumeration via `list_usb_devices`
    * Connect screen with selectable board cards

## License
[(Back to top)](#table-of-contents)

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

## Meta
[(Back to top)](#table-of-contents)

Creator101-commits – [https://github.com/Creator101-commits](https://github.com/Creator101-commits)

Project link: [https://github.com/Creator101-commits/FirmwareFlash](https://github.com/Creator101-commits/FirmwareFlash)
