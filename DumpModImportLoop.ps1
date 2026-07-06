# Dump all of modImport from compiled workbook
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1  # msoAutomationSecurityLow

try {
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    
    $modImport = $wb.VBProject.VBComponents.Item("modImport")
    $cm = $modImport.CodeModule

    Write-Host "=== modImport code lines 90 to 180 (paragraph scanning loop) ==="
    for ($i = 90; $i -le [Math]::Min(180, $cm.CountOfLines); $i++) {
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
