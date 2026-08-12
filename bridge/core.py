"""
Logica compartilhada entre o bridge.py (CLI, para desenvolvedores) e o
bridge_gui.py (janela grafica, empacotada em .exe pro cliente final).

Le telemetria de uma impressora Bambu Lab conectada (via bambulabs_api) e
envia pro endpoint /api/v1/printers/telemetry do MakerFlow.
"""

import requests

DEFAULT_MAKERFLOW_URL = "https://maker-flow.netlify.app"
DEFAULT_POLL_INTERVAL = 12

# GcodeState (bambulabs_api) -> status aceito pelo MakerFlow
GCODE_STATE_MAP = {
    "RUNNING": "printing",
    "PREPARE": "printing",
    "PAUSE": "paused",
    "FINISH": "idle",
    "IDLE": "idle",
    "FAILED": "error",
    "UNKNOWN": "idle",
}


def map_status(gcode_state, error_code):
    if error_code:
        return "error"
    key = str(gcode_state).split(".")[-1].upper()
    return GCODE_STATE_MAP.get(key, "idle")


def read_telemetry(printer):
    gcode_state = printer.get_state()
    try:
        error_code = printer.print_error_code()
    except Exception:
        error_code = 0

    payload = {"status": map_status(gcode_state, error_code)}

    try:
        file_name = printer.get_file_name()
        if file_name:
            payload["file_name"] = file_name
    except Exception:
        pass

    try:
        percentage = printer.get_percentage()
        if isinstance(percentage, (int, float)):
            payload["progress_percent"] = max(0, min(100, int(percentage)))
    except Exception:
        pass

    try:
        remaining_seconds = printer.get_time()
        if isinstance(remaining_seconds, (int, float)):
            payload["eta_minutes"] = max(0, round(remaining_seconds / 60))
    except Exception:
        pass

    try:
        nozzle_temp = printer.get_nozzle_temperature()
        if isinstance(nozzle_temp, (int, float)):
            payload["nozzle_temp_c"] = round(nozzle_temp, 1)
    except Exception:
        pass

    try:
        bed_temp = printer.get_bed_temperature()
        if isinstance(bed_temp, (int, float)):
            payload["bed_temp_c"] = round(bed_temp, 1)
    except Exception:
        pass

    return payload


def send_telemetry(makerflow_url, api_key, payload):
    url = f"{makerflow_url.rstrip('/')}/api/v1/printers/telemetry"
    return requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=10,
    )
