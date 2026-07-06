# PowerShell script to compile VBA source files and create the macro-enabled Excel workbook

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    Write-Host "Creating new Excel workbook..."
    $wb = $excel.Workbooks.Add()
    
    # Setup the worksheets in order
    $dashboard = $wb.Sheets.Item(1)
    $dashboard.Name = "Dashboard"
    
    $qb = $wb.Sheets.Add([System.Reflection.Missing]::Value, $dashboard)
    $qb.Name = "Question Bank"
    
    $summary = $wb.Sheets.Add([System.Reflection.Missing]::Value, $qb)
    $summary.Name = "Summary"
    
    $settings = $wb.Sheets.Add([System.Reflection.Missing]::Value, $summary)
    $settings.Name = "Settings"
    
    $hidden = $wb.Sheets.Add([System.Reflection.Missing]::Value, $settings)
    $hidden.Name = "HiddenData"
    
    Write-Host "Sheets created: Dashboard, Question Bank, Summary, Settings, HiddenData"
    
    # Import BAS modules
    $vbaPath = "c:\guestion_genv1\vba"
    $modules = @("modUtils.bas", "modSettings.bas", "modImport.bas", "modSelection.bas", "modValidation.bas", "modPreview.bas", "modExport.bas", "modDashboard.bas")
    
    foreach ($mod in $modules) {
        $filePath = Join-Path $vbaPath $mod
        Write-Host "Importing module $mod..."
        $wb.VBProject.VBComponents.Import($filePath) | Out-Null
    }
    
    # Helper to import class code (sheet and workbook modules)
    function Import-ClassCode($wb, $codename, $filePath) {
        $comp = $wb.VBProject.VBComponents.Item($codename)
        $comp.CodeModule.DeleteLines(1, $comp.CodeModule.CountOfLines)
        
        $lines = Get-Content $filePath
        $pureCode = @()
        $skip = $true
        foreach ($line in $lines) {
            # Start keeping lines after attributes header ends
            if ($line -match "^Option Explicit" -or $line -match "^Private Sub" -or $line -match "^Public Sub") {
                $skip = $false
            }
            if (-not $skip) {
                $pureCode += $line
            }
        }
        $codeString = [string]::Join("`r`n", $pureCode)
        $comp.CodeModule.AddFromString($codeString) | Out-Null
        Write-Host "Injected code into $codename from $filePath"
    }
    
    # Inject sheet event handlers
    Import-ClassCode $wb $qb.CodeName "c:\guestion_genv1\vba\Sheet_QuestionBank.cls"
    
    # Inject workbook open event handlers
    Import-ClassCode $wb "ThisWorkbook" "c:\guestion_genv1\vba\ThisWorkbook.cls"
    
    # Save the workbook FIRST before running init macros (so file is always up to date)
    $outputPath = "c:\guestion_genv1\SmartQPGenerator.xlsm"
    Write-Host "Saving workbook as $outputPath..."
    $wb.SaveAs($outputPath, 52) # xlOpenXMLWorkbookMacroEnabled = 52
    Write-Host "Workbook saved. Running initialization macros..."
    
    # Run initialization macros to format and populate tables/buttons
    # Wrapped separately in case they crash (workbook is already saved above)
    try {
        Write-Host "Running workbook initialization..."
        $excel.Run("modSettings.InitializeSettings")
        $excel.Run("modDashboard.CreateDashboardUI")
        Write-Host "Initialization complete."
        
        # Activate the Dashboard sheet as the entry sheet
        $dashboard.Activate()
        
        # Re-save after successful initialization
        $wb.Save()
        Write-Host "Re-saved after initialization."
    } catch {
        Write-Warning "Initialization macros encountered an issue (workbook was already saved): $_"
    }
    
    $wb.Close($false)
    
    Write-Host "SUCCESS: SmartQPGenerator.xlsm compiled successfully!"
}
catch {
    Write-Error "Failed to build workbook: $_"
}
finally {
    try { $excel.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
    Remove-Variable excel -ErrorAction SilentlyContinue
}
