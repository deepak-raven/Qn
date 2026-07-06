# Check what procedures exist in modImport
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    
    # List all VBComponents
    Write-Host "=== VBProject Components ==="
    foreach ($comp in $wb.VBProject.VBComponents) {
        Write-Host "  Component: $($comp.Name) (Type: $($comp.Type))"
    }
    
    Write-Host "`n=== modImport Procedures ==="
    $modImport = $wb.VBProject.VBComponents.Item("modImport")
    if ($modImport) {
        $cm = $modImport.CodeModule
        Write-Host "Code lines: $($cm.CountOfLines)"
        
        # Search for Sub and Function declarations
        for ($line = 1; $line -le $cm.CountOfLines; $line++) {
            $lineText = $cm.Lines($line, 1)
            if ($lineText -match "^(Public|Private)?\s*(Sub|Function)") {
                Write-Host "  Line ${line}: $lineText"
            }
        }
    } else {
        Write-Host "modImport component NOT FOUND!"
    }
    
    $wb.Close($false)
}
catch {
    Write-Error "ERROR: $_"
}
finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
