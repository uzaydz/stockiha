import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { v4 as uuidv4 } from 'uuid';

// Import our new components
import BasicContentSettings from './problem-solution/BasicContentSettings';
import StyleSettings from './problem-solution/StyleSettings';
import BackgroundSettings from './problem-solution/BackgroundSettings';
import ItemsManager from './problem-solution/ItemsManager';

interface ProblemSolutionComponentEditorProps {
  settings: any;
  onChange: (newSettings: any) => void;
}

const ProblemSolutionComponentEditor: React.FC<ProblemSolutionComponentEditorProps> = ({ 
  settings, 
  onChange 
}) => {
  const [activeTab, setActiveTab] = useState('content');

  // Handle basic setting changes
  const handleSettingChange = (key: string, value: any) => {
    let updatedSettings = {
      ...settings,
      [key]: value
    };

    // إذا تم تغيير لون الخلفية، أوقف التدرج تلقائياً
    if (key === 'backgroundColor') {
      updatedSettings.useGradient = false;
    }

    onChange(updatedSettings);
  };

  // Handle changes in problem-solution item
  const handleItemChange = (index: number, key: string, value: any) => {
    const updatedItems = [...(settings.items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [key]: value
    };
    
    onChange({
      ...settings,
      items: updatedItems
    });
  };

  // Add a new problem-solution item
  const handleAddItem = () => {
    const existingItems = settings.items || [];
    const newItem = {
      id: uuidv4(),
      problemTitle: `مشكلة ${existingItems.length + 1}`,
      problemDescription: 'وصف المشكلة هنا...',
      problemImage: 'https://picsum.photos/id/36/400/300',
      problemIconName: 'AlertCircle',
      problemIconColor: '#ef4444',
      solutionTitle: `الحل ${existingItems.length + 1}`,
      solutionDescription: 'وصف الحل هنا...',
      solutionImage: 'https://picsum.photos/id/42/400/300',
      solutionIconName: 'CheckCircle',
      solutionIconColor: '#10b981',
      animationDelay: existingItems.length * 0.1
    };
    
    onChange({
      ...settings,
      items: [...existingItems, newItem]
    });
  };

  // Remove a problem-solution item
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...(settings.items || [])];
    updatedItems.splice(index, 1);
    
    onChange({
      ...settings,
      items: updatedItems
    });
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="flex flex-col h-full bg-background border rounded-md">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">إعدادات مكون المشكلة والحل</h2>
          <p className="text-sm text-muted-foreground mt-1">
            قم بتخصيص المظهر والمحتوى والخلفية والعناصر
          </p>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Tabs Navigation */}
            <div className="px-4 pt-4 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="content" className="text-xs px-2">
                  المحتوى
                </TabsTrigger>
                <TabsTrigger value="style" className="text-xs px-2">
                  التصميم
                </TabsTrigger>
                <TabsTrigger value="background" className="text-xs px-2">
                  الخلفية
                </TabsTrigger>
                <TabsTrigger value="items" className="text-xs px-2">
                  العناصر
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                {/* Content Tab */}
                <TabsContent value="content" className="mt-0 focus-visible:outline-none">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">المحتوى الأساسي</CardTitle>
                      <CardDescription>
                        قم بتحرير النصوص والصور الرئيسية للمكون
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BasicContentSettings
                        settings={settings}
                        onSettingChange={handleSettingChange}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="mt-0 focus-visible:outline-none">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">التصميم والألوان</CardTitle>
                      <CardDescription>
                        قم بتخصيص الألوان والخطوط والتخطيط
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StyleSettings
                        settings={settings}
                        onSettingChange={handleSettingChange}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Background Tab */}
                <TabsContent value="background" className="mt-0 focus-visible:outline-none">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">إعدادات الخلفية</CardTitle>
                      <CardDescription>
                        قم بتخصيص خلفية المكون والتدرجات والأنماط
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BackgroundSettings
                        settings={settings}
                        onSettingChange={handleSettingChange}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="mt-0 focus-visible:outline-none">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">إدارة العناصر</CardTitle>
                      <CardDescription>
                        قم بإضافة وتحرير وترتيب عناصر المشاكل والحلول
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ItemsManager
                        settings={settings}
                        onSettingChange={handleSettingChange}
                        onItemChange={handleItemChange}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProblemSolutionComponentEditor;
