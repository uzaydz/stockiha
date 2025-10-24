import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useConfirmation } from '@/context/ConfirmationContext';
import { useTenant } from '@/context/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ListChecks, Target, Boxes, ArrowLeftRight, CircleCheck } from 'lucide-react';
import type { ConfirmationAssignmentRule } from '@/types/confirmation';

const ruleTypeMeta: Record<
  ConfirmationAssignmentRule['rule_type'],
  { title: string; description: string; badge: string; icon: ReactNode }
> = {
  product: {
    title: 'حسب المنتج',
    description: 'تخصيص الموظفين بناءً على المنتج المحدد أو SKU أو العلامة التجارية.',
    badge: 'منتجات',
    icon: <Boxes className="w-5 h-5 text-blue-500" />,
  },
  category: {
    title: 'حسب الفئة',
    description: 'إرسال الطلبيات حسب الفئة أو المجموعة (إلكترونيات، أجهزة، اكسسوارات...).',
    badge: 'فئات',
    icon: <ListChecks className="w-5 h-5 text-purple-500" />,
  },
  fair_rotation: {
    title: 'توزيع عادل',
    description: 'توزيع دائري يضمن التوازن بين جميع الموظفين وتجنب الإجهاد.',
    badge: 'الطابور',
    icon: <ArrowLeftRight className="w-5 h-5 text-emerald-500" />,
  },
  priority: {
    title: 'الأولوية',
    description: 'إعطاء الأولوية لموظفين محددين حسب الأداء أو العملاء VIP.',
    badge: 'الأولوية',
    icon: <Target className="w-5 h-5 text-amber-500" />,
  },
  region: {
    title: 'حسب المنطقة',
    description: 'تعيين الطلبات حسب الولاية أو المدينة لضمان التخصص المحلي.',
    badge: 'مناطق',
    icon: <CircleCheck className="w-5 h-5 text-sky-500" />,
  },
  custom: {
    title: 'مخصص',
    description: 'قواعد متقدمة (مجموعات عمل، أوقات، حملات) باستخدام JSON.',
    badge: 'مخصص',
    icon: <Target className="w-5 h-5 text-primary" />,
  },
};

const listToString = (list: string[]) => (list && list.length ? list.join(', ') : '');
const stringToList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseRuleConfig = (rule: ConfirmationAssignmentRule | null): RuleConfigState => {
  if (!rule || !rule.config) return defaultConfigState();
  const config = rule.config as Record<string, any>;
  const normalize = (value: unknown, fallback?: string[]): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)) : fallback ? fallback : [];

  return {
    products: normalize(config.products, Array.isArray(config.items) ? config.items : []),
    categories: normalize(config.categories),
    agents: normalize(config.assign_to_agents, Array.isArray(config.agents) ? config.agents : []),
    regions: normalize(config.regions),
    priorityLevel:
      typeof config.priority_level === 'number'
        ? config.priority_level
        : typeof config.priorityLevel === 'number'
        ? config.priorityLevel
        : undefined,
    maxQueueSize:
      typeof config.max_queue_size === 'number'
        ? config.max_queue_size
        : typeof config.maxQueueSize === 'number'
        ? config.maxQueueSize
        : undefined,
    maxCurrentOrders:
      typeof config.max_current_orders === 'number'
        ? config.max_current_orders
        : typeof config.maxCurrentOrders === 'number'
        ? config.maxCurrentOrders
        : undefined,
    rotationMode: config.rotation_mode || config.rotationMode || 'fair',
    callIntervalMinutes:
      typeof config.call_interval_minutes === 'number'
        ? config.call_interval_minutes
        : typeof config.callIntervalMinutes === 'number'
        ? config.callIntervalMinutes
        : undefined,
  };
};

const buildConfigFromDraft = (draft: RuleDraft, labels: LabelMaps): Record<string, unknown> => {
  const { configState, rule_type } = draft;
  const config: Record<string, unknown> = {};

  const attachList = (key: string, value: string[], map?: Map<string, string>, labelKey?: string) => {
    if (value && value.length) {
      config[key] = value;
      const resolvedKey = labelKey ?? (map ? `${key}_labels` : undefined);
      if (resolvedKey) {
        config[resolvedKey] = map
          ? value.map((item) => map.get(item) || item)
          : value;
      }
    }
  };

  const setNumber = (key: string, value?: number) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      config[key] = value;
    }
  };

  switch (rule_type) {
    case 'product':
      attachList('products', configState.products, labels.productMap, 'product_labels');
      attachList('assign_to_agents', configState.agents, labels.agentMap, 'assign_to_agents_labels');
      attachList('categories', configState.categories, labels.categoryMap, 'category_labels');
      break;
    case 'category':
      attachList('categories', configState.categories, labels.categoryMap, 'category_labels');
      attachList('assign_to_agents', configState.agents, labels.agentMap, 'assign_to_agents_labels');
      break;
    case 'fair_rotation':
      attachList('assign_to_agents', configState.agents, labels.agentMap, 'assign_to_agents_labels');
      setNumber('max_queue_size', configState.maxQueueSize);
      setNumber('max_current_orders', configState.maxCurrentOrders);
      if (configState.rotationMode) {
        config.rotation_mode = configState.rotationMode;
      }
      break;
    case 'priority':
      attachList('assign_to_agents', configState.agents, labels.agentMap, 'assign_to_agents_labels');
      setNumber('priority_level', configState.priorityLevel);
      setNumber('call_interval_minutes', configState.callIntervalMinutes);
      break;
    case 'region':
      attachList('regions', configState.regions, undefined, 'region_labels');
      attachList('assign_to_agents', configState.agents, labels.agentMap, 'assign_to_agents_labels');
      break;
    case 'custom':
    default:
      break;
  }

  return config;
};

const buildRuleSummary = (rule: ConfirmationAssignmentRule): string[] => {
  if (!rule.config || rule.rule_type === 'custom') return [];
  const config = rule.config as Record<string, any>;
  const lines: string[] = [];

  const listToSummary = (label: string, preferred?: unknown, fallback?: unknown) => {
    const preferredList = Array.isArray(preferred) && preferred.length ? preferred : null;
    const fallbackList = !preferredList && Array.isArray(fallback) ? fallback : [];
    const values = preferredList || fallbackList;
    if (values.length) {
      lines.push(`${label}: ${values.join(', ')}`);
    }
  };

  listToSummary('المنتجات', config.product_labels, config.products);
  listToSummary('الفئات', config.category_labels, config.categories);
  listToSummary('المناطق', config.region_labels, config.regions);
  listToSummary('الموظفون', config.assign_to_agents_labels, config.assign_to_agents ?? config.agents);

  if (typeof config.priority_level === 'number') {
    lines.push(`مستوى الأولوية: ${config.priority_level}`);
  }

  if (typeof config.max_queue_size === 'number') {
    lines.push(`أقصى حجم للطابور: ${config.max_queue_size}`);
  }

  if (typeof config.max_current_orders === 'number') {
    lines.push(`عدد الطلبات المتزامنة: ${config.max_current_orders}`);
  }

  if (config.rotation_mode) {
    lines.push(`أسلوب الدوران: ${config.rotation_mode === 'fair' ? 'توزيع عادل' : 'حسب الأداء'}`);
  }

  if (typeof config.call_interval_minutes === 'number') {
    lines.push(`الفاصل بين المكالمات: ${config.call_interval_minutes} دقيقة`);
  }

  if (config.assignment_reason) {
    lines.push(`سبب التوزيع: ${config.assignment_reason}`);
  }

  return lines;
};

type OptionItem = {
  id: string;
  name: string;
  helper?: string | null;
};

type LabelMaps = {
  productMap: Map<string, string>;
  categoryMap: Map<string, string>;
  agentMap: Map<string, string>;
};

interface RuleConfigState {
  products: string[];
  categories: string[];
  agents: string[];
  regions: string[];
  priorityLevel?: number;
  maxQueueSize?: number;
  maxCurrentOrders?: number;
  rotationMode?: 'fair' | 'performance';
  callIntervalMinutes?: number;
}

interface RuleDraft {
  rule_type: ConfirmationAssignmentRule['rule_type'];
  rule_name: string;
  is_active: boolean;
  priority: number;
  configState: RuleConfigState;
  customConfig: string;
}

const defaultConfigState = (): RuleConfigState => ({
  products: [],
  categories: [],
  agents: [],
  regions: [],
  priorityLevel: undefined,
  maxQueueSize: undefined,
  maxCurrentOrders: undefined,
  rotationMode: 'fair',
  callIntervalMinutes: undefined,
});

const defaultDraft: RuleDraft = {
  rule_type: 'fair_rotation',
  rule_name: '',
  is_active: true,
  priority: 1,
  configState: defaultConfigState(),
  customConfig: '{\n  "conditions": {},\n  "actions": {}\n}',
};

export const ConfirmationDistributionManager = () => {
  const { assignmentRules, agents, upsertAssignmentRule, deleteAssignmentRule, loading, missingSchema } = useConfirmation();
  const { currentOrganization } = useTenant();
  const [activeTab, setActiveTab] = useState<ConfirmationAssignmentRule['rule_type']>('fair_rotation');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>(defaultDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<OptionItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<OptionItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(false);

  const loadReferenceData = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [{ data: productsData, error: productsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,sku')
          .eq('organization_id', currentOrganization.id)
          .order('name', { ascending: true })
          .limit(500),
        supabase
          .from('product_categories')
          .select('id,name')
          .eq('organization_id', currentOrganization.id)
          .order('name', { ascending: true })
          .limit(500),
      ]);

      if (productsError) throw productsError;
      if (categoriesError) throw categoriesError;

      setProductOptions(
        (productsData ?? [])
          .filter((product) => product.id)
          .map((product) => ({
            id: String(product.id),
            name: product.name || 'منتج بدون اسم',
            helper: product.sku || null,
          }))
      );

      setCategoryOptions(
        (categoriesData ?? [])
          .filter((category) => category.id)
          .map((category) => ({
            id: String(category.id),
            name: category.name || 'فئة بدون اسم',
          }))
      );
    } catch (error) {
      setOptionsError('تعذر تحميل قائمة المنتجات أو الفئات.');
    } finally {
      setOptionsLoading(false);
      setHasLoadedOptions(true);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    setHasLoadedOptions(false);
    setProductOptions([]);
    setCategoryOptions([]);
    setOptionsError(null);
  }, [currentOrganization?.id]);

  useEffect(() => {
    if (!isDialogOpen) return;
    if (!hasLoadedOptions && !optionsLoading) {
      loadReferenceData();
    }
  }, [isDialogOpen, hasLoadedOptions, optionsLoading, loadReferenceData]);

  const agentOptions = useMemo<OptionItem[]>(
    () =>
      agents.map((agent) => ({
        id: String(agent.id),
        name: agent.full_name,
        helper: agent.email || agent.phone || null,
      })),
    [agents]
  );

  const filteredAgentOptions = useMemo(() => {
    const term = agentSearch.trim().toLowerCase();
    if (!term) return agentOptions;
    return agentOptions.filter((option) =>
      option.name.toLowerCase().includes(term) || (option.helper ?? '').toLowerCase().includes(term)
    );
  }, [agentOptions, agentSearch]);

  const filteredProductOptions = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return productOptions;
    return productOptions.filter((option) =>
      option.name.toLowerCase().includes(term) || (option.helper ?? '').toLowerCase().includes(term)
    );
  }, [productOptions, productSearch]);

  const filteredCategoryOptions = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return categoryOptions;
    return categoryOptions.filter((option) => option.name.toLowerCase().includes(term));
  }, [categoryOptions, categorySearch]);

  const productLabelMap = useMemo(() => new Map(productOptions.map((option) => [option.id, option.name])), [productOptions]);
  const categoryLabelMap = useMemo(() => new Map(categoryOptions.map((option) => [option.id, option.name])), [categoryOptions]);
  const agentLabelMap = useMemo(() => new Map(agentOptions.map((option) => [option.id, option.name])), [agentOptions]);

  const labelMaps = useMemo<LabelMaps>(
    () => ({
      productMap: productLabelMap,
      categoryMap: categoryLabelMap,
      agentMap: agentLabelMap,
    }),
    [productLabelMap, categoryLabelMap, agentLabelMap]
  );

  const updateConfigState = useCallback(<K extends keyof RuleConfigState>(field: K, value: RuleConfigState[K]) => {
    setDraft((prev) => ({
      ...prev,
      configState: {
        ...prev.configState,
        [field]: value,
      },
    }));
  }, []);

  const renderConfigFields = () => {
    const { rule_type, configState } = draft;

    const renderSelectedBadges = (values: string[], map: Map<string, string> | undefined, fallbackLabel: string) => {
      if (!values.length) return null;

      const chips = values
        .map((value) => {
          const rawLabel = map?.get(value) ?? value;
          const label = rawLabel != null ? String(rawLabel).trim() : '';
          if (!label) return null;
          return { value, label };
        })
        .filter((item): item is { value: string; label: string } => item !== null);

      if (!chips.length) {
        return (
          <div className="flex flex-wrap gap-1 pt-1">
          {values.map((value, index) => (
            <Badge key={`${value}-${index}`} variant="secondary" className="text-xs">
              {`${fallbackLabel} ${value}`.trim()}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1 pt-1">
        {chips.map(({ value, label }, index) => (
          <Badge key={`${value}-${index}`} variant="secondary" className="text-xs">
            {label}
          </Badge>
        ))}
      </div>
    );
    };

    if (rule_type === 'custom') {
      return (
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground">إعدادات متقدمة (JSON)</label>
          <Textarea
            rows={10}
            value={draft.customConfig}
            onChange={(event) => setDraft((prev) => ({ ...prev, customConfig: event.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            مثال: {`{"conditions":{"regions":["الجزائر"]},"assign_to_agents":["agent-1"]}`}
          </p>
        </div>
      );
    }

    const agentField = (
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">الموظفون الذين يستلمون الطلب</label>
        {agentOptions.length === 0 ? (
          <div className="text-xs text-muted-foreground border border-dashed border-border/40 rounded-md px-3 py-4 text-center">
            لا يوجد موظفو تأكيد مضافون بعد.
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="ابحث عن موظف"
              value={agentSearch}
              onChange={(event) => setAgentSearch(event.target.value)}
            />
            <div className="rounded-md border border-border/40 bg-background">
              <ScrollArea className="h-40 pr-2">
                {filteredAgentOptions.length ? (
                  filteredAgentOptions.map((option) => {
                    const checked = configState.agents.includes(option.id);
                    return (
                      <label key={option.id} className="flex items-center gap-2 py-1.5 px-3 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const isChecked = Boolean(value);
                            const next = isChecked
                              ? [...configState.agents, option.id]
                              : configState.agents.filter((id) => id !== option.id);
                            updateConfigState('agents', Array.from(new Set(next)));
                          }}
                        />
                        <div className="flex flex-col leading-tight">
                          <span>{option.name}</span>
                          {option.helper && <span className="text-[11px] text-muted-foreground">{option.helper}</span>}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-3">لا توجد نتائج مطابقة</div>
                )}
              </ScrollArea>
            </div>
            {renderSelectedBadges(configState.agents, agentLabelMap, 'موظف')}
          </div>
        )}
      </div>
    );

    switch (rule_type) {
      case 'product':
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">المنتجات المستهدفة</label>
              {optionsLoading && productOptions.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border/40 rounded-md px-3 py-4 text-center">
                  جاري تحميل قائمة المنتجات...
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="ابحث عن منتج"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                  <div className="rounded-md border border-border/40 bg-background">
                    <ScrollArea className="h-40 pr-2">
                      {filteredProductOptions.length ? (
                        filteredProductOptions.map((option) => {
                          const checked = configState.products.includes(option.id);
                          return (
                            <label key={option.id} className="flex items-center gap-2 py-1.5 px-3 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  const isChecked = Boolean(value);
                                  const next = isChecked
                                    ? [...configState.products, option.id]
                                    : configState.products.filter((id) => id !== option.id);
                                  updateConfigState('products', Array.from(new Set(next)));
                                }}
                              />
                              <div className="flex flex-col leading-tight">
                                <span>{option.name}</span>
                                {option.helper && <span className="text-[11px] text-muted-foreground">SKU: {option.helper}</span>}
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-3">
                          {productOptions.length ? 'لا توجد منتجات مطابقة' : 'لم يتم العثور على منتجات.'}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  {renderSelectedBadges(configState.products, productLabelMap, 'منتج')}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">فئات إضافية (اختياري)</label>
              {optionsLoading && categoryOptions.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border/40 rounded-md px-3 py-4 text-center">
                  جاري تحميل الفئات...
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="ابحث عن فئة"
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                  />
                  <div className="rounded-md border border-border/40 bg-background">
                    <ScrollArea className="h-32 pr-2">
                      {filteredCategoryOptions.length ? (
                        filteredCategoryOptions.map((option) => {
                        const checked = configState.categories.includes(option.id);
                        return (
                          <label key={option.id} className="flex items-center gap-2 py-1.5 px-3 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                const isChecked = Boolean(value);
                                const next = isChecked
                                  ? [...configState.categories, option.id]
                                  : configState.categories.filter((id) => id !== option.id);
                                updateConfigState('categories', Array.from(new Set(next)));
                              }}
                            />
                            <span>{option.name}</span>
                          </label>
                        );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-3">
                          {categoryOptions.length ? 'لا توجد فئات مطابقة' : 'لا توجد فئات مضافة.'}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  {renderSelectedBadges(configState.categories, categoryLabelMap, 'فئة')}
                </div>
              )}
            </div>
            {agentField}
          </div>
        );
      case 'category':
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">الفئات المستهدفة</label>
              {optionsLoading && categoryOptions.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border/40 rounded-md px-3 py-4 text-center">
                  جاري تحميل الفئات...
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="ابحث عن فئة"
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                  />
                  <div className="rounded-md border border-border/40 bg-background">
                    <ScrollArea className="h-40 pr-2">
                      {filteredCategoryOptions.length ? (
                        filteredCategoryOptions.map((option) => {
                          const checked = configState.categories.includes(option.id);
                          return (
                            <label key={option.id} className="flex items-center gap-2 py-1.5 px-3 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  const isChecked = Boolean(value);
                                  const next = isChecked
                                    ? [...configState.categories, option.id]
                                    : configState.categories.filter((id) => id !== option.id);
                                  updateConfigState('categories', Array.from(new Set(next)));
                                }}
                              />
                              <span>{option.name}</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-3">
                          {categoryOptions.length ? 'لا توجد فئات مطابقة' : 'لا توجد فئات مضافة.'}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  {renderSelectedBadges(configState.categories, categoryLabelMap, 'فئة')}
                </div>
              )}
            </div>
            {agentField}
          </div>
        );
      case 'fair_rotation':
        return (
          <div className="space-y-4">
            {agentField}
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">أسلوب التدوير</label>
              <Select
                value={configState.rotationMode || 'fair'}
                onValueChange={(value) => updateConfigState('rotationMode', value as 'fair' | 'performance')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الأسلوب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fair">توزيع عادل بين الجميع</SelectItem>
                  <SelectItem value="performance">حسب الأداء</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">أقصى حجم للطابور</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="مثال: 20"
                  value={configState.maxQueueSize ?? ''}
                  onChange={(event) => updateConfigState('maxQueueSize', event.target.value ? Number(event.target.value) : undefined)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">حد الطلبات لكل موظف</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="مثال: 5"
                  value={configState.maxCurrentOrders ?? ''}
                  onChange={(event) => updateConfigState('maxCurrentOrders', event.target.value ? Number(event.target.value) : undefined)}
                />
              </div>
            </div>
          </div>
        );
      case 'priority':
        return (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">مستوى الأولوية</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="مثال: 1"
                  value={configState.priorityLevel ?? ''}
                  onChange={(event) => updateConfigState('priorityLevel', event.target.value ? Number(event.target.value) : undefined)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">الفاصل بين المكالمات (دقيقة)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="مثال: 10"
                  value={configState.callIntervalMinutes ?? ''}
                  onChange={(event) => updateConfigState('callIntervalMinutes', event.target.value ? Number(event.target.value) : undefined)}
                />
              </div>
            </div>
            {agentField}
          </div>
        );
      case 'region':
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">المناطق/الولايات</label>
              <Input
                placeholder="مثال: الجزائر، وهران، قسنطينة"
                value={listToString(configState.regions)}
                onChange={(event) => updateConfigState('regions', stringToList(event.target.value))}
              />
            </div>
            {renderSelectedBadges(configState.regions, undefined, 'منطقة')}
            {agentField}
          </div>
        );
      default:
        return agentField;
    }
  };

  const rulesByType = useMemo(() => {
    return assignmentRules.reduce<Record<ConfirmationAssignmentRule['rule_type'], ConfirmationAssignmentRule[]>>((acc, rule) => {
      if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
      acc[rule.rule_type].push(rule);
      return acc;
    }, {
      product: [],
      category: [],
      fair_rotation: [],
      priority: [],
      region: [],
      custom: [],
    });
  }, [assignmentRules]);

  const openCreateDialog = (ruleType: ConfirmationAssignmentRule['rule_type']) => {
    setProductSearch('');
    setCategorySearch('');
    setAgentSearch('');
    setDraft({
      ...defaultDraft,
      rule_type: ruleType,
      rule_name: ruleTypeMeta[ruleType].title,
      configState: defaultConfigState(),
      customConfig: defaultDraft.customConfig,
    });
    setIsDialogOpen(true);
    if (!hasLoadedOptions && !optionsLoading) {
      loadReferenceData();
    }
  };

  const handleSaveRule = async () => {
    if (!draft.rule_name.trim()) {
      toast.error('يرجى كتابة اسم للقانون');
      return;
    }
    setIsSubmitting(true);
    try {
      let parsedConfig: Record<string, unknown> = {};
      if (draft.rule_type === 'custom') {
        try {
          parsedConfig = draft.customConfig ? JSON.parse(draft.customConfig) : {};
        } catch (error) {
          toast.error('تعذر قراءة الإعدادات المخصصة. يرجى التأكد من صحة JSON');
          setIsSubmitting(false);
          return;
        }
      } else {
        parsedConfig = buildConfigFromDraft(draft, labelMaps);
      }

      const result = await upsertAssignmentRule({
        rule_type: draft.rule_type,
        rule_name: draft.rule_name,
        is_active: draft.is_active,
        priority: draft.priority,
        config: parsedConfig,
      });

      if (result) {
        toast.success('تم حفظ قانون توزيع الطلبات');
        setIsDialogOpen(false);
        setDraft({
          ...defaultDraft,
          rule_type: draft.rule_type,
          rule_name: ruleTypeMeta[draft.rule_type].title,
          configState: defaultConfigState(),
          customConfig: draft.rule_type === 'custom' ? draft.customConfig : defaultDraft.customConfig,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteRule = async (ruleId: string) => {
    setDeletingRuleId(ruleId);
    const success = await deleteAssignmentRule(ruleId);
    if (success) {
      toast.success('تم حذف القانون');
    }
    setDeletingRuleId(null);
  };

  if (missingSchema) {
    return (
      <Alert variant="destructive">
        <AlertTitle>لا يمكن تحميل قوانين التوزيع</AlertTitle>
        <AlertDescription>قم بإعداد مخطط نظام التأكيد ثم أعد المحاولة.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">نظام توزيع الطلبيات</h2>
          <p className="text-sm text-muted-foreground">
            أنشئ قواعد تقسيم مرنة (حسب المنتج، الفئة، العدالة، المنطقة) تضمن وصول الطلب المناسب للموظف المناسب.
          </p>
        </div>
        <Button onClick={() => openCreateDialog(activeTab)}>قانون جديد</Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConfirmationAssignmentRule['rule_type'])}>
        <TabsList>
          <TabsTrigger value="fair_rotation">الطابور العادل</TabsTrigger>
          <TabsTrigger value="product">المنتجات</TabsTrigger>
          <TabsTrigger value="category">الفئات</TabsTrigger>
          <TabsTrigger value="priority">الأولوية</TabsTrigger>
          <TabsTrigger value="region">المناطق</TabsTrigger>
          <TabsTrigger value="custom">مخصص</TabsTrigger>
        </TabsList>

        {Object.entries(ruleTypeMeta).map(([ruleType, meta]) => (
          <TabsContent key={ruleType} value={ruleType}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card className="border border-dashed border-primary/30 bg-primary/5 hover:border-primary/70 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    {meta.icon}
                    {meta.title}
                  </CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={() => openCreateDialog(ruleType as ConfirmationAssignmentRule['rule_type'])}>
                    إنشاء قانون {meta.badge}
                  </Button>
                </CardContent>
              </Card>

              {rulesByType[ruleType as ConfirmationAssignmentRule['rule_type']]?.map((rule) => {
                const summary = buildRuleSummary(rule);

                return (
                  <Card key={rule.id} className="border border-border/40 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {meta.icon}
                            {rule.rule_name}
                          </CardTitle>
                          <CardDescription>الأولوية: {rule.priority}</CardDescription>
                        </div>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'مفعل' : 'متوقف'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded border border-border/30 bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground mb-2">المعطيات</div>
                        {summary.length ? (
                          <ul className="space-y-1 text-xs text-foreground/80 list-disc pr-4">
                            {summary.map((line, index) => (
                              <li key={index}>{line}</li>
                            ))}
                          </ul>
                        ) : (
                          <pre className="text-xs max-h-40 overflow-auto whitespace-pre-wrap text-foreground/80">
                            {JSON.stringify(rule.config, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProductSearch('');
                          setCategorySearch('');
                          setAgentSearch('');
                          setDraft({
                            rule_type: rule.rule_type,
                            rule_name: rule.rule_name,
                            is_active: rule.is_active,
                            priority: rule.priority,
                            configState: parseRuleConfig(rule),
                            customConfig: JSON.stringify(rule.config ?? {}, null, 2),
                          });
                          setIsDialogOpen(true);
                          if (!hasLoadedOptions && !optionsLoading) {
                            loadReferenceData();
                          }
                        }}
                      >
                          تعديل
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => confirmDeleteRule(rule.id)}
                          disabled={deletingRuleId === rule.id}
                        >
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>إعداد قانون توزيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">اسم القانون</label>
              <Input value={draft.rule_name} onChange={(event) => setDraft((prev) => ({ ...prev, rule_name: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">الأولوية</label>
              <Input
                type="number"
                min={1}
                value={draft.priority}
                onChange={(event) => setDraft((prev) => ({ ...prev, priority: Number(event.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={draft.is_active} onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, is_active: checked }))} />
              <span className="text-sm text-muted-foreground">تفعيل القانون مباشرةً</span>
            </div>
            <Separator />
            {optionsError && (
              <Alert variant="destructive">
                <AlertDescription className="flex flex-col gap-2">
                  {optionsError}
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={loadReferenceData}
                    disabled={optionsLoading}
                  >
                    إعادة المحاولة
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {renderConfigFields()}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveRule} disabled={isSubmitting}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfirmationDistributionManager;
