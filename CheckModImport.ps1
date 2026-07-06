# Verify build correctly imports modImport.bas
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    
    # Check modImport code
    $modImport = $wb.VBProject.VBComponents.Item("modImport")
    $cm = $modImport.CodeModule
    
    Write-Host "modImport total code lines: $($cm.CountOfLines)"
    Write-Host ""
    Write-Host "=== First 30 lines of modImport in compiled workbook ==="
    for ($i = 1; $i -le [Math]::Min(30, $cm.CountOfLines); $i++) {
        $lineText = $cm.Lines($i, 1)
        Write-Host "${i}: $lineText"
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
