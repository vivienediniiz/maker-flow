param(
    [string]$Message = "atualizacoes"
)

Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

Write-Host "Commitando: $Message" -ForegroundColor Cyan
git commit -m "$Message"

Write-Host "Enviando pro GitHub..." -ForegroundColor Cyan
git push

Write-Host "Push concluido! O Netlify vai comecar a publicar em instantes." -ForegroundColor Green