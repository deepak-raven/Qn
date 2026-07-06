# Debug: show table structure of QuestionBank.docx
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open("c:\guestion_genv1\QuestionBank.docx", $true)
    
    Write-Host "=== TABLE SUMMARY ==="
    Write-Host "Total tables: $($doc.Tables.Count)"
    
    for ($t = 1; $t -le $doc.Tables.Count; $t++) {
        $tbl = $doc.Tables.Item($t)
        $rows = $tbl.Rows.Count
        $cols = $tbl.Columns.Count
        try {
            $firstCell = $tbl.Cell(1, 1).Range.Text.Trim()
        } catch {
            $firstCell = "(error reading cell)"
        }
        $tblStart = $tbl.Range.Start
        Write-Host "Table $t at pos $tblStart : $rows rows x $cols cols | First cell: '$firstCell'"
    }
    
    Write-Host "`n=== NON-TABLE PARAGRAPHS (first 100 chars each) ==="
    $i = 0
    foreach ($para in $doc.Paragraphs) {
        $inTable = $para.Range.Information(12)
        if (-not $inTable) {
            $rawText = $para.Range.Text
            $cleaned = $rawText.TrimEnd()
            $pos = $para.Range.Start
            Write-Host "Para[$i] pos=$pos : '$cleaned'"
        }
        $i++
    }
    
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
