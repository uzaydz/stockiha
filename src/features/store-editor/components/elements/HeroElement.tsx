import React from 'react'
import { ElementConfig } from '../../types/editor.types'
import { ClassicEcommerceHero } from '../hero-templates/ClassicEcommerceHero'
import { ModernGlassHero } from '../hero-templates/ModernGlassHero'
import { NeobrutalismHero } from '../hero-templates/NeobrutalismHero'
import { MinimalHero } from '../hero-templates/MinimalHero'
import { CreativeHero } from '../hero-templates/CreativeHero'
import { VideoHero } from '../hero-templates/VideoHero'
import { FuturisticHero } from '../hero-templates/FuturisticHero'

interface HeroElementProps {
  element: ElementConfig
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const HeroElement: React.FC<HeroElementProps> = ({
  element,
  isSelected,
  onEdit,
  onSelect,
}) => {
  const settings = element.properties.storeSettings as any
  const selectedTemplate = settings?.template || 'classic'

  // Template renderer
  const renderTemplate = () => {
    const templateProps = {
      settings,
      isSelected,
      onEdit,
      onSelect,
    }

    switch (selectedTemplate) {
      case 'modern-glass':
        return <ModernGlassHero {...templateProps} />
      case 'neobrutalism':
        return <NeobrutalismHero {...templateProps} />
      case 'minimal':
        return <MinimalHero {...templateProps} />
      case 'creative':
        return <CreativeHero {...templateProps} />
      case 'video':
        return <VideoHero {...templateProps} />
      case 'futuristic':
        return <FuturisticHero {...templateProps} />
      case 'classic':
      default:
        return <ClassicEcommerceHero {...templateProps} />
    }
  }

  return renderTemplate()
}

// Button styles for use in templates
export const buttonStyles = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white',
  teal: 'bg-teal-600 text-white hover:bg-teal-700',
  blue: 'bg-blue-600 text-white hover:bg-blue-700',
  purple: 'bg-purple-600 text-white hover:bg-purple-700',
  amber: 'bg-amber-600 text-white hover:bg-amber-700',
  emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
  rose: 'bg-rose-600 text-white hover:bg-rose-700',
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-700',
  neutral: 'bg-neutral-700 text-white hover:bg-neutral-800',
  glass: 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20',
}

export const outlineButtonStyles = {
  primary: 'border-primary text-primary hover:bg-primary hover:text-primary-foreground',
  secondary: 'border-secondary text-secondary-foreground hover:bg-secondary',
  gradient: 'border-2 border-transparent bg-clip-border bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600',
  teal: 'border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white',
  blue: 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white',
  purple: 'border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white',
  amber: 'border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white',
  emerald: 'border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white',
  rose: 'border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white',
  indigo: 'border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white',
  neutral: 'border-neutral-700 text-neutral-700 hover:bg-neutral-700 hover:text-white',
  glass: 'border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm',
}