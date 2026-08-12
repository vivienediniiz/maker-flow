"""
MakerFlow Bridge (CLI)

Versao de linha de comando, pra desenvolvedores/uso avancado. Le o status de
uma impressora Bambu Lab na rede local (via bambulabs-api) e envia telemetria
periodicamente pro endpoint /api/v1/printers/telemetry do MakerFlow.

Para o cliente final (sem Python instalado), use o bridge_gui.py empacotado
como .exe — ele tem uma janela grafica em vez de perguntas no terminal, mas
usa a mesma logica de core.py por baixo.

Este script roda no computador da pessoa, na mesma rede Wi-Fi da impressora.
Ele NAO roda no servidor do site — o MakerFlow nao teria como alcancar a
impressora, que fica atras do roteador de casa/estudio.
"""

import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

import core

try:
    import bambulabs_api as bl
except ImportError:
    print("Faltou instalar as dependencias. Rode: pip install -r requirements.txt")
    sys.exit(1)

import requests

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)


def ask(label):
    return input(f"{label}: ").strip()


def load_config():
    printer_ip = os.getenv("PRINTER_IP")
    printer_serial = os.getenv("PRINTER_SERIAL")
    printer_access_code = os.getenv("PRINTER_ACCESS_CODE")
    api_key = os.getenv("MAKERFLOW_API_KEY")
    makerflow_url = os.getenv("MAKERFLOW_URL", core.DEFAULT_MAKERFLOW_URL)
    poll_interval = int(os.getenv("POLL_INTERVAL_SECONDS", core.DEFAULT_POLL_INTERVAL))
    snapshot_interval = int(os.getenv("SNAPSHOT_INTERVAL_SECONDS", core.DEFAULT_SNAPSHOT_INTERVAL))
    enable_camera_env = os.getenv("ENABLE_CAMERA")

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

    if enable_camera_env is not None:
        enable_camera = enable_camera_env.strip().lower() in ("1", "true", "s", "sim", "yes")
    else:
        enable_camera = ask("Habilitar captura de camera, se a impressora tiver? [s/N]").strip().lower() == "s"

    if not had_env:
        save = input("\nSalvar esses dados em bridge/.env pra nao perguntar de novo? [s/N]: ").strip().lower()
        if save == "s":
            write_env_file(
                printer_ip, printer_serial, printer_access_code, api_key, makerflow_url, poll_interval,
                snapshot_interval, enable_camera,
            )

    return {
        "printer_ip": printer_ip,
        "printer_serial": printer_serial,
        "printer_access_code": printer_access_code,
        "api_key": api_key,
        "makerflow_url": makerflow_url.rstrip("/"),
        "poll_interval": poll_interval,
        "snapshot_interval": snapshot_interval,
        "enable_camera": enable_camera,
    }


def write_env_file(ip, serial, access_code, api_key, makerflow_url, poll_interval, snapshot_interval, enable_camera):
    ENV_PATH.write_text(
        "PRINTER_IP={}\n"
        "PRINTER_SERIAL={}\n"
        "PRINTER_ACCESS_CODE={}\n"
        "MAKERFLOW_API_KEY={}\n"
        "MAKERFLOW_URL={}\n"
        "POLL_INTERVAL_SECONDS={}\n"
        "SNAPSHOT_INTERVAL_SECONDS={}\n"
        "ENABLE_CAMERA={}\n".format(
            ip, serial, access_code, api_key, makerflow_url, poll_interval,
            snapshot_interval, "true" if enable_camera else "false",
        ),
        encoding="utf-8",
    )
    print(f"Salvo em {ENV_PATH}")


def main():
    config = load_config()

    print(f"\nConectando em {config['printer_ip']}...")
    printer = bl.Printer(config["printer_ip"], config["printer_access_code"], config["printer_serial"])
    printer.connect()
    time.sleep(2)
    camera_msg = (
        f" + snapshot da camera a cada {config['snapshot_interval']}s"
        if config["enable_camera"]
        else " (camera desabilitada)"
    )
    print(
        "Conectado. Enviando telemetria a cada {}s{} pra {}. Ctrl+C pra parar.\n".format(
            config["poll_interval"], camera_msg, config["makerflow_url"]
        )
    )

    next_telemetry = 0.0
    next_snapshot = 0.0

    try:
        while True:
            now = time.monotonic()

            if now >= next_telemetry:
                try:
                    payload = core.read_telemetry(printer)
                    response = core.send_telemetry(config["makerflow_url"], config["api_key"], payload)
                    if response.ok:
                        print(f"[ok] status={payload.get('status')} progresso={payload.get('progress_percent', '?')}%")
                    else:
                        print(f"[erro] MakerFlow respondeu {response.status_code}: {response.text}")
                except requests.RequestException as exc:
                    print(f"[erro de rede] Nao consegui falar com o MakerFlow: {exc}")
                except Exception as exc:
                    print(f"[erro] Falha lendo a impressora: {exc}")
                next_telemetry = now + config["poll_interval"]

            if config["enable_camera"] and now >= next_snapshot:
                try:
                    jpeg = core.capture_snapshot(config["printer_ip"], config["printer_access_code"])
                    response = core.send_snapshot(config["makerflow_url"], config["api_key"], jpeg)
                    if not response.ok:
                        print(f"[erro camera] MakerFlow respondeu {response.status_code}: {response.text}")
                except Exception as exc:
                    # Falha de camera nunca deve derrubar a telemetria - so pula essa rodada.
                    print(f"[erro camera] {exc}")
                next_snapshot = now + config["snapshot_interval"]

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nEncerrando...")
    finally:
        printer.disconnect()


if __name__ == "__main__":
    main()
