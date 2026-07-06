VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
End
Attribute VB_Name = "Sheet2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

Private Sub Worksheet_SelectionChange(ByVal Target As Range)
    ' Check if selection is a single cell and is in column A (Column 1)
    If Target.Cells.Count = 1 Then
        If Target.Column = 1 And Target.Row > 1 Then
            ' Call the toggle selection macro
            modSelection.ToggleSelection Target
            
            ' Move selection to Question column to allow toggling it again without stuck selection
            Application.EnableEvents = False
            Cells(Target.Row, 6).Select
            Application.EnableEvents = True
        End If
    End If
End Sub
