# Single focused test - NO process killing. Run after all Excel/Word instances are closed.
# Tests ONLY the import parsing accuracy.

$xlsmPath = "c:\guestion_genv1\SmartQPGenerator.xlsm"
$qbPath   = "c:\guestion_genv1\QuestionBank.docx"

Write-Host "Starting clean import parser test..."
Write-Host "Workbook: $xlsmPath"
Write-Host "QB: $qbPath"
Write-Host ""

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1

try {
    $wb = $excel.Workbooks.Open($xlsmPath)
    
    $excel.Run("modImport.EnableSilentMode")
    
    Write-Host "Importing..."
    $excel.Run("modImport.RunImportEngine", $qbPath)
    
    $wsHidden = $wb.Sheets.Item("HiddenData")
    $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
    
    Write-Host "Total rows in HiddenData: $lastRow (data rows: $($lastRow - 1))"
    Write-Host ""
    
    $partA = 0; $partB = 0; $partC = 0
    $unitCounts = @{1=0;2=0;3=0;4=0;5=0}
    
    Write-Host ("Row".PadRight(4) + "QID".PadRight(7) + "Unit".PadRight(10) + "Part".PadRight(5) + "Marks".PadRight(6) + "Question")
    Write-Host ("-" * 85)
    
    for ($r = 2; $r -le $lastRow; $r++) {
        $qid   = [string]($wsHidden.Cells($r, 1).Value2)
        $unit  = [string]($wsHidden.Cells($r, 2).Value2)
        $part  = [string]($wsHidden.Cells($r, 3).Value2)
        $marks = [string]($wsHidden.Cells($r, 4).Value2)
        $qtext = [string]($wsHidden.Cells($r, 5).Value2)
        if ($qtext.Length -gt 45) { $qtext = $qtext.Substring(0, 45) + "..." }
        Write-Host ("$r".PadRight(4) + $qid.PadRight(7) + $unit.PadRight(10) + $part.PadRight(5) + $marks.PadRight(6) + $qtext)
        
        switch ($part) { "A" { $partA++ } "B" { $partB++ } "C" { $partC++ } }
        switch ($unit) {
            "UNIT I"   { $unitCounts[1]++ }
            "UNIT II"  { $unitCounts[2]++ }
            "UNIT III" { $unitCounts[3]++ }
            "UNIT IV"  { $unitCounts[4]++ }
            "UNIT V"   { $unitCounts[5]++ }
        }
    }
    
    Write-Host ""
    Write-Host "=== SUMMARY ==="
    Write-Host "Total: $($lastRow - 1) | Part A: $partA | Part B: $partB | Part C: $partC"
    Write-Host "Unit I: $($unitCounts[1]) | II: $($unitCounts[2]) | III: $($unitCounts[3]) | IV: $($unitCounts[4]) | V: $($unitCounts[5])"
    
    if ($partB -eq 0) {
        Write-Host "[FAIL] Part B = 0 - Parser still broken!" -ForegroundColor Red
    } else {
        Write-Host "[PASS] Part B = $partB" -ForegroundColor Green
    }
    
    $wb.Close($false)
}
catch {
    Write-Error "CRITICAL ERROR: $_"
}
finally {
    try { $excel.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
}
