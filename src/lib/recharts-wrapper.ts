/**
 * Recharts Wrapper - Safari ESM Compatibility
 *
 * This file re-exports recharts components to avoid Safari's ESM bug
 * with "export * from" star exports.
 *
 * Safari Issue: "Importing binding name 'default' cannot be resolved by star export entries"
 *
 * NOTE: We import from the direct ESM entry point to avoid circular alias
 */

// Import from the actual recharts ESM entry point (bypassing our alias)
// @ts-ignore - Direct path import
import {
  // Charts
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  ScatterChart,
  ComposedChart,
  Treemap,
  Sankey,
  FunnelChart,

  // Chart Elements
  Area,
  Bar,
  Line,
  Pie,
  Radar,
  RadialBar,
  Scatter,
  Cell,
  Funnel,

  // Axes
  XAxis,
  YAxis,
  ZAxis,
  CartesianAxis,

  // Grid
  CartesianGrid,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,

  // Decorators
  Brush,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  ErrorBar,

  // Tooltip & Legend
  Tooltip,
  Legend,

  // Labels
  Label,
  LabelList,

  // Container
  ResponsiveContainer,

  // Other
  Text,
  Sector,
  Curve,
  Rectangle,
  Symbols,
  Polygon,
  Dot,
  Cross,

  // Surface
  Surface,
  Layer,
} from 'recharts/es6/index.js';

// Re-export everything
export {
  // Charts
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  ScatterChart,
  ComposedChart,
  Treemap,
  Sankey,
  FunnelChart,

  // Chart Elements
  Area,
  Bar,
  Line,
  Pie,
  Radar,
  RadialBar,
  Scatter,
  Cell,
  Funnel,

  // Axes
  XAxis,
  YAxis,
  ZAxis,
  CartesianAxis,

  // Grid
  CartesianGrid,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,

  // Decorators
  Brush,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  ErrorBar,

  // Tooltip & Legend
  Tooltip,
  Legend,

  // Labels
  Label,
  LabelList,

  // Container
  ResponsiveContainer,

  // Other
  Text,
  Sector,
  Curve,
  Rectangle,
  Symbols,
  Polygon,
  Dot,
  Cross,

  // Surface
  Surface,
  Layer,
};
