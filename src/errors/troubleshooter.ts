interface ErrorRule {
  pattern: RegExp;
  fix: string;
}

// most specific first.
const RULES: ErrorRule[] = [
  {
    pattern: /stk500_recv|stk500_getsync|stk500 getsync/i,
    fix: "Board not responding. Press the reset button right before clicking Flash, or try unplugging and replugging the USB cable.",
  },
  {
    pattern: /programmer is not responding/i,
    fix: "Board may not be in bootloader mode. Hold the reset button, click Flash, then release reset when the IDE says 'Uploading'.",
  },
  {
    pattern: /ser_open|cannot open|failed to open serial/i,
    fix: "Serial port not found. Make sure no other app (Arduino IDE, serial monitor) is using this port. Try selecting a different port.",
  },
  {
    pattern: /permission denied/i,
    fix: "Port permission denied. On Linux/macOS run: sudo chmod 666 /dev/ttyUSB0 (replace with your port path), then retry.",
  },
  {
    pattern: /device or resource busy/i,
    fix: "Port is already in use by another application. Close Arduino IDE, any serial monitor, or other terminal sessions accessing the port.",
  },
  {
    pattern: /failed to sync with bootloader/i,
    fix: "Bootloader sync failed after 3 attempts. Press the reset button on the board immediately before clicking Flash.",
  },
  {
    pattern: /wrong baud rate|baud.*mismatch/i,
    fix: "Baud rate mismatch. This app targets optiboot at 115200 baud. Make sure you have selected the correct board.",
  },
  {
    pattern: /unsupported device|not supported/i,
    fix: "This board or bootloader is not supported. Firmware Flash currently targets Arduino Uno (optiboot) for serial flashing.",
  },
  {
    pattern: /hex file|intel hex|cannot read hex/i,
    fix: "The compiled .hex file could not be read. Try recompiling the sketch — the previous build may be stale or corrupt.",
  },
  {
    pattern: /no such file or directory/i,
    fix: "A required file or path was not found. Recompile the sketch to regenerate the .hex file, then flash again.",
  },
  {
    pattern: /timeout/i,
    fix: "Serial communication timed out. The board stopped responding mid-flash. Try a shorter USB cable or a different USB port.",
  },
  {
    pattern: /connection refused/i,
    fix: "Connection to the serial port was refused. Unplug and replug the board, then retry.",
  },
  {
    pattern: /mismatch_pages|verify.*fail|verification failed/i,
    fix: "Flash verification failed — some pages read back differently than what was written. Try flashing again; if it persists, check for a loose USB connection.",
  },
  {
    pattern: /arduino-cli.*not found|arduino.cli.*command not found/i,
    fix: "arduino-cli was not found. Install it with: brew install arduino-cli (macOS) or see https://arduino.github.io/arduino-cli for other platforms.",
  },
  {
    pattern: /library.*not found|no such library/i,
    fix: "A required Arduino library is not installed. Open Arduino IDE → Sketch → Include Library → Manage Libraries and install the missing library.",
  },
  {
    pattern: /was not declared in this scope/i,
    fix: "Compilation error: a variable or function is not declared. Make sure all required libraries are installed in Arduino IDE before compiling.",
  },
  {
    pattern: /multiple definition/i,
    fix: "Two or more modules define the same symbol. Check for duplicate library includes or conflicting variable names across modules.",
  },
  {
    pattern: /avr-g\+\+.*not found|avrdude.*not found/i,
    fix: "AVR toolchain not found. In Arduino IDE, install the 'Arduino AVR Boards' package via Tools → Board → Board Manager.",
  },
  {
    pattern: /arduino-cli exited with code/i,
    fix: "Compilation failed. Review the log above for the specific error message — look for lines starting with 'error:'.",
  },
  {
    pattern: /dtr error|data terminal ready/i,
    fix: "Failed to reset the board via DTR. Some boards require a manual reset. Press the reset button right before clicking Flash.",
  },
];

// returns a plain-English fix suggestion, or null if no rule matches.
export function troubleshoot(error: string): string | null {
  for (const rule of RULES) {
    if (rule.pattern.test(error)) {
      return rule.fix;
    }
  }
  return null;
}

// scans log lines and returns the first matching fix.
export function troubleshootAll(lines: string[]): string | null {
  return troubleshoot(lines.join("\n"));
}
