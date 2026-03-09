'use client'

import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs'
import { SyncSettings } from '@/components/reader/sync-settings'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cloud, CloudOff, Info } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cloudSyncLabels } from './labels'

interface CloudSyncSectionProps {
  language: 'traditional' | 'simplified' | 'english'
  toSimplified: (text: string) => string
}

export function CloudSyncSection({ language, toSimplified }: CloudSyncSectionProps) {
  const { isSignedIn } = useUser()
  const { theme } = useTheme()
  
  const l = language === 'english' 
    ? cloudSyncLabels.english 
    : language === 'simplified' 
      ? { 
          title: toSimplified(cloudSyncLabels.simplified.title), 
          description: toSimplified(cloudSyncLabels.simplified.description), 
          optionalFeature: toSimplified(cloudSyncLabels.simplified.optionalFeature), 
          optionalDescription: toSimplified(cloudSyncLabels.simplified.optionalDescription), 
          notSignedIn: toSimplified(cloudSyncLabels.simplified.notSignedIn), 
          notSignedInDescription: toSimplified(cloudSyncLabels.simplified.notSignedInDescription), 
          signIn: toSimplified(cloudSyncLabels.simplified.signIn), 
          signUp: toSimplified(cloudSyncLabels.simplified.signUp), 
          learnMore: toSimplified(cloudSyncLabels.simplified.learnMore) 
        }
      : cloudSyncLabels.traditional

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

  return (
    <div className="space-y-4">
      {/* Optional feature notice */}
      <Card className={`${cardClass} border`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className={`h-5 w-5 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <p className={`text-sm font-medium ${textPrimaryClass}`}>{l.optionalFeature}</p>
              <p className={`text-xs ${textSecondaryClass} mt-1`}>{l.optionalDescription}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync settings or sign-in prompt */}
      {isSignedIn ? (
        <SyncSettings />
      ) : (
        <Card className={`${cardClass} border`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CloudOff className={`h-6 w-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              <h3 className={`text-lg font-semibold ${textPrimaryClass}`}>{l.notSignedIn}</h3>
            </div>
            <p className={`text-sm ${textSecondaryClass} mb-4`}>
              {l.notSignedInDescription}
            </p>
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <Button variant="outline" className="flex-1">
                  {l.signIn}
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="flex-1">
                  {l.signUp}
                </Button>
              </SignUpButton>
            </div>
            <p className={`text-xs ${textSecondaryClass} mt-4`}>
              {l.learnMore}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}