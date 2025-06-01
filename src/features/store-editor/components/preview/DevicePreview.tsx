import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Smartphone, Tablet, Monitor, Laptop, Watch, RotateCw, Maximize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DevicePreviewProps {
  children: React.ReactNode
  className?: string
}

const devices = [
  { id: 'desktop', name: 'سطح المكتب', icon: Monitor, width: 1440, height: 900 },
  { id: 'laptop', name: 'لابتوب', icon: Laptop, width: 1366, height: 768 },
  { id: 'tablet', name: 'تابلت', icon: Tablet, width: 768, height: 1024 },
  { id: 'mobile', name: 'موبايل', icon: Smartphone, width: 375, height: 812 },
  { id: 'watch', name: 'ساعة ذكية', icon: Watch, width: 200, height: 250 },
]

const popularDevices = [
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'Samsung Galaxy S23', width: 360, height: 780 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'MacBook Pro', width: 1440, height: 900 },
]

export const DevicePreview: React.FC<DevicePreviewProps> = ({ children, className }) => {
  const [selectedDevice, setSelectedDevice] = useState('desktop')
  const [isRotated, setIsRotated] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentDevice = devices.find(d => d.id === selectedDevice) || devices[0]
  const width = isRotated && selectedDevice !== 'desktop' ? currentDevice.height : currentDevice.width
  const height = isRotated && selectedDevice !== 'desktop' ? currentDevice.width : currentDevice.height

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(25, Math.min(200, prev + delta)))
  }

  return (
    <div className={cn('relative h-full flex flex-col', className)}>
      {/* Device Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-4">
          <Tabs value={selectedDevice} onValueChange={setSelectedDevice}>
            <TabsList className="bg-gray-100 dark:bg-gray-700">
              {devices.map((device) => {
                const Icon = device.icon
                return (
                  <TabsTrigger key={device.id} value={device.id} className="gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{device.name}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          {/* Device Actions */}
          <div className="flex items-center gap-2">
            {/* Rotate */}
            {selectedDevice !== 'desktop' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsRotated(!isRotated)}
                className="transition-transform"
                style={{ transform: isRotated ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded-lg px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom(-10)}
                className="h-7 w-7 p-0"
              >
                -
              </Button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom(10)}
                className="h-7 w-7 p-0"
              >
                +
              </Button>
            </div>

            {/* Fullscreen */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Device Info */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{width} × {height} px</span>
          <div className="flex gap-2">
            {popularDevices.map((device, index) => (
              <button
                key={index}
                onClick={() => {
                  const matchingDevice = devices.find(d => 
                    d.width === device.width || d.height === device.height
                  )
                  if (matchingDevice) {
                    setSelectedDevice(matchingDevice.id)
                  }
                }}
                className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {device.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className={cn(
        'flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto relative',
        isFullscreen && 'fixed inset-0 z-50'
      )}>
        <div className="flex items-center justify-center min-h-full p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedDevice}-${isRotated}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: zoom / 100 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'relative bg-white dark:bg-gray-800 shadow-2xl transition-all',
                selectedDevice === 'mobile' && 'rounded-[2.5rem] ring-8 ring-gray-800',
                selectedDevice === 'tablet' && 'rounded-[1.5rem] ring-8 ring-gray-700',
                selectedDevice === 'laptop' && 'rounded-t-lg',
                selectedDevice === 'watch' && 'rounded-[3rem] ring-8 ring-gray-800',
              )}
              style={{
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              {/* Device Frame Details */}
              {selectedDevice === 'mobile' && (
                <>
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-2xl" />
                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full" />
                </>
              )}

              {selectedDevice === 'laptop' && (
                <>
                  {/* Laptop Base */}
                  <div className="absolute -bottom-12 left-0 right-0 h-12 bg-gray-700 rounded-b-lg">
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-600 rounded-full" />
                  </div>
                </>
              )}

              {/* Content Container */}
              <div className={cn(
                'w-full h-full overflow-auto',
                selectedDevice === 'mobile' && 'rounded-[2rem]',
                selectedDevice === 'tablet' && 'rounded-[1rem]',
                selectedDevice === 'watch' && 'rounded-[2.5rem]',
              )}>
                {/* Scale content for devices */}
                <div 
                  className="origin-top-left"
                  style={{
                    transform: selectedDevice !== 'desktop' ? `scale(${width / 1440})` : 'scale(1)',
                    width: selectedDevice !== 'desktop' ? '1440px' : '100%',
                    height: selectedDevice !== 'desktop' ? `${height * (1440 / width)}px` : '100%',
                  }}
                >
                  {children}
                </div>
              </div>

              {/* Screen Reflection Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none rounded-inherit" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fullscreen Close Button */}
        {isFullscreen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}