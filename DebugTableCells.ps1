# Direct table parsing test via Word COM to verify cell iteration
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open("c:\guestion_genv1\QuestionBank.docx", $true)
    
    Write-Host "=== Testing Table Cell Iteration ==="
    Write-Host "Total tables: $($doc.Tables.Count)"
    
    # Test first table (Part A, Unit I)
    $tbl = $doc.Tables.Item(1)
    Write-Host "`nTable 1: $($tbl.Rows.Count) rows x $($tbl.Columns.Count) cols"
    
    $cellCount = 0
    foreach ($cell in $tbl.Range.Cells) {
        $rIdx = $cell.RowIndex
        $cIdx = $cell.ColumnIndex
        $cellText = $cell.Range.Text.TrimEnd([char]13, [char]7)
        Write-Host "  Cell: row=$rIdx col=$cIdx text='$cellText'"
        $cellCount++
        if ($cellCount -ge 20) { 
            Write-Host "  ... (showing first 20 cells)"
            break 
        }
    }
    
    # Test second table (Part B, Unit I)
    $tbl2 = $doc.Tables.Item(2)
    Write-Host "`nTable 2: $($tbl2.Rows.Count) rows x $($tbl2.Columns.Count) cols"
    $cellCount = 0
    foreach ($cell in $tbl2.Range.Cells) {
        $rIdx = $cell.RowIndex
        $cIdx = $cell.ColumnIndex
        $cellText = $cell.Range.Text.TrimEnd([char]13, [char]7)
        Write-Host "  Cell: row=$rIdx col=$cIdx text='$cellText'"
        $cellCount++
        if ($cellCount -ge 15) { 
            Write-Host "  ... (showing first 15 cells)"
            break 
        }
    }
    
    $doc.Close($false)
}
catch {
    Write-Error "ERROR: $_"
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
