"""
Logica compartilhada entre o bridge.py (CLI, para desenvolvedores) e o
bridge_gui.py (janela grafica, empacotada em .exe pro cliente final).

Le telemetria de uma impressora Bambu Lab conectada (via bambulabs_api) e
envia pro endpoint /api/v1/printers/telemetry do MakerFlow. Tambem sabe
capturar um snapshot da camera (quando a impressora tem) e mandar pro
endpoint /api/v1/printers/snapshot.
"""

import socket
import ssl
import struct
import time

import requests

DEFAULT_MAKERFLOW_URL = "https://maker-flow.netlify.app"
DEFAULT_POLL_INTERVAL = 12
DEFAULT_SNAPSHOT_INTERVAL = 4

# Portas de camera conhecidas da Bambu Lab:
# - A1 / A1 Mini / P1P / P1S: protocolo proprietario "chamber image" (nao e RTSP,
#   apesar de muita documentacao por ai dizer o contrario) na porta 6000.
# - X1 / X1C: RTSP de verdade (via TLS) na porta 322.
CHAMBER_IMAGE_PORT = 6000
RTSP_PORT = 322

_CHAMBER_JPEG_START = bytes([0xFF, 0xD8, 0xFF, 0xE0])
_CHAMBER_JPEG_END = bytes([0xFF, 0xD9])

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


def _build_chamber_auth_packet(access_code):
    """
    Formato descoberto/documentado pela comunidade (usado pelo Home Assistant
    ha-bambulab, entre outros): 16 bytes de header (0x40, 0x3000, 0, 0) +
    usuario "bblp" (32 bytes, preenchido com zeros) + codigo de acesso
    (32 bytes, preenchido com zeros).
    """
    packet = bytearray()
    packet += struct.pack("<I", 0x40)
    packet += struct.pack("<I", 0x3000)
    packet += struct.pack("<I", 0)
    packet += struct.pack("<I", 0)
    packet += b"bblp".ljust(32, b"\x00")
    packet += access_code.encode("ascii").ljust(32, b"\x00")
    return bytes(packet)


def _recv_exact(sock, n, deadline):
    buf = bytearray()
    while len(buf) < n:
        if time.monotonic() > deadline:
            raise TimeoutError("Timeout esperando dados da camera.")
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise RuntimeError("Conexao fechada pela impressora (codigo de acesso errado?).")
        buf += chunk
    return bytes(buf)


def capture_snapshot_chamber(ip, access_code, timeout=8.0):
    """Captura um frame via o protocolo 'chamber image' (A1 / A1 Mini / P1P / P1S, porta 6000)."""
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    with socket.create_connection((ip, CHAMBER_IMAGE_PORT), timeout=timeout) as sock:
        with ctx.wrap_socket(sock, server_hostname=ip) as ssock:
            ssock.settimeout(timeout)
            ssock.sendall(_build_chamber_auth_packet(access_code))

            deadline = time.monotonic() + timeout
            header = _recv_exact(ssock, 16, deadline)
            payload_size = int.from_bytes(header[0:4], byteorder="little")
            if payload_size <= 0 or payload_size > 10_000_000:
                raise RuntimeError(f"Tamanho de imagem inesperado: {payload_size}")

            img = _recv_exact(ssock, payload_size, deadline)

    if img[:4] != _CHAMBER_JPEG_START or img[-2:] != _CHAMBER_JPEG_END:
        raise RuntimeError("Frame JPEG invalido (marcadores ausentes).")

    return bytes(img)


def capture_snapshot_rtsp(ip, access_code, timeout=8.0):
    """Captura um frame via RTSPS de verdade (X1 / X1C, porta 322) usando ffmpeg."""
    import subprocess

    import imageio_ffmpeg

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    url = f"rtsps://bblp:{access_code}@{ip}:{RTSP_PORT}/streaming/live/1"
    cmd = [
        ffmpeg_exe,
        "-y",
        "-rtsp_transport",
        "tcp",
        "-i",
        url,
        "-frames:v",
        "1",
        "-q:v",
        "4",
        "-f",
        "image2",
        "-",
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if result.returncode != 0 or not result.stdout:
        stderr = result.stderr[-300:].decode(errors="ignore") if result.stderr else ""
        raise RuntimeError(f"ffmpeg falhou ao capturar frame RTSPS: {stderr}")
    return result.stdout


def capture_snapshot(ip, access_code, timeout=8.0):
    """
    Tenta o protocolo 'chamber image' (A1/P1, mais leve, sem depender de
    ffmpeg) primeiro; se falhar, tenta RTSPS (X1). Deixa a excecao do RTSPS
    subir se as duas falharem, ja que costuma ter a mensagem mais util.
    """
    try:
        return capture_snapshot_chamber(ip, access_code, timeout=timeout)
    except Exception:
        return capture_snapshot_rtsp(ip, access_code, timeout=timeout)


def send_snapshot(makerflow_url, api_key, jpeg_bytes):
    url = f"{makerflow_url.rstrip('/')}/api/v1/printers/snapshot"
    return requests.post(
        url,
        data=jpeg_bytes,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "image/jpeg"},
        timeout=15,
    )
