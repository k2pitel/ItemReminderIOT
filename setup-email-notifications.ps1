# Quick Notification Setup Script
# This script helps you configure email notifications quickly

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "📬 Email Notification Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend .env exists
$envPath = ".\backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Error: backend\.env not found" -ForegroundColor Red
    Write-Host "Creating from template..." -ForegroundColor Yellow
    Copy-Item ".\backend\.env.example" $envPath
}

Write-Host "📧 Gmail Setup Instructions:" -ForegroundColor Green
Write-Host "1. Go to: https://myaccount.google.com/security" -ForegroundColor White
Write-Host "2. Enable 2-Step Verification if not enabled" -ForegroundColor White
Write-Host "3. Search for 'App passwords' and create one" -ForegroundColor White
Write-Host "4. Copy the 16-character password" -ForegroundColor White
Write-Host ""

# Prompt for email
$email = Read-Host "Enter your Gmail address"
$appPassword = Read-Host "Enter your Gmail App Password (16 characters, no spaces)" -AsSecureString
$appPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword))

Write-Host ""
Write-Host "📝 Updating backend\.env..." -ForegroundColor Yellow

# Read current .env
$envContent = Get-Content $envPath -Raw

# Update SMTP settings
$envContent = $envContent -replace 'SMTP_USER=.*', "SMTP_USER=$email"
$envContent = $envContent -replace 'SMTP_PASS=.*', "SMTP_PASS=$appPasswordPlain"
$envContent = $envContent -replace 'EMAIL_FROM=.*', "EMAIL_FROM=`"IoT Item Reminder <$email>`""

# Save updated .env
$envContent | Set-Content $envPath -NoNewline

Write-Host "✅ Configuration saved!" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Restarting backend service..." -ForegroundColor Yellow

# Restart backend
docker-compose restart backend

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Checking backend logs..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
docker logs itemreminder-backend --tail 10

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check logs above for 'Email transporter is ready'" -ForegroundColor White
Write-Host "2. Test with: cd backend; node test-notifications.js" -ForegroundColor White
Write-Host "3. In the web app, go to Settings and enable email notifications" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
