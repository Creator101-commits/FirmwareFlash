use rusb::UsbContext;
use serde::Serialize;

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

fn read_manufacturer(handle: &rusb::DeviceHandle<rusb::Context>, device: &rusb::Device<rusb::Context>) -> Option<String> {
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
    let context = rusb::Context::new().map_err(|err| format!("Failed to initialize USB: {err}"))?;
    let devices = context
        .devices()
        .map_err(|err| format!("Failed to enumerate USB devices: {err}"))?;

    let mut results = Vec::new();

    for device in devices.iter() {
        let descriptor = match device.device_descriptor() {
            Ok(descriptor) => descriptor,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![list_usb_devices])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
