# Dump ParseQuestionTable from compiled workbook to check for issues
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1

try {
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    $modImport = $wb.VBProject.VBComponents.Item("modImport")
    $cm = $modImport.CodeModule
    
    Write-Host "Lines 260-390 (ParseQuestionTable and ProcessParsedRow):"
    for ($i = 260; $i -le [Math]::Min(390, $cm.CountOfLines); $i++) {
        $lineText = $cm.Lines($i, 1)
        Write-Host "${i}: $lineText"
    }
    
    $wb.Close($false)
}
catch { Write-Error "ERROR: $_" }
finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
