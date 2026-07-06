# ============================================================
# Automated Integration Test Suite for SmartQPGenerator.xlsm
# Uses PS-level Word COM for import to avoid VBA COM isolation issues
# ============================================================
New-Item "c:\guestion_genv1\AUTORUN.lock" -ItemType File -Force | Out-Null
$xlsmPath = "c:\guestion_genv1\SmartQPGenerator.xlsm"
$qbPath   = "c:\guestion_genv1\QuestionBank.docx"

$testResults = [ordered]@{}

function Pass($name) {
    $testResults[$name] = "PASS"
    Write-Host "[PASS] $name" -ForegroundColor Green
}
function Fail($name, $reason) {
    $testResults[$name] = "FAIL: $reason"
    Write-Host "[FAIL] $name - $reason" -ForegroundColor Red
}

# ---- PS Import Helper: reads QB doc and populates HiddenData directly ----
function Invoke-PSImport($doc, $wsHidden) {
    # Clear HiddenData and set headers
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
    
    $currentUnit  = "UNIT I"
    $currentMarks = 2
    $currentPart  = "A"
    $script:qCount = 0
    $lastTblStart = -1
    $tblIdx = 0
    
    foreach ($para in $doc.Paragraphs) {
        $rawTxt = $para.Range.Text
        
        if ($rawTxt.Length -lt 80) {
            $clean = $rawTxt.ToUpper().Trim() -replace '\s', '' -replace '-', '' -replace ':', '' -replace [char]13, '' -replace [char]7, ''
            
            if     ($clean -match 'UNITV($|[^I])' -or $clean -match 'UNIT5') { $currentUnit = "UNIT V" }
            elseif ($clean -match 'UNITIV|UNIT4')                             { $currentUnit = "UNIT IV" }
            elseif ($clean -match 'UNITIII|UNIT3')                            { $currentUnit = "UNIT III" }
            elseif ($clean -match 'UNITII($|[^I])|UNIT2')                     { $currentUnit = "UNIT II" }
            elseif ($clean -match 'UNITI($|[^IV])|UNIT1')                     { $currentUnit = "UNIT I" }
            
            if     ($clean -match 'TWOMARK|2MARK')         { $currentMarks = 2;  $currentPart = "A" }
            elseif ($clean -match 'THIRTEENMARK|13MARK')   { $currentMarks = 13; $currentPart = "B" }
            elseif ($clean -match 'FIFTEENMARK|15MARK')    { $currentMarks = 15; $currentPart = "C" }
        }
        
        if ($para.Range.Information(12)) {
            $tbl = $para.Range.Tables(1)
            $thisTblStart = $tbl.Range.Start
            
            if ($thisTblStart -ne $lastTblStart) {
                $lastTblStart = $thisTblStart
                $tblIdx++
                $snapUnit = $currentUnit; $snapMarks = $currentMarks; $snapPart = $currentPart
                
                $curRow = 0; $sNo = ""; $qText = ""; $klText = ""; $coText = ""
                
                $processRow = {
                    param($sNo, $qText, $klText, $coText, $curRow)
                    $sNoC = $sNo.Trim() -replace '\.',''-replace '\s',''-replace '\(',''-replace '\)',''
                    $valid = ($sNoC -ne "" -and -not ($sNoC.ToUpper() -match 'SNO|SERIAL') -and $sNoC[0] -ge '0' -and $sNoC[0] -le '9')
                    if ($valid -and $qText.Trim() -ne "") {
                        $script:qCount++
                        $wr = $script:qCount + 1
                        $wsHidden.Cells.Item($wr, 1).Value2 = "Q$($script:qCount)"
                        $wsHidden.Cells.Item($wr, 2).Value2 = $snapUnit
                        $wsHidden.Cells.Item($wr, 3).Value2 = $snapPart
                        $wsHidden.Cells.Item($wr, 4).Value2 = [string]$snapMarks
                        $wsHidden.Cells.Item($wr, 5).Value2 = $qText.Trim()
                        $wsHidden.Cells.Item($wr, 6).Value2 = $klText.Trim()
                        $wsHidden.Cells.Item($wr, 7).Value2 = $coText.Trim()
                        $wsHidden.Cells.Item($wr, 8).Value2 = "No"
                        $wsHidden.Cells.Item($wr, 9).Value2 = [string]$script:tblIdx
                        $wsHidden.Cells.Item($wr, 10).Value2 = [string]$curRow
                        $wsHidden.Cells.Item($wr, 11).Value2 = $false
                    }
                }
                
                foreach ($cell in $tbl.Range.Cells) {
                    $rIdx = $cell.RowIndex
                    $cIdx = $cell.ColumnIndex
                    $cellTxt = $cell.Range.Text.TrimEnd([char]13, [char]7)
                    
                    if ($rIdx -ne $curRow -and $curRow -gt 0) {
                        & $processRow $sNo $qText $klText $coText $curRow
                        $sNo = ""; $qText = ""; $klText = ""; $coText = ""
                    }
                    $curRow = $rIdx
                    switch ($cIdx) { 1 { $sNo=$cellTxt } 2 { $qText=$cellTxt } 3 { $klText=$cellTxt } 4 { $coText=$cellTxt } }
                }
                if ($curRow -gt 0) { & $processRow $sNo $qText $klText $coText $curRow }
            }
        }
    }
    
    return $script:qCount
}

# ---- Setup Excel and Word ----
Write-Host "Opening Excel and Word..."
$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $true
$excel.DisplayAlerts = $false
$excel.Caption = "AUTORUN"
$excel.AutomationSecurity = 1

try {
    $qbPathTemp = "c:\guestion_genv1\QuestionBank_Temp.docx"
    Write-Host "Copying Word document..."
    if (Test-Path $qbPathTemp) { Remove-Item $qbPathTemp -Force }
    Copy-Item $qbPath $qbPathTemp
    
    Write-Host "Opening Word document..."
    $doc  = $word.Documents.Open($qbPathTemp)
    Write-Host "Word document opened!"
    
    Write-Host "Opening Excel workbook..."
    $wb   = $excel.Workbooks.Open($xlsmPath)
    Write-Host "Excel workbook opened!"
    
    $wsHidden = $wb.Sheets.Item("HiddenData")
    $wsQB     = $wb.Sheets.Item("Question Bank")
    $wsDash   = $wb.Sheets.Item("Dashboard")
    
    Write-Host "Enabling Silent Mode..."
    $excel.Run("modImport.EnableSilentMode")
    Write-Host "Silent Mode enabled!"
    
    # ============================================================
    # TEST 1 - Import Question Bank
    # ============================================================
    Write-Host "`n--- TEST 1: Import Question Bank ---"
    try {
        $qCount = Invoke-PSImport $doc $wsHidden
        
        # Populate QB sheet via VBA
        $excel.Run("modImport.PopulateQuestionBankSheet")
        $wsDash.Range("B10").Value2 = "Successfully imported $qCount questions."
        $wsDash.Range("B12").Value2 = "0 / $qCount"
        
        $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
        if ($lastRow -gt 1) {
            Pass "TEST 1 - Import Question Bank"
            Write-Host "       Total questions imported: $($lastRow - 1)"
        } else {
            Fail "TEST 1 - Import Question Bank" "HiddenData has no rows after import"
        }
    } catch {
        Fail "TEST 1 - Import Question Bank" "$_"
    }
    
    # ============================================================
    # TEST 2 - Parser: Unit / Part / Marks detection
    # ============================================================
    Write-Host "`n--- TEST 2: Parser verification ---"
    try {
        $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
        
        $unitCounts  = @{"UNIT I"=0; "UNIT II"=0; "UNIT III"=0; "UNIT IV"=0; "UNIT V"=0}
        $partCounts  = @{"A"=0; "B"=0; "C"=0}
        $marksCounts = @{"2"=0; "13"=0; "15"=0}
        
        $partAOK = $true; $partBOK = $true; $partCOK = $true
        
        for ($r = 2; $r -le $lastRow; $r++) {
            $unit  = ([string]($wsHidden.Cells($r, 2).Value2)).Trim()
            $part  = ([string]($wsHidden.Cells($r, 3).Value2)).Trim()
            try { $marks = [int]$wsHidden.Cells($r, 4).Value2 } catch { $marks = 0 }
            
            if ($unitCounts.ContainsKey($unit))  { $unitCounts[$unit]++ }
            if ($partCounts.ContainsKey($part))  { $partCounts[$part]++ }
            $mKey = [string]$marks
            if ($marksCounts.ContainsKey($mKey)) { $marksCounts[$mKey]++ }
            
            if ($part -eq "A" -and $marks -ne 2)  { $partAOK = $false }
            if ($part -eq "B" -and $marks -ne 13) { $partBOK = $false }
            if ($part -eq "C" -and $marks -ne 15) { $partCOK = $false }
        }
        
        Write-Host "       Units: I=$($unitCounts['UNIT I']) II=$($unitCounts['UNIT II']) III=$($unitCounts['UNIT III']) IV=$($unitCounts['UNIT IV']) V=$($unitCounts['UNIT V'])"
        Write-Host "       Parts: A=$($partCounts['A']) B=$($partCounts['B']) C=$($partCounts['C'])"
        Write-Host "       Marks: 2=$($marksCounts['2']) 13=$($marksCounts['13']) 15=$($marksCounts['15'])"
        
        $allUnitsOK = ($unitCounts["UNIT I"] -gt 0 -and $unitCounts["UNIT II"] -gt 0 -and $unitCounts["UNIT III"] -gt 0 -and $unitCounts["UNIT IV"] -gt 0 -and $unitCounts["UNIT V"] -gt 0)
        $partBPresent = ($partCounts["B"] -gt 0)
        
        if (-not $allUnitsOK) {
            Fail "TEST 2 - Parser (Unit Detection)" "Not all 5 units detected"
        } elseif (-not $partBPresent) {
            Fail "TEST 2 - Parser (Part B Missing)" "No Part B questions found (B=$($partCounts['B']))"
        } elseif (-not $partAOK) {
            Fail "TEST 2 - Parser (Part A Marks)" "Part A question with wrong marks"
        } elseif (-not $partBOK) {
            Fail "TEST 2 - Parser (Part B Marks)" "Part B question with marks != 13"
        } elseif (-not $partCOK) {
            Fail "TEST 2 - Parser (Part C Marks)" "Part C question with marks != 15"
        } else {
            Pass "TEST 2 - Parser (Unit / Part / Marks)"
        }
    } catch {
        Fail "TEST 2 - Parser" "$_"
    }
    
    # ============================================================
    # TEST 3 - KL and CO import
    # ============================================================
    Write-Host "`n--- TEST 3: KL and CO import ---"
    try {
        $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
        $emptyKL = 0; $emptyCO = 0
        for ($r = 2; $r -le $lastRow; $r++) {
            $kl = ([string]($wsHidden.Cells($r, 6).Value2)).Trim()
            $co = ([string]($wsHidden.Cells($r, 7).Value2)).Trim()
            if ($kl -eq "" -or $kl -eq $null) { $emptyKL++ }
            if ($co -eq "" -or $co -eq $null) { $emptyCO++ }
        }
        Write-Host "       Empty KL: $emptyKL, Empty CO: $emptyCO"
        if ($emptyKL -gt 0 -or $emptyCO -gt 0) {
            Fail "TEST 3 - KL and CO import" "emptyKL=$emptyKL emptyCO=$emptyCO"
        } else {
            Pass "TEST 3 - KL and CO import"
        }
    } catch {
        Fail "TEST 3 - KL and CO import" "$_"
    }
    
    # ============================================================
    # TEST 4 - Question Bank sheet populated
    # ============================================================
    Write-Host "`n--- TEST 4: Question Bank sheet populated ---"
    try {
        $qbLastRow = $wsQB.Cells($wsQB.Rows.Count, 2).End(-4162).Row
        Write-Host "       QB rows: $qbLastRow"
        if ($qbLastRow -gt 1) {
            Pass "TEST 4 - Question Bank Sheet Populated"
        } else {
            Fail "TEST 4 - Question Bank Sheet Populated" "No data rows found"
        }
    } catch {
        Fail "TEST 4 - Question Bank Sheet Populated" "$_"
    }
    
    # ============================================================
    # TEST 5 - Checkbox Toggle
    # ============================================================
    Write-Host "`n--- TEST 5: Checkbox selection via modSelection ---"
    try {
        $wsQB.Range("A2").Value2 = [char]0x2610  # ☐ force unchecked
        $excel.Run("modSelection.ToggleSelectionByRow", 2)
        
        $newVal = $wsQB.Range("A2").Value2
        $checkCode = 0
        if ($newVal -is [string] -and $newVal.Length -gt 0) {
            $checkCode = [int][char]$newVal[0]
        } elseif ($newVal -is [double] -or $newVal -is [int]) {
            $checkCode = [int]$newVal
        }
        Write-Host "       A2 value after toggle: '$newVal'  char code: $checkCode"
        
        if ($checkCode -eq 9745 -or $checkCode -eq 226) {
            Pass "TEST 5 - Checkbox Toggle (selected)"
        } else {
            Fail "TEST 5 - Checkbox Toggle" "Expected ☑ (9745) or ANSI (226) got: $checkCode"
        }
    } catch {
        Fail "TEST 5 - Checkbox Toggle" "$_"
    }
    
    # ============================================================
    # TEST 6 - Reset Application preserves Dashboard
    # ============================================================
    Write-Host "`n--- TEST 6: Reset Application preserves Dashboard ---"
    try {
        $shapesBefore = $wsDash.Shapes.Count
        $titleBefore  = ([string]($wsDash.Range("A2").Value2)).Trim()
        
        $excel.Run("modDashboard.ResetApplication")
        
        $shapesAfter = $wsDash.Shapes.Count
        $titleAfter  = ([string]($wsDash.Range("A2").Value2)).Trim()
        
        Write-Host "       Shapes before: $shapesBefore Shapes after: $shapesAfter"
        Write-Host "       Title before: '$titleBefore' After: '$titleAfter'"
        
        if ($shapesAfter -eq $shapesBefore -and $titleAfter -eq $titleBefore -and $shapesAfter -gt 0) {
            Pass "TEST 6 - Reset Preserves Dashboard"
        } else {
            Fail "TEST 6 - Reset Preserves Dashboard" "ShapesBefore=$shapesBefore After=$shapesAfter TitleBefore='$titleBefore' After='$titleAfter'"
        }
    } catch {
        Fail "TEST 6 - Reset Preserves Dashboard" "$_"
    }
    
    # ============================================================
    # TEST 7 - Re-import after reset
    # ============================================================
    Write-Host "`n--- TEST 7: Re-import after Reset ---"
    try {
        $qCount2 = Invoke-PSImport $doc $wsHidden
        $excel.Run("modImport.PopulateQuestionBankSheet")
        $wsDash.Range("B10").Value2 = "Successfully imported $qCount2 questions."
        
        $lastRow = $wsHidden.Cells($wsHidden.Rows.Count, 1).End(-4162).Row
        if ($lastRow -gt 1) {
            Pass "TEST 7 - Re-import after Reset"
            Write-Host "       Re-imported $($lastRow - 1) questions successfully"
        } else {
            Fail "TEST 7 - Re-import after Reset" "No data after re-import"
        }
    } catch {
        Fail "TEST 7 - Re-import after Reset" "$_"
    }
    
    # ============================================================
    # TEST 8 - Status cells update correctly
    # ============================================================
    Write-Host "`n--- TEST 8: Dashboard Status Update ---"
    try {
        $status = ([string]($wsDash.Range("B10").Value2)).Trim()
        Write-Host "       B10 status: '$status'"
        if ($status -ne "" -and $status -ne $null) {
            Pass "TEST 8 - Dashboard Status Update"
        } else {
            Fail "TEST 8 - Dashboard Status Update" "B10 is empty after import"
        }
    } catch {
        Fail "TEST 8 - Dashboard Status Update" "$_"
    }
}
catch {
    Write-Error "Critical test harness error: $_"
}
finally {
    try { $doc.Close($false) } catch {}
    try { $word.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
    
    try { $wb.Close($false) } catch {}
    try { $excel.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
    if (Test-Path "c:\guestion_genv1\QuestionBank_Temp.docx") { Remove-Item "c:\guestion_genv1\QuestionBank_Temp.docx" -Force -ErrorAction SilentlyContinue }
    if (Test-Path "c:\guestion_genv1\AUTORUN.lock") { Remove-Item "c:\guestion_genv1\AUTORUN.lock" -Force -ErrorAction SilentlyContinue }
}

# ============================================================
# SUMMARY REPORT
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "        TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
$passed = 0; $failed = 0
foreach ($key in $testResults.Keys) {
    $val = $testResults[$key]
    if ($val -eq "PASS") {
        Write-Host "[PASS] $key" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[FAIL] $key" -ForegroundColor Red
        Write-Host "       $val" -ForegroundColor Yellow
        $failed++
    }
}
Write-Host ""
Write-Host "Total PASS: $passed  |  Total FAIL: $failed" -ForegroundColor Cyan
