# Debug Theme Colors Application

## Issue Summary
The organization's custom theme colors are not being applied on store pages (both subdomain and custom domain). The theme manager is loading the correct colors but they're not showing up in the UI.

## Fixes Applied

1. **Enhanced Theme Manager** (themeManager.ts):
   - Added more thorough CSS variable application with !important
   - Applied theme to multiple DOM elements (both :root and body)
   - Created comprehensive CSS selectors with higher specificity
   - Added RGB color variables for advanced CSS effects
   - Added multiple retry attempts to ensure theme application
   - Enhanced HSL to RGB conversion for better color handling

2. **Improved Application Flow** (main.tsx):
   - Added retry mechanism with progressive timing for theme application
   - Added event listener for DOMContentLoaded to reapply theme
   - Improved cleanup of old themes

3. **Enhanced Store Page Integration** (StorePage.tsx):
   - Replaced single theme application with retry mechanism
   - Added multiple delayed attempts to catch late-rendering components
   - Improved type definitions for theme settings

4. **Added Diagnostic Tools**:
   - Created theme-test.html page in public directory for visual testing
   - Enhanced debug logging with element counts and computed styles
   - Added more detailed CSS validation in the console

## Testing Steps

1. Clear browser cache and localStorage
2. Visit the store page (subdomain or custom domain)
3. Open browser DevTools and check:
   - Console logs for theme application
   - Computed styles for `--primary` CSS variable
   - Check if `<style id="bazaar-org-theme-override">` exists in document head
4. Visit `/theme-test.html` to visually check theme colors

## Expected Console Output
```
🔍 [applyInstantTheme] نوع الصفحة المكتشف: store
🎨 [applyInstantTheme] تم تحميل ثيم المؤسسة من التخزين: {primaryColor: '#10b981', ...}
🎨 [themeManager] تطبيق اللون الأساسي: {original: '#10b981', hsl: '160 84% 39%'}
🎨 [themeManager] CSS Override being applied: [CSS content]
✅ [themeManager] تم تطبيق الثيم بنجاح
🔍 [themeManager] عدد العناصر المرئية المتأثرة: 12
```

## If Colors Still Don't Apply

1. Check if there are any CSS files with higher specificity overriding the colors
2. Verify the organization settings are being loaded correctly
3. Check if the theme is being re-applied after React renders
4. Look for any inline styles that might override CSS variables
5. Try using the theme test page at `/theme-test.html` to isolate the issue
6. Check browser compatibility (especially older browsers that may not support CSS variables)
7. Verify that no plugins or browser extensions are interfering with CSS