# Import test that reads Dashboard B10 to see any error messages
$xlsmPath = "c:\guestion_genv1\SmartQPGenerator.xlsm"
$qbPath   = "c:\guestion_genv1\QuestionBank.docx"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1

try {
    Write-Host "Opening workbook..."
    $wb = $excel.Workbooks.Open($xlsmPath)
    
    Write-Host "Setting SilentMode..."
    $excel.Run("modImport.EnableSilentMode")
    
    Write-Host "Clearing B10 before import..."
    $wb.Sheets.Item("Dashboard").Range("B10").Value = "PRE-IMPORT"
    
    Write-Host "Running import..."
    $excel.Run("modImport.RunImportEngine", $qbPath)
    
    Write-Host "Import call returned."
    
    # Read B10 using Value2 (not Value - which is a parameterized property in PS)
    $b10 = $wb.Sheets.Item("Dashboard").Range("B10").Value2
    Write-Host "Dashboard B10 (Value2) after import: '$b10'"
    
    # Also read via VBA to be sure
    $b10vba = $excel.Run("modSettings.GetSettingValue", "Institution Name")
    Write-Host "VBA check (Institution Name setting): '$b10vba'"
    
    # Read HiddenData row count using Value2
    $wsHidden = $wb.Sheets.Item("HiddenData")
    $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
    Write-Host "HiddenData rows: $lastRow (data rows: $($lastRow - 1))"
    
    # Read first 5 data rows using Value2
    if ($lastRow -gt 1) {
        Write-Host "First data rows:"
        for ($r = 2; $r -le [Math]::Min($lastRow, 6); $r++) {
            $unit = [string]($wsHidden.Cells($r, 2).Value2)
            $part = [string]($wsHidden.Cells($r, 3).Value2)
            $marks = [string]($wsHidden.Cells($r, 4).Value2)
            $qtext = [string]($wsHidden.Cells($r, 5).Value2)
            if ($qtext.Length -gt 50) { $qtext = $qtext.Substring(0, 50) + "..." }
            Write-Host "  Row $r : $unit | $part | $marks | $qtext"
        }
    }

    
    $wb.Close($false)
}
catch {
    Write-Error "ERROR: $_"
}
finally {
    try { $excel.Quit() } catch {}
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
