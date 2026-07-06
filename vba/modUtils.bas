Attribute VB_Name = "modUtils"
Option Explicit

' Speeds up Excel execution by disabling screen updating, events, and calculation
Public Sub SpeedUp(ByVal start As Boolean)
    With Application
        If start Then
            .ScreenUpdating = False
            .EnableEvents = False
            .Calculation = xlCalculationManual
            .DisplayAlerts = False
        Else
            .ScreenUpdating = True
            .EnableEvents = True
            .Calculation = xlCalculationAutomatic
            .DisplayAlerts = True
        End If
    End With
End Sub

' Cleans trailing cell markers (Chr(13) & Chr(7)) and leading/trailing whitespace from Word text
Public Function CleanWordText(ByVal text As String) As String
    Dim cleaned As String
    cleaned = text
    
    ' Remove Word cell end markers
    If Right(cleaned, 2) = Chr(13) & Chr(7) Then
        cleaned = Left(cleaned, Len(cleaned) - 2)
    End If
    
    ' Remove carriage returns at the very end
    Do While Right(cleaned, 1) = Chr(13) Or Right(cleaned, 1) = vbCr Or Right(cleaned, 1) = vbLf Or Right(cleaned, 1) = " "
        cleaned = Left(cleaned, Len(cleaned) - 1)
    Loop
    
    ' Remove leading spaces
    Do While Left(cleaned, 1) = " " Or Left(cleaned, 1) = Chr(13) Or Left(cleaned, 1) = vbCr Or Left(cleaned, 1) = vbLf
        cleaned = Mid(cleaned, 2)
    Loop
    
    CleanWordText = Trim(cleaned)
End Function

' Helper to find the last row in a sheet for a given column
Public Function GetLastRow(ByVal ws As Worksheet, Optional ByVal col As Long = 1) As Long
    On Error Resume Next
    GetLastRow = ws.Cells(ws.Rows.Count, col).End(xlUp).Row
    If GetLastRow < 1 Then GetLastRow = 1
    On Error GoTo 0
End Function

' Formats a range to look like a clean table header
Public Sub FormatHeader(ByVal rng As Range, ByVal bgCol As Long, ByVal textCol As Long)
    With rng
        .Font.Bold = True
        .Font.Color = textCol
        .Font.Name = "Segoe UI"
        .Font.Size = 11
        .Interior.Color = bgCol
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Borders.Color = RGB(200, 200, 200)
    End With
End Sub

' Simple logging function
Public Sub LogMsg(ByVal msg As String)
    Debug.Print "[" & Format(Now, "yyyy-mm-dd hh:mm:ss") & "] " & msg
End Sub
