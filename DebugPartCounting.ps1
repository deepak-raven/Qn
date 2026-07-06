# Quick debug: open existing data in HiddenData and count parts properly
$xlsmPath = "c:\guestion_genv1\SmartQPGenerator.xlsm"
$qbPath   = "c:\guestion_genv1\QuestionBank.docx"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1

try {
    $wb = $excel.Workbooks.Open($xlsmPath)
    $excel.Run("modImport.EnableSilentMode")
    $excel.Run("modImport.RunImportEngine", $qbPath)
    
    $wsHidden = $wb.Sheets.Item("HiddenData")
    $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
    Write-Host "HiddenData last row: $lastRow"
    
    $partCounts = @{"A"=0; "B"=0; "C"=0}
    
    for ($r = 2; $r -le $lastRow; $r++) {
        $part  = ([string]($wsHidden.Cells($r, 3).Value2)).Trim()
        Write-Host "Row ${r}: part='$part' (len=$($part.Length)) chars: $([int[]][char[]]$part -join ',')"
        if ($partCounts.ContainsKey($part)) { $partCounts[$part]++ }
        else { Write-Host "  ** NOT FOUND in partCounts keys: $($partCounts.Keys -join '|')" }
    }
    
    Write-Host ""
    Write-Host "partCounts A=$($partCounts['A']) B=$($partCounts['B']) C=$($partCounts['C'])"
    Write-Host "partCounts[B] -gt 0: $(($partCounts['B']) -gt 0)"
    
    $wb.Close($false)
}
catch {
    Write-Error "ERROR: $_"
}
finally {
    try { $excel.Quit() } catch {}
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
