mod stk500;

use std::io::BufRead;
use std::path::{Path, PathBuf};
use rusb::UsbContext;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize)]
pub struct UsbDeviceInfo {
    pub vid: u16,
    pub pid: u16,
    pub manufacturer: Option<String>,
    pub board_name: Option<String>,
}

fn board_name_for(vid: u16, pid: u16) -> Option<&'static str> {
    match (vid, pid) {
        (0x2341, 0x0043) => Some("Arduino Uno"),
        (0x10C4, 0xEA60) => Some("ESP32"),
        (0x1A86, 0x7523) => Some("CH340 (common ESP32 clone)"),
        _ => None,
    }
}

fn read_manufacturer(
    handle: &rusb::DeviceHandle<rusb::Context>,
    device: &rusb::Device<rusb::Context>,
) -> Option<String> {
    let descriptor = device.device_descriptor().ok()?;
    let timeout = std::time::Duration::from_millis(250);
    let languages = handle.read_languages(timeout).ok()?;
    let language = languages.first().copied()?;
    handle
        .read_manufacturer_string(language, &descriptor, timeout)
        .ok()
}

#[tauri::command]
fn list_usb_devices() -> Result<Vec<UsbDeviceInfo>, String> {
    let context =
        rusb::Context::new().map_err(|e| format!("Failed to initialize USB: {e}"))?;
    let devices = context
        .devices()
        .map_err(|e| format!("Failed to enumerate USB devices: {e}"))?;

    let mut results = Vec::new();
    for device in devices.iter() {
        let descriptor = match device.device_descriptor() {
            Ok(d) => d,
            Err(_) => continue,
        };
        let vid = descriptor.vendor_id();
        let pid = descriptor.product_id();
        let manufacturer = device
            .open()
            .ok()
            .and_then(|handle| read_manufacturer(&handle, &device));

        results.push(UsbDeviceInfo {
            vid,
            pid,
            manufacturer,
            board_name: board_name_for(vid, pid).map(str::to_string),
        });
    }
    Ok(results)
}

// checks homebrew paths before falling back to PATH.
fn find_arduino_cli() -> PathBuf {
    for candidate in &[
        "/opt/homebrew/bin/arduino-cli",
        "/usr/local/bin/arduino-cli",
        "/usr/bin/arduino-cli",
    ] {
        if Path::new(candidate).exists() {
            return PathBuf::from(candidate);
        }
    }
    PathBuf::from("arduino-cli")
}

fn find_artifact(output_dir: &Path) -> Option<String> {
    for ext in &["hex", "bin", "elf"] {
        let path = output_dir.join(format!("sketch.ino.{ext}"));
        if path.exists() {
            return Some(path.to_string_lossy().into_owned());
        }
    }
    None
}

#[tauri::command]
fn compile_sketch(
    app: AppHandle,
    ino_content: String,
    board_fqbn: String,
) -> Result<String, String> {
    let build_dir = PathBuf::from("/tmp/firmware_flash_build");
    let sketch_dir = build_dir.join("sketch");
    let output_dir = build_dir.join("output");

    std::fs::create_dir_all(&sketch_dir)
        .map_err(|e| format!("Could not create sketch directory: {e}"))?;
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Could not create output directory: {e}"))?;
    std::fs::write(sketch_dir.join("sketch.ino"), &ino_content)
        .map_err(|e| format!("Could not write sketch.ino: {e}"))?;

    let cli = find_arduino_cli();

    let mut child = std::process::Command::new(&cli)
        .args([
            "compile",
            "--fqbn",
            &board_fqbn,
            "--output-dir",
            output_dir.to_str().unwrap_or("/tmp/firmware_flash_build/output"),
            sketch_dir.to_str().unwrap_or("/tmp/firmware_flash_build/sketch"),
        ])
        // tauri doesn't inherit shell PATH; include homebrew paths for avr-gcc, esptool, etc.
        .env(
            "PATH",
            "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        )
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start arduino-cli ({}): {e}", cli.display()))?;

    let stdout = child.stdout.take().expect("stdout was not captured");
    let stderr = child.stderr.take().expect("stderr was not captured");

    // drain pipes concurrently to prevent buffer stalls.
    let app_out = app.clone();
    let stdout_thread = std::thread::spawn(move || {
        for line in std::io::BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = app_out.emit("compile-log", &line);
        }
    });

    let app_err = app.clone();
    let stderr_thread = std::thread::spawn(move || {
        for line in std::io::BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = app_err.emit("compile-log", &line);
        }
    });

    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait for arduino-cli: {e}"))?;

    stdout_thread.join().ok();
    stderr_thread.join().ok();

    if !status.success() {
        return Err(format!(
            "arduino-cli exited with code {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(find_artifact(&output_dir)
        .unwrap_or_else(|| output_dir.to_string_lossy().into_owned()))
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<String>, String> {
    Ok(
        serialport::available_ports()
            .map_err(|e| format!("cannot list serial ports: {e}"))?
            .into_iter()
            .map(|p| p.port_name)
            .collect(),
    )
}

#[tauri::command]
fn flash_firmware(
    app: AppHandle,
    port_name: String,
    hex_path: String,
) -> Result<stk500::FlashResult, String> {
    stk500::flash(app, port_name, hex_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            list_usb_devices,
            compile_sketch,
            list_serial_ports,
            flash_firmware,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
