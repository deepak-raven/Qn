# Test if Word COM can be created from PS (to verify registration)
Write-Host "Testing Word COM creation..."
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    Write-Host "Word COM created successfully: Version $($word.Version)"
    
    # Open a file
    $doc = $word.Documents.Open("c:\guestion_genv1\QuestionBank.docx", $true)
    Write-Host "Document opened. Tables: $($doc.Tables.Count)"
    $doc.Close($false)
    
    $word.Quit()
    Write-Host "Word COM works correctly."
}
catch {
    Write-Error "Word COM FAILED: $_"
}
finally {
    if ($word) {
        try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
    }
}

# Now test Excel COM can create Word COM (simulating VBA's CreateObject)
Write-Host "`nTesting Excel-hosted VBA Word COM creation..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AutomationSecurity = 1

try {
    $wb = $excel.Workbooks.Open("c:\guestion_genv1\SmartQPGenerator.xlsm")
    
    # Write a simple test macro that just tries CreateObject("Word.Application") and reports
    $modImport = $wb.VBProject.VBComponents.Item("modImport")
    $cm = $modImport.CodeModule
    
    # Add a test sub at the end  
    $testCode = @"

Public Sub TestWordCOM()
    Dim wdApp As Object
    On Error GoTo WordError
    Set wdApp = CreateObject("Word.Application")
    Dim wsD As Worksheet
    Set wsD = ThisWorkbook.Sheets("Dashboard")
    wsD.Range("B10").Value = "Word COM OK: " & wdApp.Version
    wdApp.Quit
    Exit Sub
WordError:
    Dim wsD2 As Worksheet
    Set wsD2 = ThisWorkbook.Sheets("Dashboard")
    wsD2.Range("B10").Value = "Word COM FAILED: [" & Err.Number & "] " & Err.Description
End Sub
"@
    
    $cm.InsertLines($cm.CountOfLines + 1, $testCode)
    $wb.Save()
    
    # Call the test
    $excel.Run("modImport.TestWordCOM")
    
    $b10 = $wb.Sheets.Item("Dashboard").Range("B10").Value
    Write-Host "TestWordCOM result: $b10"
    
    $wb.Close($false)
}
catch {
    Write-Error "ERROR: $_"
}
finally {
    try { $excel.Quit() } catch {}
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
