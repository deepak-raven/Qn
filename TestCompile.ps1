# PowerShell compile check test
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
try {
    Write-Host "Opening workbook..."
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    
    Write-Host "Invoking GetSettingValue macro to trigger compilation..."
    $res = $excel.Run("modSettings.GetSettingValue", "Institution Name")
    
    Write-Host "SUCCESS: VBA Compilation completed successfully without errors!"
    Write-Host "Result of GetSettingValue: $res"
    
    $wb.Close($false)
}
catch {
    Write-Error "ERROR: VBA Compilation or Run failed: $_"
}
finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
