'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Target, Plus, Trash2, CheckCircle, Circle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  loadGoals,
  addGoal,
  deleteGoal,
  refreshGoalsProgress,
  checkAndResetGoalPeriods,
  type ReadingGoal,
} from '@/lib/reading-tracker'

interface GoalsSectionProps {
  language: 'traditional' | 'simplified' | 'english'
  toSimplified: (text: string) => string
}

const labels = {
  traditional: {
    title: '閱讀目標',
    addGoal: '新增目標',
    daily: '每日',
    weekly: '每週',
    monthly: '每月',
    messages: '篇',
    minutes: '分鐘',
    target: '目標',
    progress: '進度',
    completed: '已完成！',
    remaining: '剩餘',
    noGoals: '尚未設定目標',
    noGoalsDescription: '設定閱讀目標來追蹤您的進度',
    deleteGoal: '刪除',
    targetType: '目標類型',
    targetAmount: '目標數量',
    targetUnit: '目標單位',
    save: '儲存',
    cancel: '取消',
    messagesGoal: '閱讀信息數',
    timeGoal: '閱讀時間',
    periodReset: '週期重置',
  },
  simplified: {
    title: '阅读目标',
    addGoal: '新增目标',
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    messages: '篇',
    minutes: '分钟',
    target: '目标',
    progress: '进度',
    completed: '已完成！',
    remaining: '剩余',
    noGoals: '尚未设定目标',
    noGoalsDescription: '设定阅读目标来追踪您的进度',
    deleteGoal: '删除',
    targetType: '目标类型',
    targetAmount: '目标数量',
    targetUnit: '目标单位',
    save: '保存',
    cancel: '取消',
    messagesGoal: '阅读信息数',
    timeGoal: '阅读时间',
    periodReset: '周期重置',
  },
  english: {
    title: 'Reading Goals',
    addGoal: 'Add Goal',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    messages: 'messages',
    minutes: 'minutes',
    target: 'Target',
    progress: 'Progress',
    completed: 'Completed!',
    remaining: 'remaining',
    noGoals: 'No Goals Set',
    noGoalsDescription: 'Set reading goals to track your progress',
    deleteGoal: 'Delete',
    targetType: 'Goal Type',
    targetAmount: 'Target Amount',
    targetUnit: 'Target Unit',
    save: 'Save',
    cancel: 'Cancel',
    messagesGoal: 'Messages to read',
    timeGoal: 'Reading time',
    periodReset: 'Period resets',
  },
}

export function GoalsSection({ language, toSimplified }: GoalsSectionProps) {
  const { theme } = useTheme()
  const [goals, setGoals] = useState<ReadingGoal[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    type: 'daily' as 'daily' | 'weekly' | 'monthly',
    target: 1,
    unit: 'messages' as 'messages' | 'minutes',
  })
  const [mounted, setMounted] = useState(false)

  const effectiveLanguage = language === 'simplified' ? 'simplified' : language
  const t = labels[effectiveLanguage]

  useEffect(() => {
    setMounted(true)
    loadGoalsFromStorage()
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadGoalsFromStorage()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Refresh goals periodically to update progress
    const interval = setInterval(() => {
      const updatedGoals = refreshGoalsProgress()
      setGoals(updatedGoals)
    }, 60000) // Every minute
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadGoalsFromStorage = () => {
    // Check and reset goal periods first (handles period reset when user hasn't read for a while)
    checkAndResetGoalPeriods()
    // Then refresh progress from daily stats (source of truth)
    const refreshedGoals = refreshGoalsProgress()
    setGoals(refreshedGoals)
  }

  const handleAddGoal = () => {
    const target = Math.max(1, newGoal.target) // Ensure minimum of 1
    const updatedGoals = addGoal(newGoal.type, target, newGoal.unit)
    setGoals(updatedGoals)
    setShowAddForm(false)
    setNewGoal({ type: 'daily', target: 1, unit: 'messages' })
  }

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = deleteGoal(id)
    setGoals(updatedGoals)
  }

  const cardClass = theme === 'sepia'
    ? 'bg-[#f5edd8]/80 border-[#d4c4a8]'
    : theme === 'dark'
      ? 'bg-zinc-900/60 border-zinc-800'
      : 'bg-white/70 border-slate-200/60'

  const textPrimaryClass = theme === 'sepia'
    ? 'text-stone-900'
    : theme === 'dark'
      ? 'text-slate-100'
      : 'text-slate-900'

  const textSecondaryClass = theme === 'sepia'
    ? 'text-stone-700'
    : theme === 'dark'
      ? 'text-slate-300'
      : 'text-slate-600'

  if (!mounted) return null

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return t.daily
      case 'weekly': return t.weekly
      case 'monthly': return t.monthly
      default: return type
    }
  }

  const getUnitLabel = (unit: string) => {
    return unit === 'messages' ? t.messages : t.minutes
  }

  const getGoalDescription = (goal: ReadingGoal) => {
    const typeLabel = getTypeLabel(goal.type)
    const unitLabel = getUnitLabel(goal.unit)
    return `${typeLabel} ${goal.target} ${unitLabel}`
  }

  return (
    <div className="space-y-4">
      {/* Add Goal Button */}
      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t.addGoal}
        </Button>
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label className={textSecondaryClass}>{t.targetType}</Label>
              <Select
                value={newGoal.type}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  setNewGoal({ ...newGoal, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.daily}</SelectItem>
                  <SelectItem value="weekly">{t.weekly}</SelectItem>
                  <SelectItem value="monthly">{t.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={textSecondaryClass}>{t.targetAmount}</Label>
              <Input
                type="number"
                min={1}
                value={newGoal.target}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value);
                  setNewGoal({ ...newGoal, target: isNaN(parsed) ? 1 : parsed });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className={textSecondaryClass}>{t.targetUnit}</Label>
              <Select
                value={newGoal.unit}
                onValueChange={(value: 'messages' | 'minutes') => 
                  setNewGoal({ ...newGoal, unit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="messages">{t.messagesGoal}</SelectItem>
                  <SelectItem value="minutes">{t.timeGoal}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddGoal} className="flex-1">
                {t.save}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                className="flex-1"
              >
                {t.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {goals.length === 0 && !showAddForm ? (
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-6 text-center">
            <Target className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${textPrimaryClass}`}>{t.noGoals}</h3>
            <p className={`text-sm ${textSecondaryClass}`}>{t.noGoalsDescription}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progressPercent = Math.min(Math.round((goal.progress / goal.target) * 100), 100)
            const isCompleted = goal.progress >= goal.target

            return (
              <Card key={goal.id} className={`${cardClass} border`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                      )}
                      <span className={`text-sm font-medium ${textPrimaryClass}`}>
                        {getGoalDescription(goal)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={textSecondaryClass}>{t.progress}</span>
                      <span className={textPrimaryClass}>
                        {Math.round(goal.progress)} / {goal.target} {getUnitLabel(goal.unit)}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className={cn(
                        isCompleted ? "text-green-500 font-medium" : textSecondaryClass
                      )}>
                        {isCompleted ? t.completed : `${Math.max(0, goal.target - Math.round(goal.progress))} ${getUnitLabel(goal.unit)} ${t.remaining}`}
                      </span>
                      <span className={cn(
                        "font-medium",
                        isCompleted ? "text-green-500" : textPrimaryClass
                      )}>
                        {progressPercent}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}