# Recrea la base de datos desde cero e importa el script provisto, leyendo las credenciales de .env.
# Alternativa multiplataforma (sin XAMPP): npm run db:importar
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\importar-db.ps1

$ErrorActionPreference = "Stop"

$raiz    = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $raiz ".env"
$sqlFile = Join-Path (Split-Path -Parent $raiz) "clinica_ampliada.sql.txt"
$mysql   = "C:\xampp\mysql\bin\mysql.exe"

if (-not (Test-Path $envFile)) { throw "No se encontro $envFile" }
if (-not (Test-Path $sqlFile)) { throw "No se encontro $sqlFile" }
if (-not (Test-Path $mysql))   { throw "No se encontro $mysql" }

# Parseo del .env
$config = @{}
foreach ($linea in Get-Content $envFile) {
    if ($linea -match '^\s*([A-Z_]+)\s*=\s*(.*)$') {
        $config[$matches[1]] = $matches[2].Trim()
    }
}

$db = $config['DB_NAME']
if ([string]::IsNullOrWhiteSpace($db)) { throw "DB_NAME vacio en .env" }

# MYSQL_PWD evita que la contrasena aparezca en la linea de comandos / lista de procesos
$env:MYSQL_PWD = $config['DB_PASSWORD']
$comunes = @("-u", $config['DB_USER'], "-h", $config['DB_HOST'], "-P", $config['DB_PORT'])

try {
    Write-Output "Recreando la base '$db' desde cero..."
    & $mysql @comunes -e "DROP DATABASE IF EXISTS ``$db``; CREATE DATABASE ``$db`` CHARACTER SET utf8 COLLATE utf8_general_ci;"
    if ($LASTEXITCODE -ne 0) { throw "Fallo la creacion de la base (codigo $LASTEXITCODE)" }

    Write-Output "Importando $sqlFile ..."
    Get-Content $sqlFile -Raw | & $mysql @comunes $db
    if ($LASTEXITCODE -ne 0) { throw "Fallo la importacion (codigo $LASTEXITCODE)" }

    Write-Output "Tablas creadas:"
    & $mysql @comunes $db -e "SHOW TABLES;"
}
finally {
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
}

Write-Output "Listo."
