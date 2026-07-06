Attribute VB_Name = "modValidation"
Option Explicit

' Performs complete real-time validation of selected questions and updates the Summary sheet
Public Sub ValidateSelections()
    Dim wsHidden As Worksheet
    Dim wsSummary As Worksheet
    Dim wsDash As Worksheet
    
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    Set wsSummary = ThisWorkbook.Sheets("Summary")
    Set wsDash = ThisWorkbook.Sheets("Dashboard")
    
    Dim lastRow As Long
    lastRow = GetLastRow(wsHidden, 1)
    
    ' Counters
    Dim partACount As Long, partBCount As Long, partCCount As Long
    Dim partAMarks As Long, partBMarks As Long, partCMarks As Long
    
    Dim unitACount(1 To 5) As Long
    Dim unitBCount(1 To 5) As Long
    Dim unitCCount(1 To 5) As Long
    
    Dim coCount(1 To 6) As Long
    Dim klCount(1 To 6) As Long
    
    Dim i As Long
    For i = 2 To lastRow
        If wsHidden.Cells(i, 11).Value = True Then ' Selected
            Dim part As String, unit As String, co As String, kl As String
            Dim marks As Long
            
            unit = wsHidden.Cells(i, 2).Value
            part = wsHidden.Cells(i, 3).Value
            marks = wsHidden.Cells(i, 4).Value
            kl = wsHidden.Cells(i, 6).Value
            co = wsHidden.Cells(i, 7).Value
            
            ' Count by Part
            Select Case part
                Case "A"
                    partACount = partACount + 1
                    partAMarks = partAMarks + marks
                    
                    ' Count by Unit
                    If unit = "UNIT I" Then unitACount(1) = unitACount(1) + 1
                    If unit = "UNIT II" Then unitACount(2) = unitACount(2) + 1
                    If unit = "UNIT III" Then unitACount(3) = unitACount(3) + 1
                    If unit = "UNIT IV" Then unitACount(4) = unitACount(4) + 1
                    If unit = "UNIT V" Then unitACount(5) = unitACount(5) + 1
                    
                Case "B"
                    partBCount = partBCount + 1
                    partBMarks = partBMarks + marks
                    
                    If unit = "UNIT I" Then unitBCount(1) = unitBCount(1) + 1
                    If unit = "UNIT II" Then unitBCount(2) = unitBCount(2) + 1
                    If unit = "UNIT III" Then unitBCount(3) = unitBCount(3) + 1
                    If unit = "UNIT IV" Then unitBCount(4) = unitBCount(4) + 1
                    If unit = "UNIT V" Then unitBCount(5) = unitBCount(5) + 1
                    
                Case "C"
                    partCCount = partCCount + 1
                    partCMarks = partCMarks + marks
                    
                    If unit = "UNIT I" Then unitCCount(1) = unitCCount(1) + 1
                    If unit = "UNIT II" Then unitCCount(2) = unitCCount(2) + 1
                    If unit = "UNIT III" Then unitCCount(3) = unitCCount(3) + 1
                    If unit = "UNIT IV" Then unitCCount(4) = unitCCount(4) + 1
                    If unit = "UNIT V" Then unitCCount(5) = unitCCount(5) + 1
            End Select
            
            ' Count by CO
            Dim coNum As Long
            coNum = Val(Replace(co, "CO", ""))
            If coNum >= 1 And coNum <= 6 Then
                coCount(coNum) = coCount(coNum) + 1
            End If
            
            ' Count by KL
            Dim klNum As Long
            klNum = Val(Replace(kl, "K", ""))
            If klNum >= 1 And klNum <= 6 Then
                klCount(klNum) = klCount(klNum) + 1
            End If
        End If
    Next i
    
    ' Total Marks
    Dim grandTotalMarks As Long
    grandTotalMarks = partAMarks + partBMarks + partCMarks
    
    ' Build the Summary sheet layout programmatically
    wsSummary.Cells.Clear
    
    ' Section 1: Title and Header
    wsSummary.Range("A1").Value = "Anna University Question Paper Selection Summary & Validation"
    wsSummary.Range("A1").Font.Size = 16
    wsSummary.Range("A1").Font.Bold = True
    wsSummary.Range("A1").Font.Name = "Segoe UI"
    wsSummary.Range("A1").Font.Color = RGB(31, 78, 121)
    
    ' Table 1: Mark & Question Checklist
    wsSummary.Range("A3:C3").Merge
    wsSummary.Range("A3").Value = "VALIDATION STATUS CHECKLIST"
    FormatHeader wsSummary.Range("A3:C3"), RGB(0, 112, 192), vbWhite
    
    wsSummary.Cells(4, 1).Value = "Metric"
    wsSummary.Cells(4, 2).Value = "Current Status"
    wsSummary.Cells(4, 3).Value = "Status Code"
    FormatHeader wsSummary.Range("A4:C4"), RGB(180, 200, 220), vbBlack
    
    ' Part A
    wsSummary.Cells(5, 1).Value = "Part A (2-Mark Questions)"
    wsSummary.Cells(5, 2).Value = partACount & " Questions Selected (" & partAMarks & " Marks)"
    If partACount = 10 Then
        wsSummary.Cells(5, 3).Value = "OK"
        wsSummary.Cells(5, 3).Font.Color = RGB(0, 128, 0)
    Else
        wsSummary.Cells(5, 3).Value = "Needs 10 (Current: " & partACount & ")"
        wsSummary.Cells(5, 3).Font.Color = RGB(200, 0, 0)
    End If
    
    ' Part B
    wsSummary.Cells(6, 1).Value = "Part B (13-Mark Questions)"
    wsSummary.Cells(6, 2).Value = partBCount & " Questions Selected (" & partBMarks & " Marks)"
    If partBCount = 10 Then
        wsSummary.Cells(6, 3).Value = "OK"
        wsSummary.Cells(6, 3).Font.Color = RGB(0, 128, 0)
    Else
        wsSummary.Cells(6, 3).Value = "Needs 10 (Current: " & partBCount & ")"
        wsSummary.Cells(6, 3).Font.Color = RGB(200, 0, 0)
    End If
    
    ' Part C
    wsSummary.Cells(7, 1).Value = "Part C (15-Mark Questions)"
    wsSummary.Cells(7, 2).Value = partCCount & " Questions Selected (" & partCMarks & " Marks)"
    If partCCount = 2 Then
        wsSummary.Cells(7, 3).Value = "OK"
        wsSummary.Cells(7, 3).Font.Color = RGB(0, 128, 0)
    Else
        wsSummary.Cells(7, 3).Value = "Needs 2 (Current: " & partCCount & ")"
        wsSummary.Cells(7, 3).Font.Color = RGB(200, 0, 0)
    End If
    
    ' Total Marks
    wsSummary.Cells(8, 1).Value = "Total Marks"
    wsSummary.Cells(8, 2).Value = grandTotalMarks & " / 100 Marks"
    If grandTotalMarks = 100 Then
        wsSummary.Cells(8, 3).Value = "OK"
        wsSummary.Cells(8, 3).Font.Color = RGB(0, 128, 0)
    Else
        wsSummary.Cells(8, 3).Value = "Invalid Total"
        wsSummary.Cells(8, 3).Font.Color = RGB(200, 0, 0)
    End If
    
    ' Apply grid borders and formatting to checklist
    Dim checkGrid As Range
    Set checkGrid = wsSummary.Range("A4:C8")
    FormatGrid checkGrid
    
    ' Table 2: Unit-wise Distribution
    wsSummary.Range("E3:H3").Merge
    wsSummary.Range("E3").Value = "UNIT-WISE QUESTIONS DISTRIBUTION"
    FormatHeader wsSummary.Range("E3:H3"), RGB(0, 112, 192), vbWhite
    
    wsSummary.Cells(4, 5).Value = "Unit"
    wsSummary.Cells(4, 6).Value = "Part A (Needs 2)"
    wsSummary.Cells(4, 7).Value = "Part B (Needs 2)"
    wsSummary.Cells(4, 8).Value = "Part C"
    FormatHeader wsSummary.Range("E4:H4"), RGB(180, 200, 220), vbBlack
    
    Dim u As Long
    For u = 1 To 5
        wsSummary.Cells(4 + u, 5).Value = "Unit " & u
        wsSummary.Cells(4 + u, 6).Value = unitACount(u)
        If unitACount(u) <> 2 Then
            wsSummary.Cells(4 + u, 6).Font.Color = RGB(200, 0, 0)
            wsSummary.Cells(4 + u, 6).Font.Bold = True
        Else
            wsSummary.Cells(4 + u, 6).Font.Color = RGB(0, 128, 0)
        End If
        
        wsSummary.Cells(4 + u, 7).Value = unitBCount(u)
        If unitBCount(u) <> 2 Then
            wsSummary.Cells(4 + u, 7).Font.Color = RGB(200, 0, 0)
            wsSummary.Cells(4 + u, 7).Font.Bold = True
        Else
            wsSummary.Cells(4 + u, 7).Font.Color = RGB(0, 128, 0)
        End If
        
        wsSummary.Cells(4 + u, 8).Value = unitCCount(u)
    Next u
    FormatGrid wsSummary.Range("E4:H9")
    
    ' Table 3: CO Attainment Summary
    wsSummary.Range("A11:B11").Merge
    wsSummary.Range("A11").Value = "COURSE OUTCOMES (CO) SPREAD"
    FormatHeader wsSummary.Range("A11:B11"), RGB(0, 112, 192), vbWhite
    
    wsSummary.Cells(12, 1).Value = "Course Outcome"
    wsSummary.Cells(12, 2).Value = "Selected Count"
    FormatHeader wsSummary.Range("A12:B12"), RGB(180, 200, 220), vbBlack
    
    Dim c As Long
    For c = 1 To 5
        wsSummary.Cells(12 + c, 1).Value = "CO" & c
        wsSummary.Cells(12 + c, 2).Value = coCount(c)
        If coCount(c) = 0 Then
            wsSummary.Cells(12 + c, 2).Font.Color = RGB(200, 0, 0)
            wsSummary.Cells(12 + c, 2).Font.Bold = True
        End If
    Next c
    FormatGrid wsSummary.Range("A12:B17")
    
    ' Table 4: Knowledge Level (KL) Distribution
    wsSummary.Range("E11:F11").Merge
    wsSummary.Range("E11").Value = "KNOWLEDGE LEVEL (KL) SPREAD"
    FormatHeader wsSummary.Range("E11:F11"), RGB(0, 112, 192), vbWhite
    
    wsSummary.Cells(12, 5).Value = "Knowledge Level"
    wsSummary.Cells(12, 6).Value = "Selected Count"
    FormatHeader wsSummary.Range("E12:F12"), RGB(180, 200, 220), vbBlack
    
    Dim k As Long
    For k = 1 To 6
        wsSummary.Cells(12 + k, 5).Value = "K" & k
        wsSummary.Cells(12 + k, 6).Value = klCount(k)
    Next k
    FormatGrid wsSummary.Range("E12:F18")
    
    ' Auto-fit summary columns
    wsSummary.Columns("A:H").AutoFit
    wsSummary.Columns("D").ColumnWidth = 4
    
    ' Update status on Dashboard
    Dim overallStatus As String
    Dim isError As Boolean
    
    isError = False
    overallStatus = "Valid Selections!"
    
    If partACount <> 10 Then
        overallStatus = "Warning: Part A must have exactly 10 questions (current: " & partACount & ")."
        isError = True
    ElseIf partBCount <> 10 Then
        overallStatus = "Warning: Part B must have exactly 10 questions (current: " & partBCount & ")."
        isError = True
    ElseIf partCCount <> 2 Then
        overallStatus = "Warning: Part C must have exactly 2 questions (current: " & partCCount & ")."
        isError = True
    ElseIf grandTotalMarks <> 100 Then
        overallStatus = "Warning: Total marks must be exactly 100 (current: " & grandTotalMarks & ")."
        isError = True
    End If
    
    ' Check if unit rules are satisfied
    If Not isError Then
        For u = 1 To 5
            If unitACount(u) <> 2 Then
                overallStatus = "Warning: Unit " & u & " must have exactly 2 questions in Part A."
                isError = True
                Exit For
            End If
            If unitBCount(u) <> 2 Then
                overallStatus = "Warning: Unit " & u & " must have exactly 2 questions in Part B (for a/b pairs)."
                isError = True
                Exit For
            End If
        Next u
    End If
    
    If isError Then
        wsDash.Range("B14").Value = overallStatus
        wsDash.Range("B14").Font.Color = RGB(200, 0, 0)
        wsDash.Range("B14").Font.Bold = True
    Else
        wsDash.Range("B14").Value = "Valid! Ready to generate."
        wsDash.Range("B14").Font.Color = RGB(0, 128, 0)
        wsDash.Range("B14").Font.Bold = True
    End If
End Sub

' Helper to format grid cells consistently
Private Sub FormatGrid(ByVal rng As Range)
    With rng
        .Font.Name = "Segoe UI"
        .Font.Size = 10
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Borders.Color = RGB(180, 180, 180)
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    
    ' Left align the first column of data ranges (except headers)
    Dim cell As Range
    For Each cell In rng.Columns(1).Cells
        If cell.Row > rng.Cells(1, 1).Row Then
            cell.HorizontalAlignment = xlLeft
        End If
    Next cell
End Sub
