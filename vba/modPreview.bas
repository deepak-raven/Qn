Attribute VB_Name = "modPreview"
Option Explicit

' Initializes the styling of the Live Preview pane in the Question Bank sheet
Public Sub InitPreviewPane()
    Dim wsQB As Worksheet
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    
    ' Clear preview columns
    wsQB.Range("K1:O1000").Clear
    
    ' Set column widths
    wsQB.Columns("J").ColumnWidth = 2   ' Spacer
    wsQB.Columns("K").ColumnWidth = 8   ' Q. No
    wsQB.Columns("L").ColumnWidth = 65  ' Question Text
    wsQB.Columns("M").ColumnWidth = 8   ' KL
    wsQB.Columns("N").ColumnWidth = 8   ' CO
    wsQB.Columns("O").ColumnWidth = 2   ' Spacer
    
    ' Set background color of spacer columns to light gray
    wsQB.Range("J1:J1000").Interior.Color = RGB(245, 245, 245)
    wsQB.Range("O1:O1000").Interior.Color = RGB(245, 245, 245)
    
    ' Header of preview pane
    With wsQB.Range("K1:N1")
        .Merge
        .Value = "LIVE QUESTION PAPER PREVIEW"
        .Font.Name = "Segoe UI"
        .Font.Size = 12
        .Font.Bold = True
        .Font.Color = vbWhite
        .Interior.Color = RGB(31, 78, 121)
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    wsQB.Rows(1).RowHeight = 30
End Sub

' Updates the live preview content dynamically based on current selections
Public Sub UpdateLivePreview()
    Dim wsQB As Worksheet
    Dim wsHidden As Worksheet
    
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    
    ' Initialize if clean
    InitPreviewPane
    
    Dim lastRowHidden As Long
    lastRowHidden = GetLastRow(wsHidden, 1)
    
    If lastRowHidden < 2 Then Exit Sub
    
    ' Gather settings
    Dim subCode As String, subName As String, sem As String, branch As String, maxMarks As String, timeLimit As String
    subCode = modSettings.GetSettingValue("Subject Code")
    subName = modSettings.GetSettingValue("Subject Name")
    sem = modSettings.GetSettingValue("Year/Sem")
    branch = modSettings.GetSettingValue("Department")
    maxMarks = modSettings.GetSettingValue("Maximum Marks")
    timeLimit = modSettings.GetSettingValue("Time Limit")
    
    ' Render Header Block
    Dim r As Long
    r = 3 ' Start row for paper content
    
    ' College Title
    wsQB.Cells(r, 11).Value = "JAYA ENGINEERING COLLEGE"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Name = "Segoe UI"
    wsQB.Cells(r, 11).Font.Size = 14
    wsQB.Cells(r, 11).Font.Bold = True
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    wsQB.Rows(r).RowHeight = 22
    r = r + 1
    
    ' Exam Title
    wsQB.Cells(r, 11).Value = "MODEL EXAMINATION"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Name = "Segoe UI"
    wsQB.Cells(r, 11).Font.Size = 11
    wsQB.Cells(r, 11).Font.Bold = True
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    wsQB.Rows(r).RowHeight = 18
    r = r + 1
    
    ' Subject Details
    wsQB.Cells(r, 11).Value = "Subject Code / Name: " & subCode & " / " & subName
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Name = "Segoe UI"
    wsQB.Cells(r, 11).Font.Size = 10
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    wsQB.Rows(r).RowHeight = 16
    r = r + 1
    
    ' Branch & Sem
    wsQB.Cells(r, 11).Value = "Branch / Semester: " & branch & " / " & sem
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Name = "Segoe UI"
    wsQB.Cells(r, 11).Font.Size = 10
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    wsQB.Rows(r).RowHeight = 16
    r = r + 1
    
    ' Time & Marks
    wsQB.Cells(r, 11).Value = "Time: " & timeLimit & "                                                 Max Marks: " & maxMarks
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Name = "Segoe UI"
    wsQB.Cells(r, 11).Font.Size = 10
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    wsQB.Rows(r).RowHeight = 18
    
    ' Draw bottom border under header
    With wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Borders(xlEdgeBottom)
        .LineStyle = xlDouble
        .Weight = xlThick
        .Color = RGB(0, 0, 0)
    End With
    r = r + 2
    
    ' Load selected questions into arrays
    Dim qArr() As Variant
    qArr = wsHidden.Range("A1:K" & lastRowHidden).Value
    
    ' --- PART A ---
    wsQB.Cells(r, 11).Value = "PART - A (10 x 2 = 20 Marks)"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Bold = True
    wsQB.Cells(r, 11).Font.Size = 11
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    r = r + 1
    
    wsQB.Cells(r, 11).Value = "Answer ALL the questions"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Italic = True
    wsQB.Cells(r, 11).Font.Size = 9
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    r = r + 1
    
    ' Write Part A Column Headers
    wsQB.Cells(r, 11).Value = "Q.No"
    wsQB.Cells(r, 12).Value = "Question"
    wsQB.Cells(r, 13).Value = "KL"
    wsQB.Cells(r, 14).Value = "CO"
    FormatHeader wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)), RGB(240, 240, 240), vbBlack
    wsQB.Rows(r).RowHeight = 20
    r = r + 1
    
    Dim u As Long, i As Long
    Dim qNum As Long
    qNum = 1
    
    ' Loop through Units I to V for Part A
    For u = 1 To 5
        Dim unitStr As String
        unitStr = Choose(u, "UNIT I", "UNIT II", "UNIT III", "UNIT IV", "UNIT V")
        
        For i = 2 To UBound(qArr, 1)
            If qArr(i, 11) = True And qArr(i, 3) = "A" And qArr(i, 2) = unitStr Then ' Selected, Part A, current unit
                WritePreviewQuestion wsQB, r, qNum & ".", qArr(i, 5), qArr(i, 6), qArr(i, 7)
                qNum = qNum + 1
                r = r + 1
            End If
        Next i
    Next u
    
    ' Draw empty rows if less than 10 questions selected
    If qNum <= 10 Then
        For i = qNum To 10
            WritePreviewQuestion wsQB, r, i & ".", "[Select Part A Question from Unit " & Choose(((i - 1) \ 2) + 1, "I", "II", "III", "IV", "V") & "]", "-", "-"
            r = r + 1
        Next i
    End If
    r = r + 1
    
    ' --- PART B ---
    wsQB.Cells(r, 11).Value = "PART - B (5 x 13 = 65 Marks)"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Bold = True
    wsQB.Cells(r, 11).Font.Size = 11
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    r = r + 1
    
    wsQB.Cells(r, 11).Value = "Answer ALL the questions (a or b)"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Italic = True
    wsQB.Cells(r, 11).Font.Size = 9
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    r = r + 1
    
    ' Column Headers
    wsQB.Cells(r, 11).Value = "Q.No"
    wsQB.Cells(r, 12).Value = "Question"
    wsQB.Cells(r, 13).Value = "KL"
    wsQB.Cells(r, 14).Value = "CO"
    FormatHeader wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)), RGB(240, 240, 240), vbBlack
    wsQB.Rows(r).RowHeight = 20
    r = r + 1
    
    qNum = 11
    For u = 1 To 5
        unitStr = Choose(u, "UNIT I", "UNIT II", "UNIT III", "UNIT IV", "UNIT V")
        
        ' Find selected questions for this unit in Part B
        Dim selIndices As Collection
        Set selIndices = New Collection
        For i = 2 To UBound(qArr, 1)
            If qArr(i, 11) = True And qArr(i, 3) = "B" And qArr(i, 2) = unitStr Then
                selIndices.Add i
            End If
        Next i
        
        ' Write them as (a) and (b)
        If selIndices.Count >= 1 Then
            WritePreviewQuestion wsQB, r, qNum & ". a", qArr(selIndices(1), 5), qArr(selIndices(1), 6), qArr(selIndices(1), 7)
        Else
            WritePreviewQuestion wsQB, r, qNum & ". a", "[Select first 13-Mark question for " & unitStr & "]", "-", "-"
        End If
        r = r + 1
        
        ' OR text
        wsQB.Cells(r, 11).Value = ""
        wsQB.Cells(r, 12).Value = "(OR)"
        wsQB.Cells(r, 12).Font.Italic = True
        wsQB.Cells(r, 12).Font.Bold = True
        wsQB.Cells(r, 12).HorizontalAlignment = xlCenter
        wsQB.Rows(r).RowHeight = 18
        r = r + 1
        
        If selIndices.Count >= 2 Then
            WritePreviewQuestion wsQB, r, "   b", qArr(selIndices(2), 5), qArr(selIndices(2), 6), qArr(selIndices(2), 7)
        Else
            WritePreviewQuestion wsQB, r, "   b", "[Select second 13-Mark question for " & unitStr & "]", "-", "-"
        End If
        r = r + 1
        
        qNum = qNum + 1
    Next u
    r = r + 1
    
    ' --- PART C ---
    wsQB.Cells(r, 11).Value = "PART - C (1 x 15 = 15 Marks)"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Bold = True
    wsQB.Cells(r, 11).Font.Size = 11
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    r = r + 1
    
    wsQB.Cells(r, 11).Value = "Answer ALL the questions (a or b)"
    wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)).Merge
    wsQB.Cells(r, 11).Font.Italic = True
    wsQB.Cells(r, 11).Font.Size = 9
    wsQB.Cells(r, 11).HorizontalAlignment = xlCenter
    r = r + 1
    
    ' Column Headers
    wsQB.Cells(r, 11).Value = "Q.No"
    wsQB.Cells(r, 12).Value = "Question"
    wsQB.Cells(r, 13).Value = "KL"
    wsQB.Cells(r, 14).Value = "CO"
    FormatHeader wsQB.Range(wsQB.Cells(r, 11), wsQB.Cells(r, 14)), RGB(240, 240, 240), vbBlack
    wsQB.Rows(r).RowHeight = 20
    r = r + 1
    
    qNum = 16
    ' Find selected questions for Part C
    Dim selIndicesC As Collection
    Set selIndicesC = New Collection
    For i = 2 To UBound(qArr, 1)
        If qArr(i, 11) = True And qArr(i, 3) = "C" Then
            selIndicesC.Add i
        End If
    Next i
    
    If selIndicesC.Count >= 1 Then
        WritePreviewQuestion wsQB, r, qNum & ". a", qArr(selIndicesC(1), 5), qArr(selIndicesC(1), 6), qArr(selIndicesC(1), 7)
    Else
        WritePreviewQuestion wsQB, r, qNum & ". a", "[Select first 15-Mark question]", "-", "-"
    End If
    r = r + 1
    
    ' OR text
    wsQB.Cells(r, 11).Value = ""
    wsQB.Cells(r, 12).Value = "(OR)"
    wsQB.Cells(r, 12).Font.Italic = True
    wsQB.Cells(r, 12).Font.Bold = True
    wsQB.Cells(r, 12).HorizontalAlignment = xlCenter
    wsQB.Rows(r).RowHeight = 18
    r = r + 1
    
    If selIndicesC.Count >= 2 Then
        WritePreviewQuestion wsQB, r, "   b", qArr(selIndicesC(2), 5), qArr(selIndicesC(2), 6), qArr(selIndicesC(2), 7)
    Else
        WritePreviewQuestion wsQB, r, "   b", "[Select second 15-Mark question]", "-", "-"
    End If
    
    ' Draw outer border around the whole preview paper
    Dim paperRng As Range
    Set paperRng = wsQB.Range("K3:N" & r)
    With paperRng.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = RGB(100, 100, 100)
    End With
    With paperRng.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = RGB(100, 100, 100)
    End With
    With paperRng.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = RGB(100, 100, 100)
    End With
    With paperRng.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = RGB(100, 100, 100)
    End With
End Sub

' Helper to write a question line to the preview pane
Private Sub WritePreviewQuestion(ByVal ws As Worksheet, ByVal r As Long, ByVal qNo As String, ByVal qTxt As String, ByVal kl As String, ByVal co As String)
    ws.Cells(r, 11).Value = qNo
    ws.Cells(r, 11).Font.Bold = True
    ws.Cells(r, 11).Font.Name = "Segoe UI"
    ws.Cells(r, 11).Font.Size = 9
    ws.Cells(r, 11).HorizontalAlignment = xlCenter
    ws.Cells(r, 11).VerticalAlignment = xlCenter
    
    ws.Cells(r, 12).Value = qTxt
    ws.Cells(r, 12).Font.Name = "Segoe UI"
    ws.Cells(r, 12).Font.Size = 9
    ws.Cells(r, 12).WrapText = True
    ws.Cells(r, 12).HorizontalAlignment = xlLeft
    ws.Cells(r, 12).VerticalAlignment = xlCenter
    
    ws.Cells(r, 13).Value = kl
    ws.Cells(r, 13).Font.Name = "Segoe UI"
    ws.Cells(r, 13).Font.Size = 9
    ws.Cells(r, 13).HorizontalAlignment = xlCenter
    ws.Cells(r, 13).VerticalAlignment = xlCenter
    
    ws.Cells(r, 14).Value = co
    ws.Cells(r, 14).Font.Name = "Segoe UI"
    ws.Cells(r, 14).Font.Size = 9
    ws.Cells(r, 14).HorizontalAlignment = xlCenter
    ws.Cells(r, 14).VerticalAlignment = xlCenter
    
    ' Draw cell borders
    Dim c As Long
    For c = 11 To 14
        With ws.Cells(r, c).Borders(xlEdgeBottom)
            .LineStyle = xlContinuous
            .Weight = xlThin
            .Color = RGB(230, 230, 230)
        End With
    Next c
    
    ' Adjust row height automatically based on question text length
    Dim numLines As Long
    numLines = Len(qTxt) \ 50
    If numLines < 1 Then numLines = 1
    ws.Rows(r).RowHeight = 16 + (numLines * 12)
End Sub
