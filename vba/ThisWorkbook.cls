VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
End
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

Private Sub Workbook_Open()
    ' Re-create the dashboard UI elements to ensure clean display
    On Error Resume Next
    modDashboard.CreateDashboardUI
    On Error GoTo 0
End Sub
