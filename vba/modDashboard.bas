Attribute VB_Name = "modDashboard"
Option Explicit

' Reset all sheets to a clean initial state without modifying Dashboard design/buttons
' Public macro bound to the Dashboard button to prompt the user
Public Sub ResetApplicationPrompt()
    Dim ans As VbMsgBoxResult
    ans = MsgBox("Are you sure you want to reset all data? This will clear the imported Question Bank and current selections.", vbYesNo + vbWarning, "Reset Application Data")
    If ans = vbYes Then
        ResetApplication
        MsgBox "Application reset successfully!", vbInformation, "Reset Completed"
    End If
End Sub

' Core reset logic (completely silent and prompt-free, safe for COM)
Public Sub ResetApplication()
    Dim wsQB As Worksheet
    Dim wsHidden As Worksheet
    Dim wsSummary As Worksheet
    Dim wsDash As Worksheet
    
    Set wsQB = ThisWorkbook.Sheets("Question Bank")
    Set wsHidden = ThisWorkbook.Sheets("HiddenData")
    Set wsSummary = ThisWorkbook.Sheets("Summary")
    Set wsDash = ThisWorkbook.Sheets("Dashboard")
    
    Application.EnableEvents = False
    
    ' 1. Clear HiddenData sheet rows (preserving headers at row 1)
    wsHidden.Range("A2:K5000").ClearContents
    
    ' 2. Clear Question Bank sheet's data rows (preserving headers at row 1)
    wsQB.Activate
    wsQB.Range("A2:I5000").UnMerge
    wsQB.Range("A2:I5000").Clear
    
    ' 3. Re-initialize the Live Preview pane on the right side of the Question Bank sheet
    wsQB.Range("K1:Z1000").UnMerge
    wsQB.Range("K1:Z1000").Clear
    modPreview.InitPreviewPane
    
    ' 4. Clear Summary sheet data areas (preserving headers and layout)
    wsSummary.Activate
    wsSummary.Range("A3:H100").UnMerge
    wsSummary.Range("A3:H100").Clear
    
    ' 5. Reset dashboard status display cells (do NOT clear formatting, colors, or shapes)
    wsDash.Activate
    wsDash.Range("B10").Value = "Ready for import."
    wsDash.Range("B12").Value = "0 / 0"
    wsDash.Range("B14").Value = "No questions selected."
    
    Application.EnableEvents = True
End Sub

' Event handler to select and update the output folder
Public Sub SelectOutputFolder()
    Dim fld As FileDialog
    Set fld = Application.FileDialog(msoFileDialogFolderPicker)
    With fld
        .Title = "Select Output Directory for Question Papers"
        .AllowMultiSelect = False
        If .Show = -1 Then
            modSettings.SetSettingValue "Output Folder", .SelectedItems(1)
            MsgBox "Output Folder set to: " & .SelectedItems(1), vbInformation, "Output Directory Updated"
        End If
    End With
End Sub

' Event handler to select and update the question paper template file
Public Sub SelectTemplateFile()
    Dim fd As FileDialog
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    With fd
        .Title = "Select Official Word Template (.docx)"
        .Filters.Clear
        .Filters.Add "Word Templates", "*.docx", 1
        .AllowMultiSelect = False
        If .Show = -1 Then
            modSettings.SetSettingValue "Template Path", .SelectedItems(1)
            MsgBox "Word Template Path set to: " & .SelectedItems(1), vbInformation, "Template File Updated"
        End If
    End With
End Sub

' Navigates the user directly to the Settings worksheet
Public Sub NavigateToSettings()
    On Error Resume Next
    ThisWorkbook.Sheets("Settings").Activate
    On Error GoTo 0
End Sub

' Navigates the user directly to the Dashboard worksheet
Public Sub NavigateToDashboard()
    On Error Resume Next
    ThisWorkbook.Sheets("Dashboard").Activate
    On Error GoTo 0
End Sub

' Navigates the user directly to the Question Bank worksheet
Public Sub NavigateToQuestionBank()
    On Error Resume Next
    ThisWorkbook.Sheets("Question Bank").Activate
    On Error GoTo 0
End Sub

' Programmatically builds and styles the Dashboard sheet, creating premium shape buttons
Public Sub CreateDashboardUI()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("Dashboard")
    
    SpeedUp True
    
    ' Clear cells and shapes
    ws.Cells.Clear
    
    Dim shp As Shape
    For Each shp In ws.Shapes
        shp.Delete
    Next shp
    
    ' Gridline settings
    ActiveWindow.DisplayGridlines = False
    
    ' Set column widths
    ws.Columns("A").ColumnWidth = 18
    ws.Columns("B").ColumnWidth = 32
    ws.Columns("C").ColumnWidth = 6
    ws.Columns("D").ColumnWidth = 32
    ws.Columns("E").ColumnWidth = 6
    ws.Columns("F").ColumnWidth = 32
    ws.Columns("G").ColumnWidth = 10
    
    ' Header Banner
    ws.Range("A2:F2").Merge
    ws.Range("A2").Value = "JAYA ENGINEERING COLLEGE"
    With ws.Range("A2")
        .Font.Name = "Segoe UI"
        .Font.Size = 16
        .Font.Bold = True
        .Font.Color = vbWhite
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Interior.Color = RGB(31, 78, 121)
    End With
    ws.Rows(2).RowHeight = 28
    
    ws.Range("A3:F3").Merge
    ws.Range("A3").Value = "Smart Question Paper Generator (VBA-Powered)"
    With ws.Range("A3")
        .Font.Name = "Segoe UI"
        .Font.Size = 11
        .Font.Italic = True
        .Font.Color = vbWhite
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Interior.Color = RGB(31, 78, 121)
    End With
    ws.Rows(3).RowHeight = 22
    
    ' Row heights for button areas
    ws.Rows(5).RowHeight = 45
    ws.Rows(7).RowHeight = 45
    
    ' Draw Dashboard Buttons
    AddDashboardButton ws, "Import Question Bank", "ImportQuestionBank", 5, 2, RGB(0, 112, 192)
    AddDashboardButton ws, "Generate Question Paper", "ExportQuestionPaper", 5, 4, RGB(0, 150, 0)
    AddDashboardButton ws, "Reset Data", "ResetApplicationPrompt", 5, 6, RGB(200, 0, 0)
    
    AddDashboardButton ws, "Word Template", "SelectTemplateFile", 7, 2, RGB(112, 48, 160)
    AddDashboardButton ws, "Output Folder", "SelectOutputFolder", 7, 4, RGB(237, 125, 49)
    AddDashboardButton ws, "Open Settings", "NavigateToSettings", 7, 6, RGB(120, 120, 120)
    
    ' System Status Monitor Group
    ws.Cells(10, 1).Value = "Status:"
    ws.Cells(10, 1).Font.Bold = True
    ws.Cells(10, 1).Font.Name = "Segoe UI"
    ws.Cells(10, 1).HorizontalAlignment = xlRight
    ws.Range("B10:F10").Merge
    ws.Range("B10").Value = "Ready for import."
    ws.Range("B10").Font.Name = "Segoe UI"
    
    ws.Cells(12, 1).Value = "Selected Count:"
    ws.Cells(12, 1).Font.Bold = True
    ws.Cells(12, 1).Font.Name = "Segoe UI"
    ws.Cells(12, 1).HorizontalAlignment = xlRight
    ws.Range("B12:F12").Merge
    ws.Range("B12").Value = "0 / 0"
    ws.Range("B12").Font.Name = "Segoe UI"
    
    ws.Cells(14, 1).Value = "Validation:"
    ws.Cells(14, 1).Font.Bold = True
    ws.Cells(14, 1).Font.Name = "Segoe UI"
    ws.Cells(14, 1).HorizontalAlignment = xlRight
    ws.Range("B14:F14").Merge
    ws.Range("B14").Value = "No questions selected."
    ws.Range("B14").Font.Name = "Segoe UI"
    ws.Range("B14").Font.Color = RGB(120, 120, 120)
    
    ' Draw outer border for status block
    Dim borderRng As Range
    Set borderRng = ws.Range("A9:F15")
    borderRng.Borders.LineStyle = xlContinuous
    borderRng.Borders.Weight = xlThin
    borderRng.Borders.Color = RGB(180, 180, 180)
    
    ws.Range("A9:F9").Merge
    ws.Range("A9").Value = " APPLICATION STATUS MONITOR"
    ws.Range("A9").Font.Bold = True
    ws.Range("A9").Font.Name = "Segoe UI"
    ws.Range("A9").Font.Size = 10
    ws.Range("A9").Interior.Color = RGB(230, 235, 245)
    ws.Range("A9").Font.Color = RGB(31, 78, 121)
    
    SpeedUp False
End Sub

' Helper to draw a shape-based button
Private Sub AddDashboardButton(ByVal ws As Worksheet, ByVal text As String, ByVal action As String, ByVal row As Long, ByVal col As Long, ByVal color As Long)
    Dim cell As Range
    Set cell = ws.Cells(row, col)
    
    Dim left As Double, top As Double, width As Double, height As Double
    left = cell.Left + 4
    top = cell.Top + 4
    width = cell.Width - 8
    height = cell.Height - 8
    
    Dim shp As Shape
    Set shp = ws.Shapes.AddShape(1, left, top, width, height) ' msoShapeRectangle = 1
    
    With shp
        .TextFrame2.TextRange.text = text
        .TextFrame2.TextRange.Font.Name = "Segoe UI"
        .TextFrame2.TextRange.Font.Size = 10
        .TextFrame2.TextRange.Font.Bold = msoTrue
        .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
        .TextFrame2.VerticalAnchor = 3 ' msoAnchorMiddle = 3
        .TextFrame2.TextRange.ParagraphFormat.Alignment = 2 ' msoAlignCenter = 2
        
        .Fill.Solid
        .Fill.ForeColor.RGB = color
        .Line.Visible = msoFalse
        
        ' Add drop shadow
        .Shadow.Type = 1 ' msoShadow1 = 1
        .Shadow.Visible = msoTrue
        .Shadow.Blur = 4
        .Shadow.OffsetX = 2
        .Shadow.OffsetY = 2
        .Shadow.Transparency = 0.5
        
        .OnAction = action
    End With
End Sub
