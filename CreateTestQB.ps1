# PowerShell script to create a mock QuestionBank.docx via Word COM
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0 # wdAlertsNone = 0

try {
    Write-Host "Creating new Word document..."
    $doc = $word.Documents.Add()
    
    # Helper to add headings
    function Add-Para($text, $bold=$false, $size=11) {
        $p = $doc.Paragraphs.Add()
        $p.Range.Text = $text
        $p.Range.Font.Name = "Arial"
        $p.Range.Font.Size = $size
        $p.Range.Font.Bold = $bold
        $p.Range.InsertParagraphAfter()
    }
    
    # Helper to add question table
    function Add-Table($rows, $cols, $data) {
        # Select end range
        $rng = $doc.Paragraphs.Last.Range
        $tbl = $doc.Tables.Add($rng, $rows, $cols)
        $tbl.Borders.Enable = $true
        
        # Add header
        $tbl.Cell(1, 1).Range.Text = "S. No"
        $tbl.Cell(1, 2).Range.Text = "Question"
        $tbl.Cell(1, 3).Range.Text = "Knowledge Level"
        $tbl.Cell(1, 4).Range.Text = "Course Outcome"
        if ($cols -eq 5) {
            $tbl.Cell(1, 5).Range.Text = "Select"
        }
        
        # Add data
        for ($r = 2; $r -le $rows; $r++) {
            $row_data = $data[$r-2]
            for ($c = 1; $c -le $cols; $c++) {
                $tbl.Cell($r, $c).Range.Text = $row_data[$c-1]
            }
        }
        
        # Add a trailing paragraph to split from the next table/heading
        $doc.Paragraphs.Add() | Out-Null
    }
    
    # Write Title
    Add-Para "JAYA ENGINEERING COLLEGE" $true 14
    Add-Para "QUESTION BANK (AY:2025-2026) ODD SEMESTER" $true 12
    Add-Para "Subject Code: OCS353   Subject: Data Science fundamentals" $true 10
    
    # Write Units and Questions
    for ($u = 1; $u -le 5; $u++) {
        $roman = @("", "I", "II", "III", "IV", "V")[$u]
        Add-Para "UNIT $roman - SYLLABUS DETAIL FOR UNIT $roman" $true 12
        
        # Part A (Two Marks Questions)
        Add-Para "Two Marks Questions" $true 11
        $partA_data = @()
        for ($q = 1; $q -le 4; $q++) {
            $partA_data += ,@("$q", "This is Unit $roman Part A question number $q text.", "K1", "CO$u", "☐")
        }
        Add-Table 5 5 $partA_data
        
        # Part B (Thirteen Marks Questions)
        Add-Para "Thirteen Marks Questions" $true 11
        $partB_data = @()
        for ($q = 1; $q -le 2; $q++) {
            $partB_data += ,@("$q", "This is Unit $roman Part B question number $q text with details.", "K2", "CO$u", "☐")
        }
        Add-Table 3 5 $partB_data
    }
    
    # Part C (Fifteen Marks Questions) at the end
    Add-Para "Fifteen Marks Questions" $true 11
    $partC_data = @()
    for ($q = 1; $q -le 2; $q++) {
        $partC_data += ,@("$q", "This is Part C case study question $q text.", "K3", "CO4", "☐")
    }
    Add-Table 3 5 $partC_data
    
    $outputPath = "c:\guestion_genv1\QuestionBank.docx"
    Write-Host "Saving document to $outputPath..."
    $doc.SaveAs2($outputPath)
    $doc.Close()
    Write-Host "SUCCESS: QuestionBank.docx created successfully!"
}
catch {
    Write-Error "Failed to create test QuestionBank.docx: $_"
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
