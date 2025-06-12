import React from 'react'

export const RulersOverlay = () => {
  return (
    <>
      {/* المسطرة الأفقية */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 pointer-events-none z-10">
        <div className="flex items-end h-full">
          {Array.from({ length: 100 }, (_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-gray-300 dark:border-gray-600 last:border-r-0"
              style={{ minWidth: '10px' }}
            >
              {i % 10 === 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 px-1">
                  {i * 10}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* المسطرة العمودية */}
      <div className="absolute top-0 bottom-0 left-0 w-6 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 pointer-events-none z-10">
        <div className="flex flex-col h-full">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="flex-1 border-b border-gray-300 dark:border-gray-600 last:border-b-0 flex items-center"
              style={{ minHeight: '10px' }}
            >
              {i % 10 === 0 && (
                <div 
                  className="text-xs text-gray-600 dark:text-gray-400 transform -rotate-90 whitespace-nowrap"
                  style={{ transformOrigin: 'center', fontSize: '10px' }}
                >
                  {i * 10}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* زاوية التقاطع */}
      <div className="absolute top-0 left-0 w-6 h-6 bg-gray-200 dark:bg-gray-700 border-b border-r border-gray-300 dark:border-gray-600 z-20"></div>
    </>
  )
}