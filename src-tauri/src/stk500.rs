use std::io::{Read, Write};
use std::time::Duration;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

// stk500v1 protocol constants
const STK_OK: u8 = 0x10;
const STK_INSYNC: u8 = 0x14;
const CRC_EOP: u8 = 0x20;
const STK_GET_SYNC: u8 = 0x30;
const STK_ENTER_PROGMODE: u8 = 0x50;
const STK_LEAVE_PROGMODE: u8 = 0x51;
const STK_LOAD_ADDRESS: u8 = 0x55;
const STK_PROG_PAGE: u8 = 0x64;
const STK_READ_PAGE: u8 = 0x74;

// optiboot (arduino uno) uses 128-byte pages at 115200 baud
const PAGE_SIZE: usize = 128;
const BAUD_RATE: u32 = 115200;

type Port = Box<dyn serialport::SerialPort>;

#[derive(Serialize, Clone)]
pub struct FlashProgress {
    pub page: usize,
    pub total: usize,
    pub percent: u8,
}

#[derive(Serialize, Clone)]
pub struct VerifyProgress {
    pub page: usize,
    pub total: usize,
    pub percent: u8,
}

// result of a flash + verify cycle.
#[derive(Debug, Serialize, Clone)]
pub struct FlashResult {
    pub verified: bool,
    pub mismatch_pages: Vec<u32>,
}

fn read_byte(port: &mut Port) -> Result<u8, String> {
    let mut buf = [0u8; 1];
    port.read_exact(&mut buf).map_err(|e| format!("read error: {e}"))?;
    Ok(buf[0])
}

// expects STK_INSYNC + STK_OK response bytes.
fn expect_ok(port: &mut Port) -> Result<(), String> {
    let a = read_byte(port)?;
    let b = read_byte(port)?;
    if a == STK_INSYNC && b == STK_OK {
        Ok(())
    } else {
        Err(format!(
            "unexpected response: {a:#04x} {b:#04x} (want {STK_INSYNC:#04x} {STK_OK:#04x})"
        ))
    }
}

pub fn sync(port: &mut Port) -> Result<(), String> {
    for attempt in 0..3 {
        // clear stale bytes before each attempt
        let _ = port.clear(serialport::ClearBuffer::Input);

        port.write_all(&[STK_GET_SYNC, CRC_EOP])
            .map_err(|e| format!("write error: {e}"))?;

        if expect_ok(port).is_ok() {
            return Ok(());
        }

        if attempt < 2 {
            std::thread::sleep(Duration::from_millis(100));
        }
    }
    Err("failed to sync with bootloader after 3 attempts — is the board in bootloader mode?".to_string())
}

pub fn enter_prog_mode(port: &mut Port) -> Result<(), String> {
    port.write_all(&[STK_ENTER_PROGMODE, CRC_EOP])
        .map_err(|e| format!("write error: {e}"))?;
    expect_ok(port)
}

pub fn load_address(port: &mut Port, addr: u16) -> Result<(), String> {
    // addr is a word address (byte_address / 2)
    let lo = (addr & 0xFF) as u8;
    let hi = (addr >> 8) as u8;
    port.write_all(&[STK_LOAD_ADDRESS, lo, hi, CRC_EOP])
        .map_err(|e| format!("write error: {e}"))?;
    expect_ok(port)
}

pub fn program_page(port: &mut Port, data: &[u8]) -> Result<(), String> {
    let len = data.len() as u16;
    let mut cmd = vec![
        STK_PROG_PAGE,
        (len >> 8) as u8,
        (len & 0xFF) as u8,
        b'F', // memory type: flash
    ];
    cmd.extend_from_slice(data);
    cmd.push(CRC_EOP);
    port.write_all(&cmd)
        .map_err(|e| format!("write error: {e}"))?;
    expect_ok(port)
}

// reads one flash page via STK_READ_PAGE; caller must set the address first.
fn read_page(port: &mut Port, size: usize) -> Result<Vec<u8>, String> {
    let len = size as u16;
    port.write_all(&[
        STK_READ_PAGE,
        (len >> 8) as u8,
        (len & 0xFF) as u8,
        b'F', // flash memory
        CRC_EOP,
    ])
    .map_err(|e| format!("read_page write error: {e}"))?;

    let insync = read_byte(port)?;
    if insync != STK_INSYNC {
        return Err(format!(
            "read_page: expected INSYNC {STK_INSYNC:#04x}, got {insync:#04x}"
        ));
    }

    let mut data = vec![0u8; size];
    port.read_exact(&mut data)
        .map_err(|e| format!("read_page data read error: {e}"))?;

    let ok = read_byte(port)?;
    if ok != STK_OK {
        return Err(format!(
            "read_page: expected OK {STK_OK:#04x}, got {ok:#04x}"
        ));
    }

    Ok(data)
}

fn leave_prog_mode(port: &mut Port) -> Result<(), String> {
    port.write_all(&[STK_LEAVE_PROGMODE, CRC_EOP])
        .map_err(|e| format!("write error: {e}"))?;
    expect_ok(port)
}

// minimal Intel HEX parser; output is padded to page boundaries.
fn decode_hex_str(s: &str) -> Result<Vec<u8>, String> {
    if s.len() % 2 != 0 {
        return Err(format!("odd-length hex string in record: {s}"));
    }
    (0..s.len() / 2)
        .map(|i| u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).map_err(|e| e.to_string()))
        .collect()
}

fn parse_hex(path: &str) -> Result<Vec<u8>, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("cannot read hex file: {e}"))?;

    // 32 KiB buffer (ATmega328P flash) pre-filled with 0xFF
    let mut binary = vec![0xFF_u8; 32 * 1024];
    let mut max_addr = 0usize;
    let mut base_addr: u32 = 0;

    for line in content.lines() {
        let line = line.trim();
        if !line.starts_with(':') {
            continue;
        }

        let bytes = decode_hex_str(&line[1..])
            .map_err(|e| format!("invalid hex record: {e}"))?;

        if bytes.len() < 5 {
            return Err("hex record too short".to_string());
        }

        let byte_count = bytes[0] as usize;
        let address = ((bytes[1] as u32) << 8) | (bytes[2] as u32);
        let record_type = bytes[3];

        match record_type {
            0x00 => {
                let addr = (base_addr + address) as usize;
                for (i, &b) in bytes[4..4 + byte_count].iter().enumerate() {
                    if addr + i < binary.len() {
                        binary[addr + i] = b;
                        max_addr = max_addr.max(addr + i + 1);
                    }
                }
            }
            0x01 => break, // end of file
            0x02 => {
                base_addr = ((bytes[4] as u32) << 8 | bytes[5] as u32) << 4;
            }
            0x04 => {
                base_addr = ((bytes[4] as u32) << 8 | bytes[5] as u32) << 16;
            }
            _ => {}
        }
    }

    // round up to page boundary
    let rounded = ((max_addr + PAGE_SIZE - 1) / PAGE_SIZE) * PAGE_SIZE;
    binary.truncate(rounded.max(PAGE_SIZE));
    Ok(binary)
}

// writes the hex to the board, then reads every page back for verification.
pub fn flash(app: AppHandle, port_name: String, hex_path: String) -> Result<FlashResult, String> {
    let binary = parse_hex(&hex_path)?;

    // collect all padded pages upfront for the verify pass.
    let pages: Vec<Vec<u8>> = binary
        .chunks(PAGE_SIZE)
        .map(|chunk| {
            let mut page = chunk.to_vec();
            page.resize(PAGE_SIZE, 0xFF);
            page
        })
        .collect();
    let total_pages = pages.len();

    let mut port = serialport::new(&port_name, BAUD_RATE)
        .timeout(Duration::from_millis(1000))
        .open()
        .map_err(|e| format!("cannot open {port_name}: {e}"))?;

    // toggle DTR low→high to trigger the arduino bootloader reset
    port.write_data_terminal_ready(false)
        .map_err(|e| format!("DTR error: {e}"))?;
    std::thread::sleep(Duration::from_millis(50));
    port.write_data_terminal_ready(true)
        .map_err(|e| format!("DTR error: {e}"))?;
    std::thread::sleep(Duration::from_millis(250));

    sync(&mut port)?;
    enter_prog_mode(&mut port)?;

    // write pass
    for (page_idx, page_data) in pages.iter().enumerate() {
        let word_addr = (page_idx * PAGE_SIZE / 2) as u16;
        load_address(&mut port, word_addr)?;
        program_page(&mut port, page_data)?;

        let percent = ((page_idx + 1) * 100 / total_pages) as u8;
        let _ = app.emit("flash-progress", FlashProgress {
            page: page_idx + 1,
            total: total_pages,
            percent,
        });
    }

    // verify pass — re-load each address and read it back
    let mut mismatch_pages: Vec<u32> = Vec::new();

    for (page_idx, expected) in pages.iter().enumerate() {
        let word_addr = (page_idx * PAGE_SIZE / 2) as u16;
        load_address(&mut port, word_addr)?;

        let actual = read_page(&mut port, PAGE_SIZE)?;
        if actual != *expected {
            mismatch_pages.push(page_idx as u32);
        }

        let percent = ((page_idx + 1) * 100 / total_pages) as u8;
        let _ = app.emit("verify-progress", VerifyProgress {
            page: page_idx + 1,
            total: total_pages,
            percent,
        });
    }

    leave_prog_mode(&mut port)?;

    Ok(FlashResult {
        verified: mismatch_pages.is_empty(),
        mismatch_pages,
    })
}
