Attribute VB_Name = "modImport"
Option Explicit

' Set to True to suppress all MsgBox/InputBox popups (for automated testing)
Public SilentMode As Boolean

' Call from automation to suppress popups
Public Sub EnableSilentMode()
    SilentMode = True
End Sub

' Call from automation to re-enable popups
Public Sub DisableSilentMode()
    SilentMode = False
End Sub

Sub LogDebug(msg As String)
    On Error Resume Next
    Dim f As Integer
    f = FreeFile
    Open "c:\guestion_genv1\vba_debug.log" For Append As #f
    Print #f, Now & " - " & msg
    Close #f
    On Error GoTo 0
End Sub

' Prompts the user to select the Question Bank Word document and runs the import process
Public Sub ImportQuestionBank()
    Dim fd As FileDialog
    Dim filePath As String
    
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    With fd
        .Title = "Select Question Bank Word Document"
        .Filters.Clear
        .Filters.Add "Word Documents", "*.docx; *.doc", 1
        .AllowMultiSelect = False
        If .Show = -1 Then
            filePath = .SelectedItems(1)
        Else
            Exit Sub
        End If
    End With
    
    ' Call the core import engine
    RunImportEngine filePath
End Sub

' Core Import Engine - Uses Word COM Automation to parse and load the Question Bank
Public Sub RunImportEngine(ByVal filePath As String)
    Dim wdApp As Object
    Dim wdDoc As Object
    Dim wsHidden As Worksheet
    Dim wsQB As Worksheet
    Dim wsDash As Worksheet
    Dim tempFilePath As String
    
    LogDebug "--- RunImportEngine Start ---"
    LogDebug "filePath: " & filePath
    
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    Set wsDash = ThisWorkbook.Sheets("Dashboard")
    
    On Error GoTo ErrorHandler
    
    ' Speed up Excel during import
    SpeedUp True
    wsDash.Range("B10").Value = "Importing question bank... Please wait."
    DoEvents
    
    ' Clear existing data
    LogDebug "Clearing sheets"
    wsHidden.Cells.Clear
    wsQB.Cells.Clear
    
    ' Set up headers in HiddenData
    wsHidden.Cells(1, 1).Value = "QID"
    wsHidden.Cells(1, 2).Value = "Unit"
    wsHidden.Cells(1, 3).Value = "Part"
    wsHidden.Cells(1, 4).Value = "Marks"
    wsHidden.Cells(1, 5).Value = "Question Text"
    wsHidden.Cells(1, 6).Value = "KL"
    wsHidden.Cells(1, 7).Value = "CO"
    wsHidden.Cells(1, 8).Value = "Has Rich Content"
    wsHidden.Cells(1, 9).Value = "Word Table Index"
    wsHidden.Cells(1, 10).Value = "Word Row Index"
    wsHidden.Cells(1, 11).Value = "Selected"
    FormatHeader wsHidden.Range("A1:K1"), RGB(79, 129, 189), vbWhite
    
    ' Copy file to a temporary name to bypass OS lock issues on the original file
    tempFilePath = filePath & "_temp.docx"
    LogDebug "tempFilePath: " & tempFilePath
    On Error Resume Next
    If Dir(tempFilePath) <> "" Then Kill tempFilePath
    On Error GoTo ErrorHandler
    
    LogDebug "Copying file to temp"
    FileCopy filePath, tempFilePath
    
    ' Open Word COM application
    LogDebug "Creating Word.Application"
    Set wdApp = CreateObject("Word.Application")
    wdApp.Visible = False
    wdApp.DisplayAlerts = 0 ' wdAlertsNone
    
    ' Open the document
    LogDebug "Opening Word doc copy"
    Set wdDoc = wdApp.Documents.Open(tempFilePath, ReadOnly:=True)
    
    Dim totalTables As Long
    totalTables = wdDoc.Tables.Count
    LogDebug "Total tables found: " & totalTables
    
    If totalTables = 0 Then
        LogDebug "No tables found"
        If Not SilentMode Then
            MsgBox "The selected Word document does not contain any tables.", vbExclamation, "No Tables Found"
        End If
        GoTo CleanUp
    End If
    
    Dim tblIndex As Long
    Dim questionCount As Long
    Dim currentUnit As String
    Dim currentMarks As Long
    Dim currentPart As String
    
    ' Sensible defaults
    currentUnit = "UNIT I"
    currentMarks = 2
    currentPart = "A"
    
    Dim para As Object
    Dim tbl As Object
    Dim lastProcessedTblStart As Long
    
    tblIndex = 0
    questionCount = 0
    lastProcessedTblStart = -1 ' No table processed yet
    
    LogDebug "Starting paragraph loop"
    
    ' Scan document paragraph by paragraph in natural order (top to bottom)
    For Each para In wdDoc.Paragraphs
        ' ---- TABLE DETECTION ----
        ' If paragraph is inside a table, process that table (once per table)
        If para.Range.Information(12) Then ' wdWithInTable = 12
            Set tbl = para.Range.Tables(1)
            
            Dim thisTblStart As Long
            thisTblStart = tbl.Range.Start
            
            If thisTblStart <> lastProcessedTblStart Then
                lastProcessedTblStart = thisTblStart
                tblIndex = tblIndex + 1
                
                LogDebug "Processing table " & tblIndex & " at start " & thisTblStart & " using Unit=" & currentUnit & ", Part=" & currentPart & ", Marks=" & currentMarks
                ' Parse this table for questions using the current context
                ParseQuestionTable tbl, currentUnit, currentMarks, currentPart, questionCount, wsHidden, tblIndex
                LogDebug "Finished table " & tblIndex & ". Current questionCount=" & questionCount
            End If
        Else
            ' ---- HEADING DETECTION ----
            ' Check every paragraph's text for unit/marks headings (short paragraphs only, < 80 chars)
            Dim rawTxt As String
            rawTxt = para.Range.Text
            
            If Len(rawTxt) > 0 And Len(rawTxt) < 80 Then
                Dim upperTxt As String
                Dim cleanTxt As String
                upperTxt = UCase(Trim(rawTxt))
                cleanTxt = upperTxt
                cleanTxt = Replace(cleanTxt, " ", "")
                cleanTxt = Replace(cleanTxt, vbTab, "")
                cleanTxt = Replace(cleanTxt, Chr(9), "")
                cleanTxt = Replace(cleanTxt, "-", "")
                cleanTxt = Replace(cleanTxt, ":", "")
                cleanTxt = Replace(cleanTxt, Chr(13), "")
                cleanTxt = Replace(cleanTxt, vbCr, "")
                cleanTxt = Replace(cleanTxt, vbLf, "")
                cleanTxt = Replace(cleanTxt, Chr(7), "")  ' Word end-of-cell marker
                
                ' Detect Unit Heading - check longest-match first to avoid prefix false-matches
                If InStr(cleanTxt, "UNIT") > 0 Then
                    Dim prevUnit As String
                    prevUnit = currentUnit
                    If InStr(cleanTxt, "UNITIII") > 0 Or InStr(cleanTxt, "UNIT3") > 0 Then
                        currentUnit = "UNIT III"
                    ElseIf InStr(cleanTxt, "UNITII") > 0 Or InStr(cleanTxt, "UNIT2") > 0 Then
                        currentUnit = "UNIT II"
                    ElseIf InStr(cleanTxt, "UNITIV") > 0 Or InStr(cleanTxt, "UNIT4") > 0 Then
                        currentUnit = "UNIT IV"
                    ElseIf InStr(cleanTxt, "UNITV") > 0 Or InStr(cleanTxt, "UNIT5") > 0 Then
                        currentUnit = "UNIT V"
                    ElseIf InStr(cleanTxt, "UNITI") > 0 Or InStr(cleanTxt, "UNIT1") > 0 Then
                        currentUnit = "UNIT I"
                    End If
                    If currentUnit <> prevUnit Then
                        LogDebug "Detected Unit transition: " & prevUnit & " -> " & currentUnit
                    End If
                End If
                
                ' Detect Marks/Part Heading
                Dim prevPart As String
                prevPart = currentPart
                If InStr(cleanTxt, "TWOMARK") > 0 Or InStr(cleanTxt, "2MARK") > 0 Then
                    currentMarks = 2
                    currentPart = "A"
                ElseIf InStr(cleanTxt, "THIRTEENMARK") > 0 Or InStr(cleanTxt, "13MARK") > 0 Then
                    currentMarks = 13
                    currentPart = "B"
                ElseIf InStr(cleanTxt, "FIFTEENMARK") > 0 Or InStr(cleanTxt, "15MARK") > 0 Then
                    currentMarks = 15
                    currentPart = "C"
                End If
                If currentPart <> prevPart Then
                    LogDebug "Detected Part transition: " & prevPart & " -> " & currentPart & " (" & currentMarks & " Marks)"
                End If
            End If
        End If
    Next para
    
    LogDebug "Paragraph loop completed. Total questions imported: " & questionCount
    
    ' Close Word files
    LogDebug "Closing Word application"
    wdDoc.Close SaveChanges:=False
    wdApp.Quit
    Set wdDoc = Nothing
    Set wdApp = Nothing
    
    If tempFilePath <> "" Then
        LogDebug "Deleting temp file " & tempFilePath
        If Dir(tempFilePath) <> "" Then Kill tempFilePath
    End If
    
    ' Save Question Bank path to Settings
    modSettings.SetSettingValue "Question Bank Path", filePath
    
    ' Populate Question Bank Sheet UI
    LogDebug "Calling PopulateQuestionBankSheet"
    PopulateQuestionBankSheet
    LogDebug "Finished PopulateQuestionBankSheet"
    
    ' Update Status
    SpeedUp False
    wsDash.Range("B10").Value = "Successfully imported " & questionCount & " questions."
    wsDash.Range("B12").Value = "0 / " & questionCount
    
    LogDebug "RunImportEngine finished successfully."
    
    If Not SilentMode Then
        MsgBox "Question bank imported successfully!" & vbCrLf & "Total Questions: " & questionCount, vbInformation, "Import Successful"
    End If
    Exit Sub
    
CleanUp:
    On Error Resume Next
    LogDebug "CleanUp routine started"
    If Not wdDoc Is Nothing Then wdDoc.Close SaveChanges:=False
    If Not wdApp Is Nothing Then wdApp.Quit
    If tempFilePath <> "" Then
        If Dir(tempFilePath) <> "" Then Kill tempFilePath
    End If
    SpeedUp False
    Exit Sub

ErrorHandler:
    SpeedUp False
    LogDebug "ErrorHandler: " & Err.Description
    If Not SilentMode Then
        MsgBox "An error occurred during import:" & vbCrLf & Err.Description, vbCritical, "Import Error"
    End If
    Resume CleanUp
End Sub

' Helper to parse question tables safely using Cell-based looping to support merged cells
Private Sub ParseQuestionTable(ByVal tbl As Object, _
                               ByVal unitVal As String, _
                               ByVal marksVal As Long, _
                               ByVal partVal As String, _
                               ByRef questionCount As Long, _
                               ByVal wsHidden As Worksheet, _
                               ByVal tblIndex As Long)
    On Error GoTo TableError
    
    LogDebug "ParseQuestionTable entering"
    Dim cell As Object
    Dim curRow As Long
    Dim sNoText As String
    Dim qText As String
    Dim klText As String
    Dim coText As String
    Dim cell2Range As Object
    
    curRow = 0
    sNoText = ""
    qText = ""
    klText = ""
    coText = ""
    Set cell2Range = Nothing
    
    LogDebug "Before Cells collection loop check"
    Dim cellsColl As Object
    Set cellsColl = tbl.Range.Cells
    LogDebug "Cells collection retrieved. Count = " & cellsColl.Count
    
    ' Iterate cells in natural sequence (replaces tbl.Rows which fails on merged tables)
    For Each cell In cellsColl
        Dim rIdx As Long, cIdx As Long
        On Error Resume Next
        rIdx = cell.RowIndex
        cIdx = cell.ColumnIndex
        On Error GoTo TableError
        
        ' If we hit a new row index, process the completed question of the previous row
        If rIdx <> curRow And curRow > 0 Then
            LogDebug "New row index: " & rIdx & " from curRow " & curRow
            ProcessParsedRow sNoText, qText, klText, coText, cell2Range, _
                             unitVal, marksVal, partVal, questionCount, wsHidden, tblIndex, curRow
            
            ' Reset trackers
            sNoText = ""
            qText = ""
            klText = ""
            coText = ""
            Set cell2Range = Nothing
        End If
        
        curRow = rIdx
        
        ' Collect columns based on ColumnIndex
        Select Case cIdx
            Case 1: sNoText = CleanWordText(cell.Range.Text)
            Case 2:
                qText = CleanWordText(cell.Range.Text)
                Set cell2Range = cell.Range
            Case 3: klText = CleanWordText(cell.Range.Text)
            Case 4: coText = CleanWordText(cell.Range.Text)
        End Select
    Next cell
    
    ' Process final row
    If curRow > 0 Then
        LogDebug "Processing final row: " & curRow
        ProcessParsedRow sNoText, qText, klText, coText, cell2Range, _
                         unitVal, marksVal, partVal, questionCount, wsHidden, tblIndex, curRow
    End If
    LogDebug "ParseQuestionTable exit"
    Exit Sub

TableError:
    LogDebug "TableError in ParseQuestionTable: " & Err.Description
    Err.Clear
End Sub

' Helper to write a parsed row to Excel after verification of SNo validity
Private Sub ProcessParsedRow(ByVal sNoText As String, _
                             ByVal qText As String, _
                             ByVal klText As String, _
                             ByVal coText As String, _
                             ByVal cell2Range As Object, _
                             ByVal unitVal As String, _
                             ByVal marksVal As Long, _
                             ByVal partVal As String, _
                             ByRef questionCount As Long, _
                             ByVal wsHidden As Worksheet, _
                             ByVal tblIndex As Long, _
                             ByVal rIndex As Long)
    ' Verify if cell 1 contains a valid question serial number
    If IsValidSNo(sNoText) Then
        If Not cell2Range Is Nothing Then
            Dim hasRich As Boolean
            hasRich = False
            
            On Error Resume Next
            If cell2Range.InlineShapes.Count > 0 Or cell2Range.OMaths.Count > 0 Or cell2Range.Tables.Count > 0 Then
                hasRich = True
            End If
            On Error GoTo 0
            
            questionCount = questionCount + 1
            Dim writeRow As Long
            writeRow = questionCount + 1
            
            ' Write values to HiddenData
            wsHidden.Cells(writeRow, 1).Value = "Q" & questionCount
            wsHidden.Cells(writeRow, 2).Value = unitVal
            wsHidden.Cells(writeRow, 3).Value = partVal
            wsHidden.Cells(writeRow, 4).Value = marksVal
            wsHidden.Cells(writeRow, 5).Value = qText
            wsHidden.Cells(writeRow, 6).Value = klText
            wsHidden.Cells(writeRow, 7).Value = coText
            wsHidden.Cells(writeRow, 8).Value = IIf(hasRich, "Yes", "No")
            wsHidden.Cells(writeRow, 9).Value = tblIndex
            wsHidden.Cells(writeRow, 10).Value = rIndex
            wsHidden.Cells(writeRow, 11).Value = False
        End If
    End If
End Sub

' Checks if a serial number text is a valid question serial number (skipping headers/other text)
Private Function IsValidSNo(ByVal sNoText As String) As Boolean
    Dim clean As String
    clean = UCase(Trim(sNoText))
    
    ' Remove spaces, periods, parentheses
    clean = Replace(clean, ".", "")
    clean = Replace(clean, " ", "")
    clean = Replace(clean, "(", "")
    clean = Replace(clean, ")", "")
    clean = Replace(clean, vbTab, "")
    clean = Replace(clean, Chr(9), "")
    
    If clean = "" Then
        IsValidSNo = False
        Exit Function
    End If
    
    ' Skip headers containing SNo or Serial
    If InStr(clean, "SNO") > 0 Or InStr(clean, "SERIAL") > 0 Then
        IsValidSNo = False
        Exit Function
    End If
    
    ' Must start with a digit
    Dim firstChar As String
    firstChar = Left(clean, 1)
    If firstChar >= "0" And firstChar <= "9" Then
        IsValidSNo = True
    Else
        IsValidSNo = False
    End If
End Function

' Populates the Question Bank sheet with a clean user-facing grid and check boxes
Public Sub PopulateQuestionBankSheet()
    Dim wsQB As Worksheet
    Dim wsHidden As Worksheet
    
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    
    wsQB.Cells.Clear
    
    ' Create headers
    wsQB.Cells(1, 1).Value = "Select"
    wsQB.Cells(1, 2).Value = "QID"
    wsQB.Cells(1, 3).Value = "Unit"
    wsQB.Cells(1, 4).Value = "Part"
    wsQB.Cells(1, 5).Value = "Marks"
    wsQB.Cells(1, 6).Value = "Question Text"
    wsQB.Cells(1, 7).Value = "KL"
    wsQB.Cells(1, 8).Value = "CO"
    wsQB.Cells(1, 9).Value = "Rich Content"
    
    FormatHeader wsQB.Range("A1:I1"), RGB(0, 112, 192), vbWhite
    
    Dim lastRowHidden As Long
    lastRowHidden = GetLastRow(wsHidden, 1)
    
    If lastRowHidden < 2 Then Exit Sub
    
    ' Write values from HiddenData to Question Bank
    Dim i As Long
    For i = 2 To lastRowHidden
        wsQB.Cells(i, 1).Value = "☐"
        wsQB.Cells(i, 2).Value = wsHidden.Cells(i, 1).Value
        wsQB.Cells(i, 3).Value = wsHidden.Cells(i, 2).Value
        wsQB.Cells(i, 4).Value = wsHidden.Cells(i, 3).Value
        wsQB.Cells(i, 5).Value = wsHidden.Cells(i, 4).Value
        wsQB.Cells(i, 6).Value = wsHidden.Cells(i, 5).Value
        wsQB.Cells(i, 7).Value = wsHidden.Cells(i, 6).Value
        wsQB.Cells(i, 8).Value = wsHidden.Cells(i, 7).Value
        wsQB.Cells(i, 9).Value = wsHidden.Cells(i, 8).Value
    Next i
    
    ' Format cells
    With wsQB.Range("A2:A" & lastRowHidden)
        .Font.Name = "Segoe UI"
        .Font.Size = 12
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        .Font.Color = RGB(120, 120, 120)
    End With
    
    With wsQB.Range("B2:E" & lastRowHidden)
        .HorizontalAlignment = xlCenter
        .Font.Name = "Segoe UI"
        .Font.Size = 10
    End With
    
    With wsQB.Range("F2:F" & lastRowHidden)
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Font.Name = "Segoe UI"
        .Font.Size = 10
    End With
    
    With wsQB.Range("G2:I" & lastRowHidden)
        .HorizontalAlignment = xlCenter
        .Font.Name = "Segoe UI"
        .Font.Size = 10
    End With
    
    ' Borders
    Dim gridRng As Range
    Set gridRng = wsQB.Range("A1:I" & lastRowHidden)
    With gridRng.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(180, 180, 180)
    End With
    With gridRng.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(180, 180, 180)
    End With
    With gridRng.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(180, 180, 180)
    End With
    With gridRng.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(180, 180, 180)
    End With
    With gridRng.Borders(xlInsideVertical)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(220, 220, 220)
    End With
    With gridRng.Borders(xlInsideHorizontal)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = RGB(220, 220, 220)
    End With
    
    ' Column widths
    wsQB.Columns("A").ColumnWidth = 8
    wsQB.Columns("B").ColumnWidth = 8  ' QID
    wsQB.Columns("C").ColumnWidth = 10 ' Unit
    wsQB.Columns("D").ColumnWidth = 8  ' Part
    wsQB.Columns("E").ColumnWidth = 8  ' Marks
    wsQB.Columns("F").ColumnWidth = 60 ' Question Text
    wsQB.Columns("G").ColumnWidth = 8  ' KL
    wsQB.Columns("H").ColumnWidth = 8  ' CO
    wsQB.Columns("I").ColumnWidth = 12 ' Rich Content
    
    ' Auto row height for readability
    wsQB.Range("A2:I" & lastRowHidden).RowHeight = 24
    
    ' Setup frozen panes to separate Question Bank list from Live Preview (safely wrap for headless Excel mode)
    On Error Resume Next
    wsQB.Activate
    wsQB.Cells(2, 11).Select ' Select column K, row 2
    ActiveWindow.FreezePanes = True
    On Error GoTo 0
    
    ' Clear columns K to Z for Live Preview pane
    wsQB.Range("K1:Z" & lastRowHidden + 100).UnMerge
    wsQB.Range("K1:Z" & lastRowHidden + 100).Clear
    
    ' Format the Live Preview background
    wsQB.Columns("J").ColumnWidth = 2 ' Empty spacer
    wsQB.Columns("K").ColumnWidth = 4 ' QNo
    wsQB.Columns("L").ColumnWidth = 50 ' Question Text
    wsQB.Columns("M").ColumnWidth = 8 ' KL
    wsQB.Columns("N").ColumnWidth = 8 ' CO
    
    ' Setup Live Preview borders and title
    modPreview.InitPreviewPane
End Sub
