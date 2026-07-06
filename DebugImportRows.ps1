# Debug: Run import in silent mode and print all rows from HiddenData
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    # Allow macros to run during automation (msoAutomationSecurityLow = 1)
    $excel.AutomationSecurity = 1
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    
    # Enable silent mode and import
    $excel.Run("modImport.EnableSilentMode")
    $excel.Run("modImport.RunImportEngine", "c:\guestion_genv1\QuestionBank.docx")
    
    $wsHidden = $wb.Sheets.Item("HiddenData")
    $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row

    Write-Host "=== HiddenData - ALL ROWS ($lastRow rows total, showing data rows) ==="
    Write-Host ("Row".PadRight(5) + "QID".PadRight(8) + "Unit".PadRight(10) + "Part".PadRight(6) + "Marks".PadRight(7) + "Question (first 60 chars)")
    Write-Host ("-" * 110)

    for ($r = 2; $r -le $lastRow; $r++) {
        $qid = [string]$wsHidden.Cells($r, 1).Value
        $unit = [string]$wsHidden.Cells($r, 2).Value
        $part = [string]$wsHidden.Cells($r, 3).Value
        $marks = [string]$wsHidden.Cells($r, 4).Value
        $qtext = [string]$wsHidden.Cells($r, 5).Value
        if ($qtext.Length -gt 60) { $qtext = $qtext.Substring(0, 60) + "..." }
        Write-Host ("$r".PadRight(5) + $qid.PadRight(8) + $unit.PadRight(10) + $part.PadRight(6) + $marks.PadRight(7) + $qtext)
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
