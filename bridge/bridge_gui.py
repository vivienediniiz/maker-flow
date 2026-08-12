"""
MakerFlow Bridge (GUI)

Versao com janela grafica do bridge, feita pra ser empacotada com PyInstaller
num .exe standalone e distribuida pro cliente final (sem precisar instalar
Python). Usa a mesma logica de leitura/envio de telemetria de core.py.

Na primeira vez que roda, pede os dados da impressora e do MakerFlow numa
janela simples e salva em %APPDATA%/MakerFlowBridge/config.json. Nas
proximas vezes, conecta direto. Tem um botao "Reconfigurar" pra trocar os
dados (ex: impressora nova, IP mudou).
"""

import json
import os
import queue
import threading
import time
import tkinter as tk
from pathlib import Path
from tkinter import ttk

import core

try:
    import bambulabs_api as bl
except ImportError:
    bl = None

APP_NAME = "MakerFlowBridge"
BRIDGE_VERSION = "1.1.0"

FIELDS = [
    ("api_key", "Chave da impressora (MakerFlow)"),
    ("printer_ip", "IP da impressora"),
    ("printer_serial", "Numero de serie"),
    ("printer_access_code", "Codigo de acesso"),
]
REQUIRED_KEYS = [key for key, _ in FIELDS]


def config_dir() -> Path:
    appdata = os.getenv("APPDATA")
    base = Path(appdata) if appdata else Path.home() / ".makerflow-bridge"
    path = base / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


CONFIG_PATH = config_dir() / "config.json"


def load_config():
    if not CONFIG_PATH.exists():
        return None
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not all(data.get(k) for k in REQUIRED_KEYS):
        return None
    data.setdefault("makerflow_url", core.DEFAULT_MAKERFLOW_URL)
    data.setdefault("poll_interval", core.DEFAULT_POLL_INTERVAL)
    data.setdefault("snapshot_interval", core.DEFAULT_SNAPSHOT_INTERVAL)
    data.setdefault("enable_camera", False)
    return data


def save_config(data):
    CONFIG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def worker_loop(config, stop_event, event_queue):
    if bl is None:
        event_queue.put(("error", "Biblioteca bambulabs_api nao encontrada nesse pacote."))
        return

    printer = None
    next_telemetry = 0.0
    next_snapshot = 0.0

    while not stop_event.is_set():
        try:
            if printer is None:
                event_queue.put(("status", "Conectando na impressora..."))
                printer = bl.Printer(config["printer_ip"], config["printer_access_code"], config["printer_serial"])
                printer.connect()
                time.sleep(2)
                next_telemetry = 0.0
                next_snapshot = 0.0

            now = time.monotonic()

            if now >= next_telemetry:
                payload = core.read_telemetry(printer)
                response = core.send_telemetry(config["makerflow_url"], config["api_key"], payload)
                if response.ok:
                    event_queue.put(("telemetry", payload))
                else:
                    event_queue.put(("error", f"MakerFlow respondeu {response.status_code}: {response.text[:200]}"))
                next_telemetry = now + config.get("poll_interval", core.DEFAULT_POLL_INTERVAL)

            if config.get("enable_camera") and now >= next_snapshot:
                try:
                    jpeg = core.capture_snapshot(config["printer_ip"], config["printer_access_code"])
                    snap_response = core.send_snapshot(config["makerflow_url"], config["api_key"], jpeg)
                    if snap_response.ok:
                        event_queue.put(("snapshot", None))
                    else:
                        event_queue.put(("camera_error", f"MakerFlow respondeu {snap_response.status_code}"))
                except Exception as exc:
                    # Falha de camera nao derruba a telemetria - so registra e segue.
                    event_queue.put(("camera_error", str(exc)))
                next_snapshot = now + config.get("snapshot_interval", core.DEFAULT_SNAPSHOT_INTERVAL)
        except Exception as exc:
            event_queue.put(("error", str(exc)))
            try:
                if printer:
                    printer.disconnect()
            except Exception:
                pass
            printer = None
            next_telemetry = 0.0
            next_snapshot = 0.0

        stop_event.wait(1)

    if printer:
        try:
            printer.disconnect()
        except Exception:
            pass


class App:
    def __init__(self, root):
        self.root = root
        self.root.title("MakerFlow Bridge")
        self.root.protocol("WM_DELETE_WINDOW", self.on_exit)

        self.event_queue = queue.Queue()
        self.stop_event = None
        self.worker_thread = None
        self.entries = {}

        self.container = ttk.Frame(root, padding=16)
        self.container.pack(fill="both", expand=True)

        config = load_config()
        if config:
            self.show_status_view(config)
        else:
            self.show_config_view()

    def clear_container(self):
        for widget in self.container.winfo_children():
            widget.destroy()

    # ---- Tela de configuracao ----
    def show_config_view(self, existing=None, message=None):
        self.stop_worker()
        self.clear_container()
        existing = existing or {}
        self.entries = {}

        ttk.Label(self.container, text="Configurar impressora", font=("Segoe UI", 13, "bold")).pack(anchor="w")
        ttk.Label(
            self.container,
            text=(
                "IP, numero de serie e codigo de acesso ficam na tela da impressora,\n"
                "em Configuracoes de Rede (com Modo Somente LAN e Modo Desenvolvedor\n"
                "ativados). O numero de serie tambem esta na etiqueta embaixo dela."
            ),
            wraplength=380,
            justify="left",
            foreground="#666666",
        ).pack(anchor="w", pady=(4, 12))

        for key, label in FIELDS:
            ttk.Label(self.container, text=label).pack(anchor="w")
            entry = ttk.Entry(self.container, width=46)
            entry.insert(0, existing.get(key, ""))
            entry.pack(anchor="w", pady=(0, 8))
            self.entries[key] = entry

        self.camera_var = tk.BooleanVar(value=bool(existing.get("enable_camera", False)))
        ttk.Checkbutton(
            self.container, text="Habilitar câmera (se a impressora tiver)", variable=self.camera_var
        ).pack(anchor="w", pady=(4, 8))

        if message:
            ttk.Label(self.container, text=message, foreground="#c0392b", wraplength=380, justify="left").pack(
                anchor="w", pady=(0, 8)
            )

        ttk.Button(self.container, text="Salvar e conectar", command=self.on_save).pack(anchor="w", pady=(8, 0))
        ttk.Label(self.container, text=f"MakerFlow Bridge v{BRIDGE_VERSION}", foreground="#999999").pack(
            anchor="w", pady=(16, 0)
        )

    def on_save(self):
        values = {key: entry.get().strip() for key, entry in self.entries.items()}
        if not all(values.values()):
            values["enable_camera"] = self.camera_var.get()
            self.show_config_view(existing=values, message="Preencha todos os campos antes de salvar.")
            return

        values["makerflow_url"] = core.DEFAULT_MAKERFLOW_URL
        values["poll_interval"] = core.DEFAULT_POLL_INTERVAL
        values["snapshot_interval"] = core.DEFAULT_SNAPSHOT_INTERVAL
        values["enable_camera"] = self.camera_var.get()
        save_config(values)
        self.show_status_view(values)

    # ---- Tela de status ----
    def show_status_view(self, config):
        self.clear_container()

        ttk.Label(self.container, text="MakerFlow Bridge", font=("Segoe UI", 13, "bold")).pack(anchor="w")
        camera_suffix = " · câmera habilitada" if config.get("enable_camera") else ""
        ttk.Label(self.container, text=f"Impressora: {config['printer_ip']}{camera_suffix}", foreground="#666666").pack(
            anchor="w", pady=(2, 12)
        )

        self.status_var = tk.StringVar(value="Iniciando...")
        ttk.Label(self.container, textvariable=self.status_var, font=("Segoe UI", 10, "bold")).pack(anchor="w")

        self.detail_var = tk.StringVar(value="")
        ttk.Label(
            self.container, textvariable=self.detail_var, foreground="#666666", wraplength=380, justify="left"
        ).pack(anchor="w", pady=(4, 12))

        self.log_text = tk.Text(self.container, width=50, height=10, state="disabled", font=("Consolas", 8))
        self.log_text.pack(pady=(0, 12))

        btn_row = ttk.Frame(self.container)
        btn_row.pack(anchor="w")
        ttk.Button(btn_row, text="Reconfigurar", command=lambda: self.show_config_view(existing=config)).pack(
            side="left", padx=(0, 8)
        )
        ttk.Button(btn_row, text="Sair", command=self.on_exit).pack(side="left")

        ttk.Label(self.container, text=f"MakerFlow Bridge v{BRIDGE_VERSION}", foreground="#999999").pack(
            anchor="w", pady=(16, 0)
        )

        self.start_worker(config)
        self.root.after(300, self.poll_events)

    def start_worker(self, config):
        self.stop_worker()
        self.stop_event = threading.Event()
        self.worker_thread = threading.Thread(
            target=worker_loop, args=(config, self.stop_event, self.event_queue), daemon=True
        )
        self.worker_thread.start()

    def stop_worker(self):
        if self.stop_event:
            self.stop_event.set()
        self.worker_thread = None
        self.stop_event = None

    def poll_events(self):
        try:
            while True:
                kind, payload = self.event_queue.get_nowait()
                if kind == "status":
                    self.status_var.set(payload)
                elif kind == "error":
                    self.status_var.set("Erro — tentando de novo...")
                    self.log(f"[erro] {payload}")
                elif kind == "telemetry":
                    self.status_var.set("Conectado")
                    detail = f"status: {payload.get('status')}"
                    if "progress_percent" in payload:
                        detail += f" · {payload['progress_percent']}%"
                    self.detail_var.set(detail)
                    self.log(f"[ok] {detail}")
                elif kind == "snapshot":
                    self.log("[ok] snapshot da câmera enviado")
                elif kind == "camera_error":
                    self.log(f"[erro câmera] {payload}")
        except queue.Empty:
            pass

        if self.worker_thread is not None:
            self.root.after(500, self.poll_events)

    def log(self, line):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", line + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def on_exit(self):
        self.stop_worker()
        self.root.destroy()


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
