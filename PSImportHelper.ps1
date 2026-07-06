# PS-only import: reads QB Word doc, writes to HiddenData directly
# Used for automation testing to bypass VBA Word COM issues

param(
    [string]$xlsmPath = "c:\guestion_genv1\SmartQPGenerator.xlsm",
    [string]$qbPath   = "c:\guestion_genv1\QuestionBank.docx"
)

Write-Host "=== PS-Only QB Import (for automation testing) ==="
Write-Host "Opening Word document..."

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1

try {
    # Open the QB document
    $doc = $word.Documents.Open($qbPath, $true)
    Write-Host "Word doc opened. Tables: $($doc.Tables.Count)"
    
    # Open the Excel workbook  
    $wb = $excel.Workbooks.Open($xlsmPath)
    $wsHidden = $wb.Sheets.Item("HiddenData")
    
    # Clear and set headers
    $wsHidden.Cells.Clear()
    $wsHidden.Cells(1, 1).Value2 = "QID"
    $wsHidden.Cells(1, 2).Value2 = "Unit"
    $wsHidden.Cells(1, 3).Value2 = "Part"
    $wsHidden.Cells(1, 4).Value2 = "Marks"
    $wsHidden.Cells(1, 5).Value2 = "Question"
    $wsHidden.Cells(1, 6).Value2 = "KL"
    $wsHidden.Cells(1, 7).Value2 = "CO"
    $wsHidden.Cells(1, 8).Value2 = "HasRich"
    $wsHidden.Cells(1, 9).Value2 = "TableIndex"
    $wsHidden.Cells(1, 10).Value2 = "RowIndex"
    $wsHidden.Cells(1, 11).Value2 = "Selected"
    
    # State tracking
    $currentUnit  = "UNIT I"
    $currentMarks = 2
    $currentPart  = "A"
    $qCount = 0
    $lastTblStart = -1
    $tblIdx = 0
    
    # Paragraph scan
    foreach ($para in $doc.Paragraphs) {
        $rawTxt = $para.Range.Text
        
        # Heading detection (short paragraphs)
        if ($rawTxt.Length -lt 80) {
            $clean = $rawTxt.ToUpper().Trim()
            $clean = $clean -replace '\s', ''
            $clean = $clean -replace '-', ''
            $clean = $clean -replace ':', ''
            $clean = $clean -replace [char]13, ''
            $clean = $clean -replace [char]7, ''
            
            # Unit heading
            if ($clean -match 'UNITV[^I]|UNITV$|UNIT5') {
                $currentUnit = "UNIT V"
            } elseif ($clean -match 'UNITIV|UNIT4') {
                $currentUnit = "UNIT IV"
            } elseif ($clean -match 'UNITIII|UNIT3') {
                $currentUnit = "UNIT III"
            } elseif ($clean -match 'UNITII[^I]|UNITII$|UNIT2') {
                $currentUnit = "UNIT II"
            } elseif ($clean -match 'UNITI[^IV]|UNITI$|UNIT1') {
                $currentUnit = "UNIT I"
            }
            
            # Marks/Part heading
            if ($clean -match 'TWOMARK|2MARK') {
                $currentMarks = 2; $currentPart = "A"
            } elseif ($clean -match 'THIRTEENMARK|13MARK') {
                $currentMarks = 13; $currentPart = "B"
            } elseif ($clean -match 'FIFTEENMARK|15MARK') {
                $currentMarks = 15; $currentPart = "C"
            }
        }
        
        # Table detection
        if ($para.Range.Information(12)) {
            $tbl = $para.Range.Tables(1)
            $thisTblStart = $tbl.Range.Start
            
            if ($thisTblStart -ne $lastTblStart) {
                $lastTblStart = $thisTblStart
                $tblIdx++
                
                # Parse table cells
                $curRow = 0; $sNo = ""; $qText = ""; $klText = ""; $coText = ""
                
                foreach ($cell in $tbl.Range.Cells) {
                    $rIdx = $cell.RowIndex
                    $cIdx = $cell.ColumnIndex
                    $cellTxt = $cell.Range.Text.TrimEnd([char]13, [char]7)
                    
                    if ($rIdx -ne $curRow -and $curRow -gt 0) {
                        # Process previous row
                        $sNoClean = $sNo.Trim() -replace '\.', '' -replace '\s', '' -replace '\(', '' -replace '\)', ''
                        $isValidSNo = ($sNoClean -ne "" -and -not ($sNoClean.ToUpper() -match 'SNO|SERIAL') -and $sNoClean[0] -ge '0' -and $sNoClean[0] -le '9')
                        
                        if ($isValidSNo -and $qText.Trim() -ne "") {
                            $qCount++
                            $writeRow = $qCount + 1
                            $wsHidden.Cells($writeRow, 1).Value2 = "Q$qCount"
                            $wsHidden.Cells($writeRow, 2).Value2 = $currentUnit
                            $wsHidden.Cells($writeRow, 3).Value2 = $currentPart
                            $wsHidden.Cells($writeRow, 4).Value2 = $currentMarks
                            $wsHidden.Cells($writeRow, 5).Value2 = $qText.Trim()
                            $wsHidden.Cells($writeRow, 6).Value2 = $klText.Trim()
                            $wsHidden.Cells($writeRow, 7).Value2 = $coText.Trim()
                            $wsHidden.Cells($writeRow, 8).Value2 = "No"
                            $wsHidden.Cells($writeRow, 9).Value2 = $tblIdx
                            $wsHidden.Cells($writeRow, 10).Value2 = $curRow
                            $wsHidden.Cells($writeRow, 11).Value2 = $false
                        }
                        $sNo = ""; $qText = ""; $klText = ""; $coText = ""
                    }
                    $curRow = $rIdx
                    switch ($cIdx) {
                        1 { $sNo   = $cellTxt }
                        2 { $qText = $cellTxt }
                        3 { $klText = $cellTxt }
                        4 { $coText = $cellTxt }
                    }
                }
                
                # Process last row in table
                if ($curRow -gt 0) {
                    $sNoClean = $sNo.Trim() -replace '\.', '' -replace '\s', '' -replace '\(', '' -replace '\)', ''
                    $isValidSNo = ($sNoClean -ne "" -and -not ($sNoClean.ToUpper() -match 'SNO|SERIAL') -and $sNoClean[0] -ge '0' -and $sNoClean[0] -le '9')
                    if ($isValidSNo -and $qText.Trim() -ne "") {
                        $qCount++
                        $writeRow = $qCount + 1
                        $wsHidden.Cells($writeRow, 1).Value2 = "Q$qCount"
                        $wsHidden.Cells($writeRow, 2).Value2 = $currentUnit
                        $wsHidden.Cells($writeRow, 3).Value2 = $currentPart
                        $wsHidden.Cells($writeRow, 4).Value2 = $currentMarks
                        $wsHidden.Cells($writeRow, 5).Value2 = $qText.Trim()
                        $wsHidden.Cells($writeRow, 6).Value2 = $klText.Trim()
                        $wsHidden.Cells($writeRow, 7).Value2 = $coText.Trim()
                        $wsHidden.Cells($writeRow, 8).Value2 = "No"
                        $wsHidden.Cells($writeRow, 9).Value2 = $tblIdx
                        $wsHidden.Cells($writeRow, 10).Value2 = $curRow
                        $wsHidden.Cells($writeRow, 11).Value2 = $false
                    }
                }
            }
        }
    }
    
    Write-Host "Imported $qCount questions to HiddenData."
    
    # Populate QB sheet via VBA
    $excel.Run("modImport.EnableSilentMode")
    $excel.Run("modImport.PopulateQuestionBankSheet")
    
    # Update Dashboard
    $wb.Sheets.Item("Dashboard").Range("B10").Value2 = "Successfully imported $qCount questions."
    $wb.Sheets.Item("Dashboard").Range("B12").Value2 = "0 / $qCount"
    
    $doc.Close($false)
    
    # Return summary
    Write-Host ""
    $partA = 0; $partB = 0; $partC = 0
    for ($r = 2; $r -le ($qCount + 1); $r++) {
        $part = ([string]($wsHidden.Cells($r, 3).Value2)).Trim()
        switch ($part) { "A" { $partA++ } "B" { $partB++ } "C" { $partC++ } }
    }
    Write-Host "Part A: $partA | Part B: $partB | Part C: $partC"
    
    # Return total count for caller
    return $qCount
}
catch {
    Write-Error "PS Import ERROR: $_"
    return 0
}
finally {
    try { $doc.Close($false) } catch {}
    try { $word.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
    
    try { $wb.Close($false) } catch {}
    try { $excel.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
}
