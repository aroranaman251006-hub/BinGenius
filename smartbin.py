import cv2
import time
import asyncio
import threading
import json
import os
import RPi.GPIO as GPIO
from gpiozero import Servo
from gpiozero.pins.lgpio import LGPIOFactory
from ultralytics import YOLO
import websockets

# This is the "Magic Line" that ignores the Busy error
GPIO.setwarnings(False)
os.environ["LG_GPP_SILENT"] = "1"

# ================= SERVO SETUP =================
factory = LGPIOFactory()
servo = Servo(18, pin_factory=factory, min_pulse_width=0.5/1000, max_pulse_width=2.5/1000)

def set_servo(angle):
    value = (angle / 90) - 1
    servo.value = value
    time.sleep(0.5)

def detach_servo():
    servo.value = None

def open_organic():
    print(">>> 🍌 ORGANIC: Rotating RIGHT")
    set_servo(175)
    time.sleep(3)
    set_servo(90)   # return to flat position
    time.sleep(0.5)
    detach_servo()
    print(">>> Done. Ready!")

def open_inorganic():
    print(">>> 🍼 INORGANIC: Rotating LEFT")
    set_servo(5)
    time.sleep(3)
    set_servo(90)   # return to flat position
    time.sleep(0.5)
    detach_servo()
    print(">>> Done. Ready!")

# ================= MODEL SETUP =================
model = YOLO("yolov8n.pt")
print("Model ready.")

# ================= TIMEOUT SETUP =================
TIMEOUT_SECONDS = 15

ITEM_DIRECTION = {
    "banana": "right",   # organic
    "bottle": "left",    # inorganic
    "can":    "left",    # inorganic
}

pending_timeout = None
pending_item = None

def cancel_pending_timeout():
    global pending_timeout
    if pending_timeout is not None:
        pending_timeout.cancel()
        pending_timeout = None

def trigger_timeout():
    global pending_item, pending_timeout
    if pending_item:
        direction = ITEM_DIRECTION.get(pending_item, "right")
        print(f"[TIMEOUT] ⏱️ No response in {TIMEOUT_SECONDS}s — auto-rotating {direction} for {pending_item}")
        if direction == "right":
            threading.Thread(target=open_organic, daemon=True).start()
        else:
            threading.Thread(target=open_inorganic, daemon=True).start()
        pending_item = None
    pending_timeout = None

def schedule_timeout():
    global pending_timeout
    cancel_pending_timeout()
    pending_timeout = threading.Timer(TIMEOUT_SECONDS, trigger_timeout)
    pending_timeout.daemon = True
    pending_timeout.start()
    print(f"[TIMEOUT] ⏳ Timer started — {TIMEOUT_SECONDS}s to respond")

# ================= WEBSOCKET SERVER =================
connected_clients = set()
ws_loop = None

async def ws_handler(websocket):
    global pending_item
    client_ip = websocket.remote_address[0]
    print(f"\n[WS] 🟢 NEW DEVICE CONNECTED! IP: {client_ip}")
    connected_clients.add(websocket)

    try:
        async for message in websocket:
            data = json.loads(message)
            print(f"[WS] 📩 Received command from {client_ip}: {data}")

            if data.get("type") == "rotate":
                direction = data.get("direction")
                print(f"[WS] ⚙️ Executing rotation: {direction}")
                cancel_pending_timeout()   # user responded — cancel the timer
                pending_item = None
                if direction == "right":
                    threading.Thread(target=open_organic, daemon=True).start()
                else:
                    threading.Thread(target=open_inorganic, daemon=True).start()

    except Exception as e:
        print(f"[WS] ⚠️ Connection error with {client_ip}: {e}")
    finally:
        print(f"[WS] 🔴 Device Disconnected: {client_ip}")
        connected_clients.discard(websocket)

def start_server():
    global ws_loop
    ws_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(ws_loop)

    async def run_ws():
        async with websockets.serve(ws_handler, "0.0.0.0", 8765):
            print("[WS] 🟢 Server active on port 8765")
            await asyncio.Future()  # Keep running forever

    ws_loop.run_until_complete(run_ws())

ws_thread = threading.Thread(target=start_server, daemon=True)
ws_thread.start()

# ================= MOTOR CALIBRATION =================
print("Calibrating Motor Position...")
print("  Step 1: Moving to 0° (reset)...")
set_servo(0)
time.sleep(1.5)
print("  Step 2: Moving to 90° (flat position)...")
set_servo(90)
time.sleep(1)
detach_servo()
print("✅ Flat position reached. System ready! Waiting for items...")

# ================= CAMERA & DETECTION LOOP =================
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        results = model(frame, stream=True, verbose=False, imgsz=320)

        for r in results:
            for box in r.boxes:
                cls  = int(box.cls[0])
                conf = float(box.conf[0])
                name = model.names[cls]

                if conf > 0.40 and name in ITEM_DIRECTION:
                    print(f"🎯 TRIGGER: {name} detected ({conf:.2f})")

                    if connected_clients and ws_loop is not None:
                        # Send to display and start the 15s timeout
                        pending_item = name
                        schedule_timeout()
                        payload = json.dumps({"type": "detected", "item": name})
                        for client in list(connected_clients):
                            asyncio.run_coroutine_threadsafe(client.send(payload), ws_loop)
                    else:
                        # No screen connected — rotate immediately
                        print(f"[WS] No screen — auto-rotating for {name}")
                        direction = ITEM_DIRECTION.get(name, "right")
                        if direction == "right":
                            threading.Thread(target=open_organic, daemon=True).start()
                        else:
                            threading.Thread(target=open_inorganic, daemon=True).start()

                    time.sleep(5)

except KeyboardInterrupt:
    print("\nShutting down...")
finally:
    cap.release()
    detach_servo()
