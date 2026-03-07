"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Download, X, AlertTriangle } from "lucide-react"
import {
  shouldShowBackupReminder,
  dismissBackupReminder,
  recordBackup,
  getBackupStatus,
} from "@/lib/backup-reminder"
import { exportAndDownload } from "@/lib/data-export"
import type { Language } from "@/lib/reading-data"
import { toast } from "sonner"

interface BackupReminderProps {
  language: Language
}

// Multilingual labels
const labels = {
  simplified: {
    title: "备份提醒",
    hasBackup: (time: string) => `您上次备份是在 ${time}。建议定期备份您的阅读数据。`,
    noBackup: "您还没有备份过数据。建议定期备份以防止数据丢失。",
    backupNow: "立即备份",
    remindLater: "稍后提醒",
    backupSuccess: "备份成功",
    backupSuccessDesc: "您的数据已导出，请妥善保存备份文件",
    backupFailed: "备份失败",
    unknownError: "未知错误",
    dialogTitle: "稍后提醒",
    dialogDescription: "我们将在几天后再次提醒您备份数据。请注意，数据仅存储在您的浏览器本地，清除浏览器数据可能导致数据丢失。",
    cancel: "取消",
    confirm: "确定",
  },
  traditional: {
    title: "備份提醒",
    hasBackup: (time: string) => `您上次備份是在 ${time}。建議定期備份您的閱讀數據。`,
    noBackup: "您還沒有備份過數據。建議定期備份以防止數據丟失。",
    backupNow: "立即備份",
    remindLater: "稍後提醒",
    backupSuccess: "備份成功",
    backupSuccessDesc: "您的數據已導出，請妥善保存備份文件",
    backupFailed: "備份失敗",
    unknownError: "未知錯誤",
    dialogTitle: "稍後提醒",
    dialogDescription: "我們將在幾天後再次提醒您備份數據。請注意，數據僅存儲在您的瀏覽器本地，清除瀏覽器數據可能導致數據丟失。",
    cancel: "取消",
    confirm: "確定",
  },
  english: {
    title: "Backup Reminder",
    hasBackup: (time: string) => `Your last backup was ${time}. Regular backups are recommended.`,
    noBackup: "You haven't backed up your data yet. Regular backups prevent data loss.",
    backupNow: "Backup Now",
    remindLater: "Remind Later",
    backupSuccess: "Backup Successful",
    backupSuccessDesc: "Your data has been exported. Please save the backup file safely.",
    backupFailed: "Backup Failed",
    unknownError: "Unknown error",
    dialogTitle: "Remind Later",
    dialogDescription: "We'll remind you again in a few days. Note that data is stored locally in your browser. Clearing browser data may cause data loss.",
    cancel: "Cancel",
    confirm: "OK",
  },
}

export function BackupReminder({ language }: BackupReminderProps) {
  const l = labels[language]
  const [showReminder, setShowReminder] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [backupStatus, setBackupStatus] = useState<ReturnType<typeof getBackupStatus> | null>(null)
  
  // Check on mount if we should show reminder
  useEffect(() => {
    if (shouldShowBackupReminder()) {
      setShowReminder(true)
      setBackupStatus(getBackupStatus())
    }
  }, [])
  
  const handleBackupNow = () => {
    try {
      exportAndDownload()
      recordBackup()
      setShowReminder(false)
      toast.success(l.backupSuccess, {
        description: l.backupSuccessDesc,
      })
    } catch (error) {
      toast.error(l.backupFailed, {
        description: error instanceof Error ? error.message : l.unknownError,
      })
    }
  }
  
  const handleDismiss = () => {
    dismissBackupReminder()
    setShowReminder(false)
  }
  
  const handleRemindLater = () => {
    setShowConfirmDialog(true)
  }
  
  const confirmRemindLater = () => {
    dismissBackupReminder()
    setShowReminder(false)
    setShowConfirmDialog(false)
  }
  
  if (!showReminder) return null
  
  return (
    <>
      <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">{l.title}</AlertTitle>
        <AlertDescription className="text-amber-600 dark:text-amber-300">
          <p className="mb-2">
            {backupStatus?.hasBackup
              ? l.hasBackup(backupStatus.timeSinceBackup || "")
              : l.noBackup}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleBackupNow}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              {l.backupNow}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemindLater}
              className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              {l.remindLater}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{l.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {l.dialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{l.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemindLater}>{l.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}