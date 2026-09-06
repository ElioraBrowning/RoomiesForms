# Why use two commands for debugging when you could just use one>
Write-Host "Starting Roomie's Forms Development Servers..."

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend; dotnet run"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Web; npm run dev"

Write-Host "Both servers have been started in new windows!"
