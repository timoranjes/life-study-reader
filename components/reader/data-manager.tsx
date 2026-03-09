"use client"

import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Download,
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  exportUserData,
  downloadExportFile,
  getExportSummary,
  formatExportSize,
} from "@/lib/data-export"
import {
  loadImportFile,
  importUserData,
  getImportPreview,
} from "@/lib/data-import"
import type { ExportData, ExportOptions, ImportOptions, ImportResult } from "@/types/export-import"
import type { Language } from "@/lib/reading-data"
import { toast } from "sonner"

interface DataManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
  language: Language
}

// Multilingual labels
const labels = {
  simplified: {
    title: "数据管理",
    description: "导出或导入您的阅读数据，包括高亮、笔记和进度",
    exportTab: "导出数据",
    importTab: "导入数据",
    selectContent: "选择导出内容",
    highlightsAndNotes: "高亮和笔记",
    readingProgress: "阅读进度",
    readerSettings: "阅读设置",
    voiceSettings: "语音设置",
    exportPreview: "导出预览",
    highlightCount: "高亮数量:",
    noteCount: "笔记数量:",
    booksInvolved: "涉及书籍:",
    estimatedSize: "预计大小:",
    exportButton: "导出 JSON 文件",
    exporting: "导出中...",
    exportSuccess: "导出成功",
    exportSuccessDesc: (h: number, n: number) => `已导出 ${h} 个高亮和 ${n} 条笔记`,
    exportFailed: "导出失败",
    unknownError: "未知错误",
    clickToSelect: "点击选择备份文件",
    supportFormat: "支持 .json 格式",
    validationError: "验证错误",
    fileLoaded: "文件已加载",
    exportTime: "导出时间:",
    version: "版本:",
    highlights: "高亮:",
    notes: "笔记:",
    books: "书籍:",
    importOptions: "导入选项",
    mergeData: "合并现有数据（相同 ID 会覆盖）",
    overwriteProgress: "覆盖阅读进度",
    overwriteSettings: "覆盖设置",
    reselect: "重新选择",
    startImport: "开始导入",
    importing: "导入中...",
    importSuccess: "导入成功",
    partialImport: "部分导入成功",
    importFailed: "导入失败",
    viewWarnings: "查看警告",
    dataStoredLocally: "数据仅存储在您的浏览器本地，请定期备份",
  },
  traditional: {
    title: "數據管理",
    description: "導出或導入您的閱讀數據，包括高亮、筆記和進度",
    exportTab: "導出數據",
    importTab: "導入數據",
    selectContent: "選擇導出內容",
    highlightsAndNotes: "高亮和筆記",
    readingProgress: "閱讀進度",
    readerSettings: "閱讀設置",
    voiceSettings: "語音設置",
    exportPreview: "導出預覽",
    highlightCount: "高亮數量:",
    noteCount: "筆記數量:",
    booksInvolved: "涉及書籍:",
    estimatedSize: "預計大小:",
    exportButton: "導出 JSON 文件",
    exporting: "導出中...",
    exportSuccess: "導出成功",
    exportSuccessDesc: (h: number, n: number) => `已導出 ${h} 個高亮和 ${n} 條筆記`,
    exportFailed: "導出失敗",
    unknownError: "未知錯誤",
    clickToSelect: "點擊選擇備份文件",
    supportFormat: "支持 .json 格式",
    validationError: "驗證錯誤",
    fileLoaded: "文件已加載",
    exportTime: "導出時間:",
    version: "版本:",
    highlights: "高亮:",
    notes: "筆記:",
    books: "書籍:",
    importOptions: "導入選項",
    mergeData: "合併現有數據（相同 ID 會覆蓋）",
    overwriteProgress: "覆蓋閱讀進度",
    overwriteSettings: "覆蓋設置",
    reselect: "重新選擇",
    startImport: "開始導入",
    importing: "導入中...",
    importSuccess: "導入成功",
    partialImport: "部分導入成功",
    importFailed: "導入失敗",
    viewWarnings: "查看警告",
    dataStoredLocally: "數據僅存儲在您的瀏覽器本地，請定期備份",
  },
  english: {
    title: "Data Management",
    description: "Export or import your reading data, including highlights, notes, and progress",
    exportTab: "Export",
    importTab: "Import",
    selectContent: "Select content to export",
    highlightsAndNotes: "Highlights & Notes",
    readingProgress: "Reading Progress",
    readerSettings: "Reader Settings",
    voiceSettings: "Voice Settings",
    exportPreview: "Export Preview",
    highlightCount: "Highlights:",
    noteCount: "Notes:",
    booksInvolved: "Books:",
    estimatedSize: "Estimated size:",
    exportButton: "Export JSON File",
    exporting: "Exporting...",
    exportSuccess: "Export Successful",
    exportSuccessDesc: (h: number, n: number) => `Exported ${h} highlights and ${n} notes`,
    exportFailed: "Export Failed",
    unknownError: "Unknown error",
    clickToSelect: "Click to select backup file",
    supportFormat: "Supports .json format",
    validationError: "Validation Error",
    fileLoaded: "File Loaded",
    exportTime: "Exported:",
    version: "Version:",
    highlights: "Highlights:",
    notes: "Notes:",
    books: "Books:",
    importOptions: "Import Options",
    mergeData: "Merge with existing data (same ID will overwrite)",
    overwriteProgress: "Overwrite reading progress",
    overwriteSettings: "Overwrite settings",
    reselect: "Reselect",
    startImport: "Start Import",
    importing: "Importing...",
    importSuccess: "Import Successful",
    partialImport: "Partial Import",
    importFailed: "Import Failed",
    viewWarnings: "View Warnings",
    dataStoredLocally: "Data is stored locally in your browser. Please backup regularly.",
  },
}

export function DataManager({ open, onOpenChange, onImportComplete, language }: DataManagerProps) {
  const l = labels[language]
  const [activeTab, setActiveTab] = useState<"export" | "import">("export")
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeReadingStates: true,
    includeProgress: true,
    includeSettings: true,
    includeTTSSettings: true,
  })
  const [exportSummary, setExportSummary] = useState<ReturnType<typeof getExportSummary> | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ReturnType<typeof getImportPreview> | null>(null)
  const [importData, setImportData] = useState<ExportData | null>(null)
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    merge: true,
    overwriteProgress: true,
    overwriteSettings: true,
  })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportErrors, setShowImportErrors] = useState(false)
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Update export summary when options change
  const updateExportOptions = useCallback((key: keyof ExportOptions, value: boolean) => {
    const newOptions = { ...exportOptions, [key]: value }
    setExportOptions(newOptions)
    setExportSummary(getExportSummary(newOptions))
  }, [exportOptions])
  
  // Initialize export summary
  useState(() => {
    setExportSummary(getExportSummary(exportOptions))
  })
  
  // Handle export
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = exportUserData(exportOptions)
      downloadExportFile(data)
      toast.success(l.exportSuccess, {
        description: l.exportSuccessDesc(data.metadata.totalHighlights, data.metadata.totalNotes),
      })
    } catch (error) {
      toast.error(l.exportFailed, {
        description: error instanceof Error ? error.message : l.unknownError,
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Reset state
    setImportFile(file)
    setImportPreview(null)
    setImportData(null)
    setImportResult(null)
    setValidationErrors([])
    
    // Load and validate file
    const result = await loadImportFile(file)
    
    if (result.parseError) {
      setValidationErrors([result.parseError])
      toast.error(l.exportFailed, { description: result.parseError })
      return
    }
    
    if (result.validationErrors.length > 0) {
      setValidationErrors(result.validationErrors.map((e) => `${e.path}: ${e.message}`))
      toast.error(l.validationError, {
        description: `${result.validationErrors.length} errors found`,
      })
      return
    }
    
    if (result.data) {
      setImportData(result.data)
      setImportPreview(getImportPreview(result.data))
      toast.success(l.fileLoaded, {
        description: language === "english" ? "Please review and click import" : "请检查预览后点击导入",
      })
    }
  }
  
  // Handle import
  const handleImport = async () => {
    if (!importData) return
    
    setIsImporting(true)
    try {
      const result = importUserData(importData, importOptions)
      setImportResult(result)
      
      if (result.status === "success") {
        toast.success("导入成功", { description: result.message })
        onImportComplete?.()
      } else if (result.status === "partial") {
        toast.warning("部分导入成功", { description: result.message })
        onImportComplete?.()
      } else {
        toast.error("导入失败", { description: result.message })
      }
    } catch (error) {
      toast.error("导入失败", {
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setIsImporting(false)
    }
  }
  
  // Reset import state
  const resetImport = () => {
    setImportFile(null)
    setImportPreview(null)
    setImportData(null)
    setImportResult(null)
    setValidationErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{l.title}</DialogTitle>
          <DialogDescription>
            {l.description}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "export" | "import")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {l.exportTab}
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {l.importTab}
            </TabsTrigger>
          </TabsList>
          
          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{l.selectContent}</h4>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-highlights"
                    checked={exportOptions.includeReadingStates}
                    onCheckedChange={(checked) =>
                      updateExportOptions("includeReadingStates", checked as boolean)
                    }
                  />
                  <Label htmlFor="export-highlights" className="text-sm">
                    {l.highlightsAndNotes}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-progress"
                    checked={exportOptions.includeProgress}
                    onCheckedChange={(checked) =>
                      updateExportOptions("includeProgress", checked as boolean)
                    }
                  />
                  <Label htmlFor="export-progress" className="text-sm">
                    {l.readingProgress}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-settings"
                    checked={exportOptions.includeSettings}
                    onCheckedChange={(checked) =>
                      updateExportOptions("includeSettings", checked as boolean)
                    }
                  />
                  <Label htmlFor="export-settings" className="text-sm">
                    {l.readerSettings}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-tts"
                    checked={exportOptions.includeTTSSettings}
                    onCheckedChange={(checked) =>
                      updateExportOptions("includeTTSSettings", checked as boolean)
                    }
                  />
                  <Label htmlFor="export-tts" className="text-sm">
                    {l.voiceSettings}
                  </Label>
                </div>
              </div>
            </div>
            
            {exportSummary && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{l.exportPreview}</AlertTitle>
                <AlertDescription className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{l.highlightCount}</span>
                    <Badge variant="secondary">{exportSummary.totalHighlights}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>{l.noteCount}</span>
                    <Badge variant="secondary">{exportSummary.totalNotes}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>{l.booksInvolved}</span>
                    <Badge variant="secondary">{exportSummary.booksCount}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>{l.estimatedSize}</span>
                    <Badge variant="secondary">
                      {formatExportSize(exportUserData(exportOptions))}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button
                onClick={handleExport}
                disabled={isExporting || !exportOptions.includeReadingStates && !exportOptions.includeProgress}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {l.exporting}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {l.exportButton}
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4 mt-4">
            {/* File Upload */}
            {!importPreview && (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileJson className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    {l.clickToSelect}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.supportFormat}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
                
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{l.validationError}</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-2 text-sm list-disc pl-4 space-y-1">
                        {validationErrors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li>...{validationErrors.length - 5} {language === "english" ? "more errors" : "个错误"}</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {/* Import Preview */}
            {importPreview && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>{l.fileLoaded}</AlertTitle>
                  <AlertDescription className="mt-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">{l.exportTime}</span>
                        <span className="ml-2">{formatDate(importPreview.exportedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{l.version}</span>
                        <span className="ml-2">{importPreview.version}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{l.highlights}</span>
                        <Badge variant="secondary" className="ml-2">{importPreview.totalHighlights}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{l.notes}</span>
                        <Badge variant="secondary" className="ml-2">{importPreview.totalNotes}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{l.books}</span>
                        <Badge variant="secondary" className="ml-2">{importPreview.booksCount}</Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{l.importOptions}</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="import-merge"
                        checked={importOptions.merge}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, merge: checked as boolean })
                        }
                      />
                      <Label htmlFor="import-merge" className="text-sm">
                        {l.mergeData}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="import-progress"
                        checked={importOptions.overwriteProgress}
                        onCheckedChange={(checked) => 
                          setImportOptions({ ...importOptions, overwriteProgress: checked as boolean })
                        }
                      />
                      <Label htmlFor="import-progress" className="text-sm">
                        覆盖阅读进度
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="import-settings"
                        checked={importOptions.overwriteSettings}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, overwriteSettings: checked as boolean })
                        }
                      />
                      <Label htmlFor="import-settings" className="text-sm">
                        {l.overwriteSettings}
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Import Result */}
                {importResult && (
                  <Alert variant={importResult.status === "success" ? "default" : "destructive"}>
                    {importResult.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {importResult.status === "success" ? l.importSuccess :
                       importResult.status === "partial" ? l.partialImport : l.importFailed}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="text-sm">{importResult.message}</p>
                      
                      {importResult.warnings.length > 0 && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => setShowImportErrors(!showImportErrors)}
                          >
                            {l.viewWarnings} ({importResult.warnings.length})
                            {showImportErrors ? (
                              <ChevronUp className="ml-1 h-3 w-3" />
                            ) : (
                              <ChevronDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                          
                          {showImportErrors && (
                            <ul className="mt-2 text-xs list-disc pl-4 space-y-1">
                              {importResult.warnings.map((warning, i) => (
                                <li key={i}>{warning}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetImport}
                    disabled={isImporting}
                  >
                    {l.reselect}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || importResult?.status === "success"}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {l.importing}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {l.startImport}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {l.dataStoredLocally}
        </div>
      </DialogContent>
    </Dialog>
  )
}