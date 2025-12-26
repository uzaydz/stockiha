export const COURSES_OPERATIONS_TAB_BY_COURSE_SLUG: Record<string, string> = {
  'digital-marketing': 'digital-marketing',
  'e-commerce': 'e-commerce',
  'e-commerce-store': 'e-commerce-store',
  'tiktok-marketing': 'tiktok-marketing',
  'tiktok-ads': 'tiktok-marketing',
  'traditional-business': 'traditional-business',
  'service-providers': 'service-providers',
  'system-training': 'system-training',
};

export function getCoursesOperationsPath(tab?: string): string {
  return `/dashboard/courses-operations/${tab ?? 'all'}`;
}

export function getCourseEntryPath(courseSlug: string): string {
  const tab = COURSES_OPERATIONS_TAB_BY_COURSE_SLUG[courseSlug] ?? courseSlug;
  return getCoursesOperationsPath(tab);
}

