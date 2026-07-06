Attribute VB_Name = "modSettings"
Option Explicit

' Gets a setting value by key name from the Settings sheet
Public Function GetSettingValue(ByVal keyName As String) As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("Settings")
    
    Dim lastRow As Long
    lastRow = GetLastRow(ws, 1)
    
    Dim i As Long
    For i = 2 To lastRow
        If Trim(ws.Cells(i, 1).Value) = keyName Then
            GetSettingValue = Trim(ws.Cells(i, 2).Value)
            Exit Function
        End If
    Next i
    
    GetSettingValue = ""
End Function

' Sets a setting value by key name in the Settings sheet
Public Sub SetSettingValue(ByVal keyName As String, ByVal value As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("Settings")
    
    Dim lastRow As Long
    lastRow = GetLastRow(ws, 1)
    
    Dim i As Long
    For i = 2 To lastRow
        If Trim(ws.Cells(i, 1).Value) = keyName Then
            ws.Cells(i, 2).Value = value
            Exit Sub
        End If
    Next i
    
    ' If key does not exist, add it
    ws.Cells(lastRow + 1, 1).Value = keyName
    ws.Cells(lastRow + 1, 2).Value = value
End Sub

' Initializes the Settings sheet with default values if empty
Public Sub InitializeSettings()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Settings")
    On Error GoTo 0
    
    If ws Is Nothing Then Exit Sub
    
    ws.Cells.Clear
    
    ' Set up headers
    ws.Cells(1, 1).Value = "Setting Key"
    ws.Cells(1, 2).Value = "Setting Value"
    FormatHeader ws.Range("A1:B1"), RGB(79, 129, 189), vbWhite
    
    ' Add default settings
    SetSettingValue "Institution Name", "JAYA ENGINEERING COLLEGE"
    SetSettingValue "Affiliation & Accreditation", "(Approved by AICTE, New Delhi || Affiliated to Anna University, Chennai) Accredited by NAAC & NBA"
    SetSettingValue "Address", "Thiruninravur, Chennai, Tamil Nadu, 602 024"
    SetSettingValue "Contact Info", "Phone: 044-26300982 || Website: jec.ac.in || Email: info@jec.ac.in"
    SetSettingValue "Department", "Common to CIVIL/AERO/MECH/EEE/TEXT"
    SetSettingValue "Subject Code", "OCS353"
    SetSettingValue "Subject Name", "Data Science fundamentals"
    SetSettingValue "Regulation", "2021"
    SetSettingValue "Year/Sem", "IV/VII"
    SetSettingValue "Exam Date", "2026-11-15"
    SetSettingValue "Degree/Branch/Sem", "BE/BTECH/ CIVIL/AERO/MECH/EEE/TEXT/VII"
    SetSettingValue "Time Limit", "3 Hours"
    SetSettingValue "Maximum Marks", "100"
    SetSettingValue "Staff In charge", "T.Thillai"
    SetSettingValue "Template Path", ""
    SetSettingValue "Question Bank Path", ""
    SetSettingValue "Output Folder", ThisWorkbook.Path
    
    ws.Columns("A:B").AutoFit
    ws.Columns("A").ColumnWidth = 30
    ws.Columns("B").ColumnWidth = 80
End Sub
