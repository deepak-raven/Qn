# Clean standalone test - import and dump all rows
# Run this standalone, do NOT run other Excel/Word COM scripts concurrently

$xlsmPath = "c:\guestion_genv1\SmartQPGenerator.xlsm"
$qbPath   = "c:\guestion_genv1\QuestionBank.docx"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1  # msoAutomationSecurityLow - allow macros

try {
    Write-Host "Opening workbook..."
    $wb = $excel.Workbooks.Open($xlsmPath)

    Write-Host "Enabling silent mode..."
    $excel.Run("modImport.EnableSilentMode")

    Write-Host "Starting import..."
    $excel.Run("modImport.RunImportEngine", $qbPath)

    Write-Host "Import complete. Reading HiddenData..."

    $wsHidden = $wb.Sheets.Item("HiddenData")
    $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row

    Write-Host ""
    Write-Host "=== HiddenData ($lastRow total rows) ==="
    Write-Host ("Row".PadRight(4) + "QID".PadRight(7) + "Unit".PadRight(10) + "Part".PadRight(5) + "Marks".PadRight(6) + "Question")
    Write-Host ("-" * 90)

    for ($r = 2; $r -le $lastRow; $r++) {
        $qid   = [string]($wsHidden.Cells($r, 1).Value2)
        $unit  = [string]($wsHidden.Cells($r, 2).Value2)
        $part  = [string]($wsHidden.Cells($r, 3).Value2)
        $marks = [string]($wsHidden.Cells($r, 4).Value2)
        $qtext = [string]($wsHidden.Cells($r, 5).Value2)
        if ($qtext.Length -gt 50) { $qtext = $qtext.Substring(0, 50) + "..." }
        Write-Host ("$r".PadRight(4) + $qid.PadRight(7) + $unit.PadRight(10) + $part.PadRight(5) + $marks.PadRight(6) + $qtext)
    }

    Write-Host ""
    # Count by Part
    $partA = 0; $partB = 0; $partC = 0
    $unitCounts = @{1=0;2=0;3=0;4=0;5=0}
    for ($r = 2; $r -le $lastRow; $r++) {
        $part = [string]($wsHidden.Cells($r, 3).Value2)
        $unit = [string]($wsHidden.Cells($r, 2).Value2)
        switch ($part) { "A" { $partA++ } "B" { $partB++ } "C" { $partC++ } }
        switch ($unit) {
            "UNIT I"   { $unitCounts[1]++ }
            "UNIT II"  { $unitCounts[2]++ }
            "UNIT III" { $unitCounts[3]++ }
            "UNIT IV"  { $unitCounts[4]++ }
            "UNIT V"   { $unitCounts[5]++ }
        }
    }

    Write-Host "=== SUMMARY ==="
    Write-Host "Total questions: $($lastRow - 1)"
    Write-Host "Part A: $partA | Part B: $partB | Part C: $partC"
    Write-Host "Unit I: $($unitCounts[1]) | II: $($unitCounts[2]) | III: $($unitCounts[3]) | IV: $($unitCounts[4]) | V: $($unitCounts[5])"

    $wb.Close($false)
}
catch {
    Write-Error "CRITICAL ERROR: $_"
}
finally {
    try { $excel.Quit() } catch {}
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
