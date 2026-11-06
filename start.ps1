# Roomie's Forms Development Runner
Write-Host "Starting Roomie's Forms Development Server..."
Write-Host "Backend: Google Sheets & Google Apps Script (Serverless)"
Write-Host "Frontend: React / Vite (http://localhost:5173)"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Web; npm run dev"

Write-Host "Frontend dev server started in a new window!"
Write-Host "Note: ASP.NET Core backend is decommissioned - all data flows directly to Google Sheets."

