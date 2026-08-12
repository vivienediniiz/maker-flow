"""
MakerFlow Bridge

Le o status de uma impressora Bambu Lab na rede local (via bambulabs-api) e
envia telemetria periodicamente pro endpoint /api/v1/printers/telemetry do
MakerFlow.

Este script roda no computador da pessoa, na mesma rede Wi-Fi da impressora.
Ele NAO roda no servidor do site — o MakerFlow nao teria como alcancar a
impressora, que fica atras do roteador de casa/estudio.
"""

import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

try:
    import bambulabs_api as bl
except ImportError:
    print("Faltou instalar as dependencias. Rode: pip install -r requirements.txt")
    sys.exit(1)

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

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


def ask(label):
    return input(f"{label}: ").strip()


def load_config():
    printer_ip = os.getenv("PRINTER_IP")
    printer_serial = os.getenv("PRINTER_SERIAL")
    printer_access_code = os.getenv("PRINTER_ACCESS_CODE")
    api_key = os.getenv("MAKERFLOW_API_KEY")
    makerflow_url = os.getenv("MAKERFLOW_URL", DEFAULT_MAKERFLOW_URL)
    poll_interval = int(os.getenv("POLL_INTERVAL_SECONDS", DEFAULT_POLL_INTERVAL))

    had_env = bool(printer_ip and printer_serial and printer_access_code and api_key)

    print("=== MakerFlow Bridge ===")
    if not had_env:
        print("IP, numero de serie e codigo de acesso aparecem na tela da impressora,")
        print("em Configuracoes de Rede (com o Modo Somente LAN ativado).\n")

    if not printer_ip:
        printer_ip = ask("IP da impressora")
    if not printer_serial:
        printer_serial = ask("Numero de serie")
    if not printer_access_code:
        printer_access_code = ask("Codigo de acesso")
    if not api_key:
        api_key = ask("Chave da impressora no MakerFlow (Cadastros -> Impressoras)")

    if not all([printer_ip, printer_serial, printer_access_code, api_key]):
        print("\nFaltam dados obrigatorios. Encerrando.")
        sys.exit(1)

    if not had_env:
        save = input("\nSalvar esses dados em bridge/.env pra nao perguntar de novo? [s/N]: ").strip().lower()
        if save == "s":
            write_env_file(printer_ip, printer_serial, printer_access_code, api_key, makerflow_url, poll_interval)

    return {
        "printer_ip": printer_ip,
        "printer_serial": printer_serial,
        "printer_access_code": printer_access_code,
        "api_key": api_key,
        "makerflow_url": makerflow_url.rstrip("/"),
        "poll_interval": poll_interval,
    }


def write_env_file(ip, serial, access_code, api_key, makerflow_url, poll_interval):
    ENV_PATH.write_text(
        "PRINTER_IP={}\n"
        "PRINTER_SERIAL={}\n"
        "PRINTER_ACCESS_CODE={}\n"
        "MAKERFLOW_API_KEY={}\n"
        "MAKERFLOW_URL={}\n"
        "POLL_INTERVAL_SECONDS={}\n".format(ip, serial, access_code, api_key, makerflow_url, poll_interval),
        encoding="utf-8",
    )
    print(f"Salvo em {ENV_PATH}")


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
    url = f"{makerflow_url}/api/v1/printers/telemetry"
    return requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=10,
    )


def main():
    config = load_config()

    print(f"\nConectando em {config['printer_ip']}...")
    printer = bl.Printer(config["printer_ip"], config["printer_access_code"], config["printer_serial"])
    printer.connect()
    time.sleep(2)
    print(
        "Conectado. Enviando telemetria a cada {}s pra {}. Ctrl+C pra parar.\n".format(
            config["poll_interval"], config["makerflow_url"]
        )
    )

    try:
        while True:
            try:
                payload = read_telemetry(printer)
                response = send_telemetry(config["makerflow_url"], config["api_key"], payload)
                if response.ok:
                    print(f"[ok] status={payload.get('status')} progresso={payload.get('progress_percent', '?')}%")
                else:
                    print(f"[erro] MakerFlow respondeu {response.status_code}: {response.text}")
            except requests.RequestException as exc:
                print(f"[erro de rede] Nao consegui falar com o MakerFlow: {exc}")
            except Exception as exc:
                print(f"[erro] Falha lendo a impressora: {exc}")

            time.sleep(config["poll_interval"])
    except KeyboardInterrupt:
        print("\nEncerrando...")
    finally:
        printer.disconnect()


if __name__ == "__main__":
    main()
