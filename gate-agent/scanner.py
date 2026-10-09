import sys
import time

class ScannerReader:
    def __init__(self, mode="stdin"):
        self.mode = mode
        print(f"[SCANNER] Initialized reader in {mode} mode")

    def read_token(self):
        """Reads scanned credential from USB barcode/RFID HID device or terminal"""
        try:
            line = input("\n[SCANNER] Tap RFID Card or Scan QR Token: ")
            return line.strip()
        except (KeyboardInterrupt, EOFError):
            return None
