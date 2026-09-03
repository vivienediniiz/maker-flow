# Empacota o bridge_gui.py num executavel Windows standalone (MakerFlowBridge.exe),
# pra distribuir pro cliente final sem precisar que ele tenha Python instalado.
#
# Uso:
#   cd bridge
#   .\build.ps1
#
# O .exe fica em bridge\dist\MakerFlowBridge.exe

$ErrorActionPreference = "Stop"

Write-Output "Instalando dependencias de runtime..."
pip install -r requirements.txt

Write-Output "Instalando PyInstaller..."
pip install pyinstaller

Write-Output "Empacotando MakerFlowBridge.exe..."
pyinstaller --onefile --noconsole --name MakerFlowBridge --distpath dist --workpath build --specpath build bridge_gui.py

Write-Output ""
Write-Output "Pronto: dist\MakerFlowBridge.exe"
