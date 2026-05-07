// Config validator: normalizes incomplete/inconsistent JSON configs
export interface AppConfig {
  name: string;
  description?: string;
  theme?: ThemeConfig;
  auth?: AuthConfig;
  entities?: EntityConfig[];
  pages?: PageConfig[];
  apis?: ApiConfig[];
  locale?: string;
  notifications?: NotificationConfig[];
}

export interface ThemeConfig {
  primaryColor?: string;
  fontFamily?: string;
  darkMode?: boolean;
  logo?: string;
}

export interface AuthConfig {
  enabled?: boolean;
  methods?: string[];
  userFields?: FieldConfig[];
}

export interface EntityConfig {
  name: string;
  label?: string;
  fields: FieldConfig[];
  timestamps?: boolean;
  softDelete?: boolean;
}

export interface FieldConfig {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  default?: any;
  options?: string[];
  validation?: Record<string, any>;
  hidden?: boolean;
}

export interface PageConfig {
  id: string;
  title: string;
  path?: string;
  icon?: string;
  components: ComponentConfig[];
  auth?: boolean;
}

export interface ComponentConfig {
  id: string;
  type: string;
  entity?: string;
  title?: string;
  fields?: string[];
  actions?: ActionConfig[];
  columns?: ColumnConfig[];
  props?: Record<string, any>;
}

export interface ColumnConfig {
  key: string;
  label?: string;
  type?: string;
  sortable?: boolean;
}

export interface ActionConfig {
  id: string;
  label: string;
  type: string;
  endpoint?: string;
  confirm?: boolean;
  icon?: string;
}

export interface ApiConfig {
  path: string;
  method: string;
  entity?: string;
  action: string;
  auth?: boolean;
  validation?: Record<string, any>;
}

export interface NotificationConfig {
  event: string;
  title: string;
  message?: string;
  channels?: string[];
}

const VALID_FIELD_TYPES = ['string', 'text', 'number', 'integer', 'boolean', 'date', 'datetime', 'email', 'url', 'select', 'multiselect', 'file', 'image', 'json', 'relation'];
const VALID_COMPONENT_TYPES = ['form', 'table', 'dashboard', 'card', 'chart', 'kanban', 'calendar', 'detail', 'list', 'stats'];
const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function normalizeFieldType(type: string): string {
  if (!type) return 'string';
  const t = String(type).toLowerCase().trim();
  if (VALID_FIELD_TYPES.includes(t)) return t;
  // Fuzzy match
  if (t.includes('int') || t.includes('num')) return 'number';
  if (t.includes('bool') || t.includes('flag')) return 'boolean';
  if (t.includes('text') || t.includes('area') || t.includes('long')) return 'text';
  if (t.includes('date') && t.includes('time')) return 'datetime';
  if (t.includes('date')) return 'date';
  if (t.includes('email') || t.includes('mail')) return 'email';
  if (t.includes('url') || t.includes('link') || t.includes('href')) return 'url';
  if (t.includes('select') || t.includes('enum') || t.includes('choice')) return 'select';
  if (t.includes('file') || t.includes('upload') || t.includes('attach')) return 'file';
  if (t.includes('img') || t.includes('image') || t.includes('photo') || t.includes('pic')) return 'image';
  if (t.includes('json') || t.includes('object') || t.includes('map')) return 'json';
  return 'string';
}

function normalizeField(field: any): FieldConfig {
  if (!field || typeof field !== 'object') return { name: 'unknown', type: 'string' };
  return {
    name: String(field.name || field.key || field.id || 'field').replace(/\s+/g, '_').toLowerCase(),
    type: normalizeFieldType(field.type || field.dataType || field.fieldType),
    label: field.label || field.title || field.displayName,
    required: Boolean(field.required || field.mandatory || field.isRequired),
    default: field.default !== undefined ? field.default : field.defaultValue,
    options: Array.isArray(field.options) ? field.options : 
             Array.isArray(field.choices) ? field.choices :
             field.enum ? field.enum : undefined,
    validation: field.validation || field.rules || field.constraints,
    hidden: Boolean(field.hidden || field.internal || field.system),
  };
}

function normalizeEntity(entity: any): EntityConfig | null {
  if (!entity || typeof entity !== 'object') return null;
  const name = entity.name || entity.entity || entity.model || entity.table;
  if (!name) return null;

  const rawFields = entity.fields || entity.columns || entity.attributes || entity.properties || [];
  const fields = Array.isArray(rawFields) ? rawFields.map(normalizeField).filter(f => f.name !== 'unknown') : [];

  // Ensure id field
  if (!fields.find(f => f.name === 'id')) {
    fields.unshift({ name: 'id', type: 'string', label: 'ID', hidden: true });
  }

  return {
    name: String(name).replace(/\s+/g, '_').toLowerCase(),
    label: entity.label || entity.title || entity.displayName || String(name),
    fields,
    timestamps: entity.timestamps !== false,
    softDelete: Boolean(entity.softDelete || entity.soft_delete || entity.paranoid),
  };
}

function normalizeComponent(comp: any): ComponentConfig | null {
  if (!comp || typeof comp !== 'object') return null;
  const type = String(comp.type || comp.componentType || 'table').toLowerCase();
  const normalizedType = VALID_COMPONENT_TYPES.includes(type) ? type : 'table';

  return {
    id: String(comp.id || comp.key || Math.random().toString(36).substr(2, 9)),
    type: normalizedType,
    entity: comp.entity || comp.model || comp.dataSource,
    title: comp.title || comp.label || comp.heading,
    fields: Array.isArray(comp.fields) ? comp.fields : 
            Array.isArray(comp.visibleFields) ? comp.visibleFields : undefined,
    actions: Array.isArray(comp.actions) ? comp.actions.map((a: any) => ({
      id: a.id || a.key || String(Math.random().toString(36).substr(2, 6)),
      label: a.label || a.title || a.name || 'Action',
      type: a.type || 'button',
      endpoint: a.endpoint || a.url,
      confirm: Boolean(a.confirm || a.requireConfirm),
      icon: a.icon,
    })) : [],
    columns: Array.isArray(comp.columns) ? comp.columns.map((c: any) => ({
      key: c.key || c.field || c.name || '',
      label: c.label || c.title || c.header || c.key,
      type: c.type || 'string',
      sortable: Boolean(c.sortable),
    })) : undefined,
    props: comp.props || comp.options || comp.settings,
  };
}

function normalizePage(page: any, index: number): PageConfig {
  if (!page || typeof page !== 'object') {
    return { id: `page_${index}`, title: `Page ${index + 1}`, components: [] };
  }
  const rawComponents = page.components || page.sections || page.widgets || page.blocks || [];
  return {
    id: String(page.id || page.key || page.slug || `page_${index}`),
    title: page.title || page.name || page.label || `Page ${index + 1}`,
    path: page.path || page.route || page.url,
    icon: page.icon,
    components: Array.isArray(rawComponents) ? rawComponents.map(normalizeComponent).filter(Boolean) as ComponentConfig[] : [],
    auth: page.auth !== false,
  };
}

function normalizeApi(api: any): ApiConfig | null {
  if (!api || typeof api !== 'object') return null;
  const method = String(api.method || 'GET').toUpperCase();
  return {
    path: api.path || api.url || api.endpoint || '/',
    method: VALID_METHODS.includes(method) ? method : 'GET',
    entity: api.entity || api.model || api.resource,
    action: api.action || api.operation || 'list',
    auth: api.auth !== false,
    validation: api.validation || api.schema || api.rules,
  };
}

export function validateAndNormalizeConfig(raw: any): { config: AppConfig; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    warnings.push('Config is not a valid object, using defaults');
    return { config: getDefaultConfig(), warnings };
  }

  // Handle array wrapping
  const data = Array.isArray(raw) ? raw[0] : raw;

  const name = data.name || data.title || data.appName || data.app_name || 'My Application';
  
  // Entities
  const rawEntities = data.entities || data.models || data.tables || data.schemas || data.collections || [];
  const entities = Array.isArray(rawEntities) 
    ? rawEntities.map(normalizeEntity).filter(Boolean) as EntityConfig[]
    : [];

  if (rawEntities.length > 0 && entities.length === 0) {
    warnings.push('Could not parse any entities from config');
  }

  // Pages
  const rawPages = data.pages || data.views || data.screens || data.routes || [];
  let pages: PageConfig[] = Array.isArray(rawPages) ? rawPages.map(normalizePage) : [];

  // Auto-generate pages from entities if no pages defined
  if (pages.length === 0 && entities.length > 0) {
    warnings.push('No pages defined, auto-generating from entities');
    pages = entities.map((entity, i) => ({
      id: `${entity.name}_page`,
      title: entity.label || entity.name,
      components: [
        {
          id: `${entity.name}_table`,
          type: 'table',
          entity: entity.name,
          title: `${entity.label || entity.name} List`,
          actions: [
            { id: 'create', label: 'Add New', type: 'create', icon: 'plus' },
            { id: 'edit', label: 'Edit', type: 'edit', icon: 'edit' },
            { id: 'delete', label: 'Delete', type: 'delete', confirm: true, icon: 'trash' },
          ],
        },
      ],
      auth: true,
    }));
  }

  // APIs
  const rawApis = data.apis || data.endpoints || data.routes || [];
  const apis = Array.isArray(rawApis) ? rawApis.map(normalizeApi).filter(Boolean) as ApiConfig[] : [];

  // Auth
  const rawAuth = data.auth || data.authentication || data.security || {};
  const auth: AuthConfig = {
    enabled: rawAuth.enabled !== false,
    methods: Array.isArray(rawAuth.methods) ? rawAuth.methods : ['email'],
    userFields: Array.isArray(rawAuth.userFields) ? rawAuth.userFields.map(normalizeField) : [],
  };

  // Theme
  const rawTheme = data.theme || data.ui || data.design || {};
  const theme: ThemeConfig = {
    primaryColor: rawTheme.primaryColor || rawTheme.primary || rawTheme.color || '#6366f1',
    fontFamily: rawTheme.fontFamily || rawTheme.font,
    darkMode: Boolean(rawTheme.darkMode || rawTheme.dark),
    logo: rawTheme.logo,
  };

  // Notifications
  const rawNotifications = data.notifications || data.events || [];
  const notifications: NotificationConfig[] = Array.isArray(rawNotifications) ? rawNotifications.map((n: any) => ({
    event: n.event || n.trigger || 'action',
    title: n.title || n.name || 'Notification',
    message: n.message || n.body || n.template,
    channels: Array.isArray(n.channels) ? n.channels : ['in-app'],
  })) : [];

  return {
    config: {
      name: String(name),
      description: data.description || data.desc,
      theme,
      auth,
      entities,
      pages,
      apis,
      locale: data.locale || data.language || data.lang || 'en',
      notifications,
    },
    warnings,
  };
}

function getDefaultConfig(): AppConfig {
  return {
    name: 'My Application',
    theme: { primaryColor: '#6366f1' },
    auth: { enabled: true, methods: ['email'] },
    entities: [],
    pages: [],
    apis: [],
    locale: 'en',
    notifications: [],
  };
}
