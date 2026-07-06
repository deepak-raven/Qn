# Debug: Read the actual paragraph text from QuestionBank.docx to understand what the parser sees
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open("c:\guestion_genv1\QuestionBank.docx", $true)
    
    Write-Host "=== ALL PARAGRAPHS IN QUESTION BANK ==="
    $i = 0
    foreach ($para in $doc.Paragraphs) {
        $rawText = $para.Range.Text
        $cleaned = $rawText.Trim()
        $upper = $cleaned.ToUpper()
        
        # Show paragraphs that contain UNIT or MARK keywords
        if ($upper -match "UNIT|MARK|PART") {
            $hexDump = ($cleaned.ToCharArray() | ForEach-Object { [int]$_ }) -join ","
            Write-Host "PARA[$i]: '$cleaned'  HEX: $hexDump"
        }
        $i++
    }
    
    Write-Host "`n=== TABLE COUNT ==="
    Write-Host "Total tables: $($doc.Tables.Count)"
    
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
