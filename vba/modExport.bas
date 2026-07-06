Attribute VB_Name = "modExport"
Option Explicit

' Generates the final QuestionPaper.docx and QuestionPaper.pdf
Public Sub ExportQuestionPaper()
    Dim wsHidden As Worksheet
    Dim wsDash As Worksheet
    Dim qbPath As String
    Dim tmplPath As String
    Dim outDir As String
    Dim wdApp As Object
    Dim qpDoc As Object
    Dim qbDoc As Object
    
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    Set wsDash = ThisWorkbook.Sheets("Dashboard")
    
    ' Perform validation first
    modValidation.ValidateSelections
    
    ' Check validation status
    Dim isError As Boolean
    Dim statusVal As String
    statusVal = wsDash.Range("B14").Value
    
    If InStr(statusVal, "Warning") > 0 Then
        Dim ans As VbMsgBoxResult
        ans = MsgBox("Validation checks failed. Do you still want to generate the question paper?", vbYesNo + vbExclamation, "Validation Failures Detected")
        If ans = vbNo Then Exit Sub
    End If
    
    ' Read settings
    qbPath = modSettings.GetSettingValue("Question Bank Path")
    tmplPath = modSettings.GetSettingValue("Template Path")
    outDir = modSettings.GetSettingValue("Output Folder")
    
    If qbPath = "" Or Dir(qbPath) = "" Then
        MsgBox "Please import a valid Question Bank Word document first.", vbCritical, "Missing Question Bank"
        Exit Sub
    End If
    
    ' Handle missing template
    If tmplPath = "" Or Dir(tmplPath) = "" Then
        Dim createDefault As VbMsgBoxResult
        createDefault = MsgBox("No template file set or template not found. Would you like to create a default template file in the output folder?", vbYesNo + vbQuestion, "Create Template File")
        If createDefault = vbYes Then
            tmplPath = outDir & "\QuestionPaper_Template.docx"
            CreateDefaultTemplate tmplPath
            modSettings.SetSettingValue "Template Path", tmplPath
        Else
            Exit Sub
        End If
    End If
    
    On Error GoTo ErrorHandler
    
    SpeedUp True
    wsDash.Range("B10").Value = "Generating Question Paper Word Document... Please wait."
    DoEvents
    
    ' Setup output file paths
    Dim subCode As String
    subCode = modSettings.GetSettingValue("Subject Code")
    If subCode = "" Then subCode = "EXAM"
    
    Dim docPath As String, pdfPath As String
    docPath = outDir & "\QuestionPaper_" & subCode & "_" & Format(Now, "yyyymmdd_hhmmss") & ".docx"
    pdfPath = outDir & "\QuestionPaper_" & subCode & "_" & Format(Now, "yyyymmdd_hhmmss") & ".pdf"
    
    ' Copy template to output path
    FileCopy tmplPath, docPath
    
    ' Open Word COM
    Set wdApp = CreateObject("Word.Application")
    wdApp.Visible = False
    
    ' Open document copies
    Set qbDoc = wdApp.Documents.Open(qbPath, ReadOnly:=True)
    Set qpDoc = wdApp.Documents.Open(docPath)
    
    ' Replace header placeholders in the template
    ReplacePlaceholders qpDoc
    
    ' Build Question Lists in the template tables
    PopulateExamTables qbDoc, qpDoc, wsHidden
    
    ' Populate Table of Specifications
    PopulateSpecTables qpDoc, wsHidden
    
    ' Save changes
    qpDoc.Save
    
    ' Export PDF
    wsDash.Range("B10").Value = "Exporting PDF... Please wait."
    DoEvents
    
    ' Use Word ExportAsFixedFormat
    ' wdExportFormatPDF = 17, wdExportOptimizeForPrint = 0, wdExportAllDocument = 0
    qpDoc.ExportAsFixedFormat OutputFileName:=pdfPath, ExportFormat:=17, OpenAfterExport:=False, OptimizeFor:=0, Range:=0
    
    ' Close documents
    qpDoc.Close SaveChanges:=True
    qbDoc.Close SaveChanges:=False
    wdApp.Quit
    
    Set qpDoc = Nothing
    Set qbDoc = Nothing
    Set wdApp = Nothing
    
    SpeedUp False
    wsDash.Range("B10").Value = "Generated files: " & Mid(docPath, InStrRev(docPath, "\") + 1) & " and " & Mid(pdfPath, InStrRev(pdfPath, "\") + 1)
    
    MsgBox "Question paper generated successfully!" & vbCrLf & vbCrLf & _
           "Word: " & docPath & vbCrLf & _
           "PDF: " & pdfPath, vbInformation, "Generation Completed"
    Exit Sub
    
CleanUp:
    On Error Resume Next
    If Not qpDoc Is Nothing Then qpDoc.Close SaveChanges:=False
    If Not qbDoc Is Nothing Then qbDoc.Close SaveChanges:=False
    If Not wdApp Is Nothing Then wdApp.Quit
    SpeedUp False
    Exit Sub

ErrorHandler:
    SpeedUp False
    MsgBox "An error occurred during generation:" & vbCrLf & Err.Description, vbCritical, "Generation Error"
    Resume CleanUp
End Sub

' Helper to replace string placeholders in a Word Document
Private Sub ReplacePlaceholders(ByVal doc As Object)
    Dim keys(1 To 13) As String
    Dim vals(1 To 13) As String
    
    keys(1) = "{{INSTITUTION}}"
    vals(1) = modSettings.GetSettingValue("Institution Name")
    
    keys(2) = "{{AFFILIATION}}"
    vals(2) = modSettings.GetSettingValue("Affiliation & Accreditation")
    
    keys(3) = "{{ADDRESS}}"
    vals(3) = modSettings.GetSettingValue("Address")
    
    keys(4) = "{{CONTACT}}"
    vals(4) = modSettings.GetSettingValue("Contact Info")
    
    keys(5) = "{{DEPARTMENT}}"
    vals(5) = modSettings.GetSettingValue("Department")
    
    keys(6) = "{{SUB_CODE}}"
    vals(6) = modSettings.GetSettingValue("Subject Code")
    
    keys(7) = "{{SUB_NAME}}"
    vals(7) = modSettings.GetSettingValue("Subject Name")
    
    keys(8) = "{{REGULATION}}"
    vals(8) = modSettings.GetSettingValue("Regulation")
    
    keys(9) = "{{YEAR_SEM}}"
    vals(9) = modSettings.GetSettingValue("Year/Sem")
    
    keys(10) = "{{BRANCH}}"
    vals(10) = modSettings.GetSettingValue("Degree/Branch/Sem")
    
    keys(11) = "{{DATE}}"
    vals(11) = modSettings.GetSettingValue("Exam Date")
    
    keys(12) = "{{TIME}}"
    vals(12) = modSettings.GetSettingValue("Time Limit")
    
    keys(13) = "{{MAX_MARKS}}"
    vals(13) = modSettings.GetSettingValue("Maximum Marks")
    
    Dim i As Long
    Dim selObj As Object
    Set selObj = doc.Content.Find
    
    For i = 1 To 13
        selObj.ClearFormatting
        selObj.Replacement.ClearFormatting
        selObj.Text = keys(i)
        selObj.Replacement.Text = vals(i)
        ' wdReplaceAll = 2
        selObj.Execute Replace:=2
    Next i
End Sub

' Core engine to write selected questions from QuestionBank.docx into QuestionPaper template tables
Private Sub PopulateExamTables(ByVal qbDoc As Object, ByVal qpDoc As Object, ByVal wsHidden As Worksheet)
    Dim lastRowHidden As Long
    lastRowHidden = GetLastRow(wsHidden, 1)
    
    Dim qArr() As Variant
    qArr = wsHidden.Range("A1:K" & lastRowHidden).Value
    
    Dim tblA As Object, tblB As Object, tblC As Object
    ' The template has tables:
    ' Table 1: Header metadata
    ' Table 2: Part A
    ' Table 3: Part B
    ' Table 4: Part C
    Set tblA = qpDoc.Tables(2)
    Set tblB = qpDoc.Tables(3)
    Set tblC = qpDoc.Tables(4)
    
    ' Populate Part A
    Dim qNum As Long
    qNum = 1
    
    Dim u As Long, i As Long
    For u = 1 To 5
        Dim unitStr As String
        unitStr = Choose(u, "UNIT I", "UNIT II", "UNIT III", "UNIT IV", "UNIT V")
        
        For i = 2 To UBound(qArr, 1)
            If qArr(i, 11) = True And qArr(i, 3) = "A" And qArr(i, 2) = unitStr Then
                ' Insert row in Word table
                Dim newRow As Object
                Set newRow = tblA.Rows.Add()
                
                newRow.Cells(1).Range.Text = qNum & "."
                newRow.Cells(1).Range.ParagraphFormat.Alignment = 1 ' Center
                
                ' Copy original cell range and paste it
                CopyWordCellContent qbDoc, CInt(qArr(i, 9)), CInt(qArr(i, 10)), newRow.Cells(2)
                
                newRow.Cells(3).Range.Text = qArr(i, 6) ' KL
                newRow.Cells(3).Range.ParagraphFormat.Alignment = 1
                
                newRow.Cells(4).Range.Text = qArr(i, 7) ' CO
                newRow.Cells(4).Range.ParagraphFormat.Alignment = 1
                
                qNum = qNum + 1
            End If
        Next i
    Next u
    
    ' Populate Part B
    qNum = 11
    For u = 1 To 5
        unitStr = Choose(u, "UNIT I", "UNIT II", "UNIT III", "UNIT IV", "UNIT V")
        
        Dim selIdx As Collection
        Set selIdx = New Collection
        For i = 2 To UBound(qArr, 1)
            If qArr(i, 11) = True And qArr(i, 3) = "B" And qArr(i, 2) = unitStr Then
                selIdx.Add i
            End If
        Next i
        
        If selIdx.Count >= 2 Then
            ' (a) question row
            Set newRow = tblB.Rows.Add()
            newRow.Cells(1).Range.Text = qNum & ". a"
            newRow.Cells(1).Range.ParagraphFormat.Alignment = 1
            CopyWordCellContent qbDoc, CInt(qArr(selIdx(1), 9)), CInt(qArr(selIdx(1), 10)), newRow.Cells(2)
            newRow.Cells(3).Range.Text = qArr(selIdx(1), 6)
            newRow.Cells(3).Range.ParagraphFormat.Alignment = 1
            newRow.Cells(4).Range.Text = qArr(selIdx(1), 7)
            newRow.Cells(4).Range.ParagraphFormat.Alignment = 1
            
            ' (OR) row
            Set newRow = tblB.Rows.Add()
            newRow.Cells(1).Range.Text = ""
            newRow.Cells(2).Range.Text = "(OR)"
            newRow.Cells(2).Range.Font.Italic = True
            newRow.Cells(2).Range.Font.Bold = True
            newRow.Cells(2).Range.ParagraphFormat.Alignment = 1
            
            ' (b) question row
            Set newRow = tblB.Rows.Add()
            newRow.Cells(1).Range.Text = "b"
            newRow.Cells(1).Range.ParagraphFormat.Alignment = 1
            CopyWordCellContent qbDoc, CInt(qArr(selIdx(2), 9)), CInt(qArr(selIdx(2), 10)), newRow.Cells(2)
            newRow.Cells(3).Range.Text = qArr(selIdx(2), 6)
            newRow.Cells(3).Range.ParagraphFormat.Alignment = 1
            newRow.Cells(4).Range.Text = qArr(selIdx(2), 7)
            newRow.Cells(4).Range.ParagraphFormat.Alignment = 1
        End If
        qNum = qNum + 1
    Next u
    
    ' Populate Part C
    qNum = 16
    Dim selIdxC As Collection
    Set selIdxC = New Collection
    For i = 2 To UBound(qArr, 1)
        If qArr(i, 11) = True And qArr(i, 3) = "C" Then
            selIdxC.Add i
        End If
    Next i
    
    If selIdxC.Count >= 2 Then
        ' (a) question row
        Set newRow = tblC.Rows.Add()
        newRow.Cells(1).Range.Text = qNum & ". a"
        newRow.Cells(1).Range.ParagraphFormat.Alignment = 1
        CopyWordCellContent qbDoc, CInt(qArr(selIdxC(1), 9)), CInt(qArr(selIdxC(1), 10)), newRow.Cells(2)
        newRow.Cells(3).Range.Text = qArr(selIdxC(1), 6)
        newRow.Cells(3).Range.ParagraphFormat.Alignment = 1
        newRow.Cells(4).Range.Text = qArr(selIdxC(1), 7)
        newRow.Cells(4).Range.ParagraphFormat.Alignment = 1
        
        ' (OR) row
        Set newRow = tblC.Rows.Add()
        newRow.Cells(1).Range.Text = ""
        newRow.Cells(2).Range.Text = "(OR)"
        newRow.Cells(2).Range.Font.Italic = True
        newRow.Cells(2).Range.Font.Bold = True
        newRow.Cells(2).Range.ParagraphFormat.Alignment = 1
        
        ' (b) question row
        Set newRow = tblC.Rows.Add()
        newRow.Cells(1).Range.Text = "b"
        newRow.Cells(1).Range.ParagraphFormat.Alignment = 1
        CopyWordCellContent qbDoc, CInt(qArr(selIdxC(2), 9)), CInt(qArr(selIdxC(2), 10)), newRow.Cells(2)
        newRow.Cells(3).Range.Text = qArr(selIdxC(2), 6)
        newRow.Cells(3).Range.ParagraphFormat.Alignment = 1
        newRow.Cells(4).Range.Text = qArr(selIdxC(2), 7)
        newRow.Cells(4).Range.ParagraphFormat.Alignment = 1
    End If
End Sub

' Helper to copy rich formatted cell content (excluding cell end markers) from the source to target Word cell
Private Sub CopyWordCellContent(ByVal qbDoc As Object, ByVal tblIndex As Long, ByVal rowIndex As Long, ByVal targetCell As Object)
    On Error Resume Next
    Dim srcRange As Object
    Set srcRange = qbDoc.Tables(tblIndex).Cell(rowIndex, 2).Range
    
    ' Reduce the range end by 1 to exclude the cell marker
    srcRange.End = srcRange.End - 1
    
    ' Copy to clipboard
    srcRange.Copy
    
    ' Paste into the target cell range
    targetCell.Range.Paste
    On Error GoTo 0
End Sub

' Writes specification table counts into Tables 5 and 6 in the generated document
Private Sub PopulateSpecTables(ByVal qpDoc As Object, ByVal wsHidden As Worksheet)
    Dim lastRowHidden As Long
    lastRowHidden = GetLastRow(wsHidden, 1)
    
    Dim qArr() As Variant
    qArr = wsHidden.Range("A1:K" & lastRowHidden).Value
    
    Dim tblSpecQ As Object, tblSpecM As Object
    ' Table 5: Question-wise Specification Table
    ' Table 6: Marks-wise Specification Table
    Set tblSpecQ = qpDoc.Tables(5)
    Set tblSpecM = qpDoc.Tables(6)
    
    ' Initialize counter matrices
    Dim qCount(1 To 5, 1 To 6) As Long
    Dim mCount(1 To 5, 1 To 6) As Long
    
    Dim i As Long, u As Long, k As Long
    For i = 2 To UBound(qArr, 1)
        If qArr(i, 11) = True Then ' Selected
            Dim uNum As Long, kNum As Long, marks As Long
            
            ' Unit index
            Select Case qArr(i, 2)
                Case "UNIT I": uNum = 1
                Case "UNIT II": uNum = 2
                Case "UNIT III": uNum = 3
                Case "UNIT IV": uNum = 4
                Case "UNIT V": uNum = 5
            End Select
            
            ' KL index
            kNum = Val(Replace(qArr(i, 6), "K", ""))
            marks = Val(qArr(i, 4))
            
            If uNum >= 1 And uNum <= 5 And kNum >= 1 And kNum <= 6 Then
                qCount(uNum, kNum) = qCount(uNum, kNum) + 1
                mCount(uNum, kNum) = mCount(uNum, kNum) + marks
            End If
        End If
    Next i
    
    ' Populate Question-wise table cells
    ' Rows 2 to 6 of Table 5 are for Units I to V, Cols 2 to 7 are K1 to K6
    Dim rTotalQ(1 To 6) As Long, rowSumQ As Long
    For u = 1 To 5
        rowSumQ = 0
        For k = 1 To 6
            Dim cellVal As String
            cellVal = IIf(qCount(u, k) = 0, "-", CStr(qCount(u, k)))
            tblSpecQ.Cell(u + 1, k + 1).Range.Text = cellVal
            tblSpecQ.Cell(u + 1, k + 1).Range.ParagraphFormat.Alignment = 1
            rowSumQ = rowSumQ + qCount(u, k)
            rTotalQ(k) = rTotalQ(k) + qCount(u, k)
        Next k
        tblSpecQ.Cell(u + 1, 8).Range.Text = CStr(rowSumQ)
        tblSpecQ.Cell(u + 1, 8).Range.ParagraphFormat.Alignment = 1
    Next u
    
    ' Total row in Q Table
    Dim grandTotalQ As Long
    grandTotalQ = 0
    For k = 1 To 6
        tblSpecQ.Cell(7, k + 1).Range.Text = CStr(rTotalQ(k))
        tblSpecQ.Cell(7, k + 1).Range.ParagraphFormat.Alignment = 1
        grandTotalQ = grandTotalQ + rTotalQ(k)
    Next k
    tblSpecQ.Cell(7, 8).Range.Text = CStr(grandTotalQ)
    tblSpecQ.Cell(7, 8).Range.ParagraphFormat.Alignment = 1
    
    ' Populate Marks-wise table cells
    Dim rTotalM(1 To 6) As Long, rowSumM As Long
    For u = 1 To 5
        rowSumM = 0
        For k = 1 To 6
            cellVal = IIf(mCount(u, k) = 0, "-", CStr(mCount(u, k)))
            tblSpecM.Cell(u + 1, k + 1).Range.Text = cellVal
            tblSpecM.Cell(u + 1, k + 1).Range.ParagraphFormat.Alignment = 1
            rowSumM = rowSumM + mCount(u, k)
            rTotalM(k) = rTotalM(k) + mCount(u, k)
        Next k
        tblSpecM.Cell(u + 1, 8).Range.Text = CStr(rowSumM)
        tblSpecM.Cell(u + 1, 8).Range.ParagraphFormat.Alignment = 1
    Next u
    
    ' Total row in Marks Table
    Dim grandTotalM As Long
    grandTotalM = 0
    For k = 1 To 6
        tblSpecM.Cell(7, k + 1).Range.Text = CStr(rTotalM(k))
        tblSpecM.Cell(7, k + 1).Range.ParagraphFormat.Alignment = 1
        grandTotalM = grandTotalM + rTotalM(k)
    Next k
    tblSpecM.Cell(7, 8).Range.Text = CStr(grandTotalM)
    tblSpecM.Cell(7, 8).Range.ParagraphFormat.Alignment = 1
End Sub

' Generates the official blank template document programmatically to ensure layout never drifts
Public Sub CreateDefaultTemplate(ByVal filePath As String)
    Dim wdApp As Object
    Dim doc As Object
    
    Set wdApp = CreateObject("Word.Application")
    wdApp.Visible = False
    
    ' Create a new blank document
    Set doc = wdApp.Documents.Add
    
    ' Page Setup
    With doc.PageSetup
        .TopMargin = wdApp.InchesToPoints(0.8)
        .BottomMargin = wdApp.InchesToPoints(0.8)
        .LeftMargin = wdApp.InchesToPoints(0.8)
        .RightMargin = wdApp.InchesToPoints(0.8)
    End With
    
    ' Apply clean margins and paragraph settings
    Dim p As Object
    
    ' --- Table 1: Header/metadata table ---
    Dim metaTbl As Object
    Set metaTbl = doc.Tables.Add(Range:=doc.Range(0, 0), NumRows:=5, NumColumns:=2)
    metaTbl.Borders.Enable = True
    
    ' Merge Row 1 to Row 4 for Institution header
    metaTbl.Cell(1, 1).Merge MergeTo:=metaTbl.Cell(3, 2)
    metaTbl.Cell(1, 1).Range.Text = "{{INSTITUTION}}" & vbCr & "{{AFFILIATION}}" & vbCr & "{{ADDRESS}}" & vbCr & "{{CONTACT}}"
    metaTbl.Cell(1, 1).Range.ParagraphFormat.Alignment = 1 ' Center
    metaTbl.Cell(1, 1).Range.Font.Name = "Arial"
    metaTbl.Cell(1, 1).Range.Font.Size = 11
    metaTbl.Cell(1, 1).Range.Font.Bold = True
    
    ' Row 4
    metaTbl.Cell(2, 1).Range.Text = "MODEL EXAMINATION" & vbCr & "({{REGULATION}}-Regulation)" & vbCr & "ODD SEMESTER-2025-26"
    metaTbl.Cell(2, 1).Range.Font.Name = "Arial"
    metaTbl.Cell(2, 1).Range.Font.Size = 10
    metaTbl.Cell(2, 1).Range.Font.Bold = True
    metaTbl.Cell(2, 1).Range.ParagraphFormat.Alignment = 1
    
    metaTbl.Cell(2, 2).Range.Text = "Date: {{DATE}}"
    metaTbl.Cell(2, 2).Range.Font.Name = "Arial"
    metaTbl.Cell(2, 2).Range.Font.Size = 10
    metaTbl.Cell(2, 2).Range.Font.Bold = True
    metaTbl.Cell(2, 2).Range.ParagraphFormat.Alignment = 1
    
    ' Row 5
    metaTbl.Cell(3, 1).Range.Text = "Sub. Code/Sub. Name: {{SUB_CODE}} / {{SUB_NAME}}"
    metaTbl.Cell(3, 1).Range.Font.Name = "Arial"
    metaTbl.Cell(3, 1).Range.Font.Size = 9
    metaTbl.Cell(3, 1).Range.Font.Bold = True
    
    metaTbl.Cell(3, 2).Range.Text = "Degree/Branch/Sem: {{BRANCH}} / {{YEAR_SEM}}"
    metaTbl.Cell(3, 2).Range.Font.Name = "Arial"
    metaTbl.Cell(3, 2).Range.Font.Size = 9
    metaTbl.Cell(3, 2).Range.Font.Bold = True
    
    ' Row 6
    metaTbl.Cell(4, 1).Range.Text = "Time: {{TIME}}"
    metaTbl.Cell(4, 1).Range.Font.Name = "Arial"
    metaTbl.Cell(4, 1).Range.Font.Size = 9
    metaTbl.Cell(4, 1).Range.Font.Bold = True
    
    metaTbl.Cell(4, 2).Range.Text = "Maximum Marks: {{MAX_MARKS}}"
    metaTbl.Cell(4, 2).Range.Font.Name = "Arial"
    metaTbl.Cell(4, 2).Range.Font.Size = 9
    metaTbl.Cell(4, 2).Range.Font.Bold = True
    
    ' Add Spacing after Table
    Set p = doc.Paragraphs.Add
    p.Range.Text = ""
    p.Range.InsertParagraphAfter
    
    ' --- PART A Heading ---
    Set p = doc.Paragraphs.Add
    p.Range.Text = "PART - A (10 x 2 = 20 Marks)"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 11
    p.Range.Font.Bold = True
    p.Range.ParagraphFormat.Alignment = 1 ' Center
    p.Range.InsertParagraphAfter
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = "Answer ALL the questions"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 9
    p.Range.Font.Italic = True
    p.Range.ParagraphFormat.Alignment = 1 ' Center
    p.Range.InsertParagraphAfter
    
    ' --- Table 2: Part A Table ---
    Dim tblA As Object
    Set tblA = doc.Tables.Add(Range:=doc.Paragraphs.Last.Range, NumRows:=1, NumColumns:=4)
    tblA.Borders.Enable = True
    tblA.Cell(1, 1).Range.Text = "Q.No"
    tblA.Cell(1, 2).Range.Text = "Questions"
    tblA.Cell(1, 3).Range.Text = "KL"
    tblA.Cell(1, 4).Range.Text = "CO"
    FormatWordTableHeader tblA
    
    ' Add Spacer Paragraphs
    Set p = doc.Paragraphs.Add
    p.Range.Text = ""
    p.Range.InsertParagraphAfter
    
    ' --- PART B Heading ---
    Set p = doc.Paragraphs.Add
    p.Range.Text = "PART - B (5 x 13 = 65 Marks)"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 11
    p.Range.Font.Bold = True
    p.Range.ParagraphFormat.Alignment = 1
    p.Range.InsertParagraphAfter
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = "Answer ALL the questions"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 9
    p.Range.Font.Italic = True
    p.Range.ParagraphFormat.Alignment = 1
    p.Range.InsertParagraphAfter
    
    ' --- Table 3: Part B Table ---
    Dim tblB As Object
    Set tblB = doc.Tables.Add(Range:=doc.Paragraphs.Last.Range, NumRows:=1, NumColumns:=4)
    tblB.Borders.Enable = True
    tblB.Cell(1, 1).Range.Text = "Q.No"
    tblB.Cell(1, 2).Range.Text = "Questions"
    tblB.Cell(1, 3).Range.Text = "KL"
    tblB.Cell(1, 4).Range.Text = "CO"
    FormatWordTableHeader tblB
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = ""
    p.Range.InsertParagraphAfter
    
    ' --- PART C Heading ---
    Set p = doc.Paragraphs.Add
    p.Range.Text = "PART - C (1 x 15 = 15 Marks)"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 11
    p.Range.Font.Bold = True
    p.Range.ParagraphFormat.Alignment = 1
    p.Range.InsertParagraphAfter
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = "Answer ALL the questions"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 9
    p.Range.Font.Italic = True
    p.Range.ParagraphFormat.Alignment = 1
    p.Range.InsertParagraphAfter
    
    ' --- Table 4: Part C Table ---
    Dim tblC As Object
    Set tblC = doc.Tables.Add(Range:=doc.Paragraphs.Last.Range, NumRows:=1, NumColumns:=4)
    tblC.Borders.Enable = True
    tblC.Cell(1, 1).Range.Text = "Q.No"
    tblC.Cell(1, 2).Range.Text = "Questions"
    tblC.Cell(1, 3).Range.Text = "KL"
    tblC.Cell(1, 4).Range.Text = "CO"
    FormatWordTableHeader tblC
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = ""
    p.Range.InsertParagraphAfter
    
    ' Page Break for Tables of Specifications
    doc.Paragraphs.Last.Range.InsertBreak Type:=7 ' wdPageBreak = 7
    
    ' --- Spec Table Question Heading ---
    Set p = doc.Paragraphs.Add
    p.Range.Text = "Table of Specifications (Question - Wise)"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 11
    p.Range.Font.Bold = True
    p.Range.ParagraphFormat.Alignment = 1
    p.Range.InsertParagraphAfter
    
    ' --- Table 5: Spec Table Questions ---
    Dim tblSpecQ As Object
    Set tblSpecQ = doc.Tables.Add(Range:=doc.Paragraphs.Last.Range, NumRows:=7, NumColumns:=8)
    tblSpecQ.Borders.Enable = True
    
    tblSpecQ.Cell(1, 1).Range.Text = "SYLLABUS"
    tblSpecQ.Cell(1, 1).Range.Font.Bold = True
    tblSpecQ.Cell(1, 1).Range.ParagraphFormat.Alignment = 1
    
    tblSpecQ.Cell(1, 2).Merge MergeTo:=tblSpecQ.Cell(1, 7)
    tblSpecQ.Cell(1, 2).Range.Text = "No. Of Questions"
    tblSpecQ.Cell(1, 2).Range.Font.Bold = True
    tblSpecQ.Cell(1, 2).Range.ParagraphFormat.Alignment = 1
    
    tblSpecQ.Cell(1, 3).Range.Text = "Total"
    tblSpecQ.Cell(1, 3).Range.Font.Bold = True
    tblSpecQ.Cell(1, 3).Range.ParagraphFormat.Alignment = 1
    
    ' Second row headers (We need to split row 2 first)
    tblSpecQ.Rows.Add BeforeRow:=tblSpecQ.Rows(2)
    tblSpecQ.Cell(2, 1).Range.Text = "Unit"
    tblSpecQ.Cell(2, 1).Range.Font.Bold = True
    
    tblSpecQ.Cell(2, 2).Range.Text = "K1" & vbCr & "Remembering"
    tblSpecQ.Cell(2, 3).Range.Text = "K2" & vbCr & "Understanding"
    tblSpecQ.Cell(2, 4).Range.Text = "K3" & vbCr & "Applying"
    tblSpecQ.Cell(2, 5).Range.Text = "K4" & vbCr & "Analysing"
    tblSpecQ.Cell(2, 6).Range.Text = "K5" & vbCr & "Evaluating"
    tblSpecQ.Cell(2, 7).Range.Text = "K6" & vbCr & "Creating"
    tblSpecQ.Cell(2, 8).Range.Text = "Total"
    
    Dim c As Long
    For c = 1 To 8
        tblSpecQ.Cell(2, c).Range.Font.Bold = True
        tblSpecQ.Cell(2, c).Range.Font.Size = 9
        tblSpecQ.Cell(2, c).Range.ParagraphFormat.Alignment = 1
    Next c
    
    ' Populate first column units
    Dim u As Long
    For u = 1 To 5
        tblSpecQ.Cell(2 + u, 1).Range.Text = Choose(u, "I", "II", "III", "IV", "V")
        tblSpecQ.Cell(2 + u, 1).Range.Font.Bold = True
        tblSpecQ.Cell(2 + u, 1).Range.ParagraphFormat.Alignment = 1
    Next u
    tblSpecQ.Cell(8, 1).Range.Text = "Total"
    tblSpecQ.Cell(8, 1).Range.Font.Bold = True
    tblSpecQ.Cell(8, 1).Range.ParagraphFormat.Alignment = 1
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = ""
    p.Range.InsertParagraphAfter
    
    ' --- Spec Table Marks Heading ---
    Set p = doc.Paragraphs.Add
    p.Range.Text = "Table of Specifications (Marks - Wise)"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 11
    p.Range.Font.Bold = True
    p.Range.ParagraphFormat.Alignment = 1
    p.Range.InsertParagraphAfter
    
    ' --- Table 6: Spec Table Marks ---
    Dim tblSpecM As Object
    Set tblSpecM = doc.Tables.Add(Range:=doc.Paragraphs.Last.Range, NumRows:=7, NumColumns:=8)
    tblSpecM.Borders.Enable = True
    
    tblSpecM.Cell(1, 1).Range.Text = "SYLLABUS"
    tblSpecM.Cell(1, 1).Range.Font.Bold = True
    tblSpecM.Cell(1, 1).Range.ParagraphFormat.Alignment = 1
    
    tblSpecM.Cell(1, 2).Merge MergeTo:=tblSpecM.Cell(1, 7)
    tblSpecM.Cell(1, 2).Range.Text = "Marks"
    tblSpecM.Cell(1, 2).Range.Font.Bold = True
    tblSpecM.Cell(1, 2).Range.ParagraphFormat.Alignment = 1
    
    tblSpecM.Cell(1, 3).Range.Text = "Total"
    tblSpecM.Cell(1, 3).Range.Font.Bold = True
    tblSpecM.Cell(1, 3).Range.ParagraphFormat.Alignment = 1
    
    ' Second row headers
    tblSpecM.Rows.Add BeforeRow:=tblSpecM.Rows(2)
    tblSpecM.Cell(2, 1).Range.Text = "Unit"
    tblSpecM.Cell(2, 1).Range.Font.Bold = True
    
    tblSpecM.Cell(2, 2).Range.Text = "K1" & vbCr & "Remembering"
    tblSpecM.Cell(2, 3).Range.Text = "K2" & vbCr & "Understanding"
    tblSpecM.Cell(2, 4).Range.Text = "K3" & vbCr & "Applying"
    tblSpecM.Cell(2, 5).Range.Text = "K4" & vbCr & "Analysing"
    tblSpecM.Cell(2, 6).Range.Text = "K5" & vbCr & "Evaluating"
    tblSpecM.Cell(2, 7).Range.Text = "K6" & vbCr & "Creating"
    tblSpecM.Cell(2, 8).Range.Text = "Total"
    
    For c = 1 To 8
        tblSpecM.Cell(2, c).Range.Font.Bold = True
        tblSpecM.Cell(2, c).Range.Font.Size = 9
        tblSpecM.Cell(2, c).Range.ParagraphFormat.Alignment = 1
    Next c
    
    For u = 1 To 5
        tblSpecM.Cell(2 + u, 1).Range.Text = Choose(u, "I", "II", "III", "IV", "V")
        tblSpecM.Cell(2 + u, 1).Range.Font.Bold = True
        tblSpecM.Cell(2 + u, 1).Range.ParagraphFormat.Alignment = 1
    Next u
    tblSpecM.Cell(8, 1).Range.Text = "Total"
    tblSpecM.Cell(8, 1).Range.Font.Bold = True
    tblSpecM.Cell(8, 1).Range.ParagraphFormat.Alignment = 1
    
    ' HOD Sign block
    Set p = doc.Paragraphs.Add
    p.Range.Text = ""
    p.Range.InsertParagraphAfter
    
    Set p = doc.Paragraphs.Add
    p.Range.Text = "*Note: QB approved by HOD"
    p.Range.Font.Name = "Arial"
    p.Range.Font.Size = 9
    p.Range.Font.Italic = True
    p.Range.ParagraphFormat.Alignment = 0 ' Left
    p.Range.InsertParagraphAfter
    
    ' Save and close Word
    doc.SaveAs2 filePath
    doc.Close
    wdApp.Quit
    
    Set doc = Nothing
    Set wdApp = Nothing
End Sub

' Helper to format the columns of Word exam tables nicely
Private Sub FormatWordTableHeader(ByVal tbl As Object)
    tbl.Columns(1).Width = 40  ' QNo
    tbl.Columns(2).Width = 350 ' Question
    tbl.Columns(3).Width = 40  ' KL
    tbl.Columns(4).Width = 40  ' CO
    
    Dim c As Long
    For c = 1 To 4
        tbl.Cell(1, c).Range.Font.Name = "Arial"
        tbl.Cell(1, c).Range.Font.Size = 10
        tbl.Cell(1, c).Range.Font.Bold = True
        tbl.Cell(1, c).Range.ParagraphFormat.Alignment = 1 ' Center
    Next c
End Sub
