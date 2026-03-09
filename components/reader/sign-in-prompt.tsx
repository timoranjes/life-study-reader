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
import { LogIn, X, Clock, Ban } from "lucide-react"
import {
  shouldShowSignInPrompt,
  dismissSignInPromptGrace,
  setNeverRemindSignIn,
} from "@/lib/sign-in-prompt"
import type { Language } from "@/lib/reading-data"
import { SignInButton } from "@clerk/nextjs"

interface SignInPromptProps {
  language: Language
}

// Multilingual labels
const labels = {
  simplified: {
    title: "登录同步",
    description: "登录以在所有设备上同步您的阅读进度、书签、高亮和笔记。",
    signIn: "登录",
    remindLater: "稍后提醒",
    neverRemind: "不再提醒",
    remindLaterTitle: "稍后提醒",
    remindLaterDesc: "我们将在几天后再次提醒您登录。请注意，数据仅存储在您的浏览器本地，清除浏览器数据可能导致数据丢失。",
    neverRemindTitle: "不再提醒",
    neverRemindDesc: "您确定不再接收登录提醒吗？您可以在设置中重新启用此提醒。",
    cancel: "取消",
    confirm: "确定",
  },
  traditional: {
    title: "登入同步",
    description: "登入以在所有裝置上同步您的閱讀進度、書籤、高亮和筆記。",
    signIn: "登入",
    remindLater: "稍後提醒",
    neverRemind: "不再提醒",
    remindLaterTitle: "稍後提醒",
    remindLaterDesc: "我們將在幾天後再次提醒您登入。請注意，數據僅存儲在您的瀏覽器本地，清除瀏覽器數據可能導致數據丟失。",
    neverRemindTitle: "不再提醒",
    neverRemindDesc: "您確定不再接收登入提醒嗎？您可以在設定中重新啟用此提醒。",
    cancel: "取消",
    confirm: "確定",
  },
  english: {
    title: "Sign In to Sync",
    description: "Sign in to sync your reading progress, bookmarks, highlights, and notes across all your devices.",
    signIn: "Sign In",
    remindLater: "Remind Later",
    neverRemind: "Never Remind",
    remindLaterTitle: "Remind Later",
    remindLaterDesc: "We will remind you again in a few days. Note that data is stored locally in your browser. Clearing browser data may cause data loss.",
    neverRemindTitle: "Never Remind",
    neverRemindDesc: "Are you sure you do not want to be reminded to sign in? You can re-enable this reminder in settings.",
    cancel: "Cancel",
    confirm: "Confirm",
  },
}

export function SignInPrompt({ language }: SignInPromptProps) {
  const l = labels[language]
  const [showPrompt, setShowPrompt] = useState(false)
  const [showRemindLaterDialog, setShowRemindLaterDialog] = useState(false)
  const [showNeverRemindDialog, setShowNeverRemindDialog] = useState(false)
  
  // Check on mount if we should show the prompt
  useEffect(() => {
    if (shouldShowSignInPrompt()) {
      setShowPrompt(true)
    }
  }, [])
  
  const handleDismiss = () => {
    setShowPrompt(false)
  }
  
  const handleRemindLater = () => {
    setShowRemindLaterDialog(true)
  }
  
  const confirmRemindLater = () => {
    dismissSignInPromptGrace()
    setShowPrompt(false)
    setShowRemindLaterDialog(false)
  }
  
  const handleNeverRemind = () => {
    setShowNeverRemindDialog(true)
  }
  
  const confirmNeverRemind = () => {
    setNeverRemindSignIn()
    setShowPrompt(false)
    setShowNeverRemindDialog(false)
  }
  
  if (!showPrompt) return null
  
  return (
    <>
      <Alert className="mb-4 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
        <LogIn className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700 dark:text-blue-400">{l.title}</AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-300">
          <p className="mb-2">
            {l.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <SignInButton mode="modal">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <LogIn className="h-4 w-4 mr-1" />
                {l.signIn}
              </Button>
            </SignInButton>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemindLater}
              className="border-blue-600 text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              <Clock className="h-4 w-4 mr-1" />
              {l.remindLater}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNeverRemind}
              className="text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              <Ban className="h-4 w-4 mr-1" />
              {l.neverRemind}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900 ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      {/* Remind Later Confirmation Dialog */}
      <AlertDialog open={showRemindLaterDialog} onOpenChange={setShowRemindLaterDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{l.remindLaterTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {l.remindLaterDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{l.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemindLater}>{l.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Never Remind Confirmation Dialog */}
      <AlertDialog open={showNeverRemindDialog} onOpenChange={setShowNeverRemindDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{l.neverRemindTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {l.neverRemindDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{l.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNeverRemind}>{l.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}