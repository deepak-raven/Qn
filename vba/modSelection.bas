Attribute VB_Name = "modSelection"
Option Explicit

' Toggle selection for a specific row in the Question Bank sheet
Public Sub ToggleSelection(ByVal TargetCell As Range)
    Dim wsQB As Worksheet
    Dim wsHidden As Worksheet
    Dim rowNum As Long
    Dim qid As String
    Dim isSelected As Boolean
    
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    
    rowNum = TargetCell.Row
    qid = wsQB.Cells(rowNum, 2).Value ' Get QID
    
    If qid = "" Then Exit Sub
    
    SpeedUp True
    
    ' Toggle the checkbox character
    If TargetCell.Value = "☐" Then
        TargetCell.Value = "☑"
        TargetCell.Font.Color = RGB(0, 150, 0) ' Green for selected
        isSelected = True
    Else
        TargetCell.Value = "☐"
        TargetCell.Font.Color = RGB(120, 120, 120) ' Gray for unselected
        isSelected = False
    End If
    
    ' Update the HiddenData sheet (Column 11 is "Selected")
    Dim lastRowHidden As Long
    lastRowHidden = GetLastRow(wsHidden, 1)
    
    Dim i As Long
    For i = 2 To lastRowHidden
        If wsHidden.Cells(i, 1).Value = qid Then
            wsHidden.Cells(i, 11).Value = isSelected
            Exit For
        End If
    Next i
    
    ' Run real-time validation and refresh preview
    modValidation.ValidateSelections
    modPreview.UpdateLivePreview
    
    ' Update selected count on Dashboard
    UpdateDashboardCounts
    
    SpeedUp False
End Sub

' Helper to update selected count on Dashboard
Public Sub UpdateDashboardCounts()
    Dim wsHidden As Worksheet
    Dim wsDash As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim selCount As Long
    Dim totalCount As Long
    
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    Set wsDash = ThisWorkbook.Sheets("Dashboard")
    
    lastRow = GetLastRow(wsHidden, 1)
    If lastRow < 2 Then
        wsDash.Range("B12").Value = "0 / 0"
        Exit Sub
    End If
    
    For i = 2 To lastRow
        totalCount = totalCount + 1
        If wsHidden.Cells(i, 11).Value = True Then
            selCount = selCount + 1
        End If
    Next i
    
    wsDash.Range("B12").Value = selCount & " / " & totalCount
End Sub
' Wrapper callable from automation/testing: toggle selection by row number on Question Bank sheet
Public Sub ToggleSelectionByRow(ByVal rowNum As Long)
    Dim wsQB As Worksheet
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    
    Dim cell As Range
    Set cell = wsQB.Cells(rowNum, 1)
    
    If cell.Value = "" Then Exit Sub ' Empty row
    
    ToggleSelection cell
End Sub

' Get the current selection state of a row (True=selected, False=not selected)
Public Function IsRowSelected(ByVal rowNum As Long) As Boolean
    Dim wsQB As Worksheet
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    IsRowSelected = (wsQB.Cells(rowNum, 1).Value = ChrW(9745)) ' ☑
End Function
