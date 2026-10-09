import time
import os

try:
    import RPi.GPIO as GPIO
    HAS_GPIO = True
except ImportError:
    HAS_GPIO = False


class BarrierController:
    def __init__(self, relay_pin=18, pulse_seconds=0.8):
        self.relay_pin = int(os.getenv("RELAY_GPIO_PIN", relay_pin))
        self.pulse_seconds = float(os.getenv("RELAY_PULSE_SECONDS", pulse_seconds))
        self.mock_mode = not HAS_GPIO or os.getenv("MOCK_RELAY", "false").lower() == "true"

        if not self.mock_mode:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.relay_pin, GPIO.OUT)
            GPIO.output(self.relay_pin, GPIO.LOW)
            print(f"[BARRIER] Initialized hardware GPIO pin {self.relay_pin}")
        else:
            print("[BARRIER] Running in MOCK relay mode (No physical GPIO barrier connected)")

    def open_gate(self, reason="Authorized Scan"):
        print(f"[BARRIER] >>> TRIGGER OPEN: {reason}")
        if not self.mock_mode:
            try:
                GPIO.output(self.relay_pin, GPIO.HIGH)
                time.sleep(self.pulse_seconds)
                GPIO.output(self.relay_pin, GPIO.LOW)
            except Exception as e:
                print(f"[BARRIER_ERROR] Failed to pulse GPIO pin: {e}")
        else:
            time.sleep(self.pulse_seconds)
            print(f"[BARRIER] Mock barrier relay pulsed for {self.pulse_seconds}s (Gate Opened)")

    def cleanup(self):
        if not self.mock_mode:
            GPIO.cleanup()
