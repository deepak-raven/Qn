# Quick macro access test
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    Write-Host "Opening workbook..."
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    Write-Host "Opened."
    
    Write-Host "Testing GetSettingValue..."
    $res = $excel.Run("modSettings.GetSettingValue", "Institution Name")
    Write-Host "GetSettingValue result: $res"
    
    Write-Host "Testing EnableSilentMode..."
    $excel.Run("modImport.EnableSilentMode")
    Write-Host "EnableSilentMode OK"
    
    $wb.Close($false)
}
catch {
    Write-Error "ERROR: $_"
}
finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
