'use client';
import { DynamicTable } from './DynamicTable';
import { DashboardStats } from './DashboardStats';
import { AlertTriangle } from 'lucide-react';

interface Props {
  appId: string;
  page: any;
  appConfig: any;
}

function getEntityConfig(appConfig: any, entityName: string) {
  return appConfig?.entities?.find((e: any) => e.name === entityName) || null;
}

function UnknownComponent({ type }: { type: string }) {
  return (
    <div className="card p-6 border-dashed border-2 border-yellow-300 dark:border-yellow-700">
      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
        <AlertTriangle size={16} />
        <span className="text-sm font-medium">Unknown component type: <code className="font-mono">{type}</code></span>
      </div>
      <p className="text-xs text-gray-400 mt-1">Add support for this component type in the runtime renderer.</p>
    </div>
  );
}

function ComponentRenderer({ appId, component, appConfig }: { appId: string; component: any; appConfig: any }) {
  const entity = component.entity;
  const entityConfig = entity ? getEntityConfig(appConfig, entity) : null;

  switch (component.type) {
    case 'table':
      if (!entity) return <div className="card p-4 text-sm text-gray-400">Table: no entity specified</div>;
      return <DynamicTable appId={appId} component={component} entityConfig={entityConfig || { name: entity, fields: [] }} />;

    case 'form':
      if (!entity) return <div className="card p-4 text-sm text-gray-400">Form: no entity specified</div>;
      return <DynamicTable appId={appId} component={{ ...component, type: 'table' }} entityConfig={entityConfig || { name: entity, fields: [] }} />;

    case 'dashboard':
      return <DashboardStats appId={appId} entities={appConfig?.entities || []} />;

    case 'stats':
      return <DashboardStats appId={appId} entities={appConfig?.entities || []} />;

    case 'card':
      return (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{component.title || 'Card'}</h3>
          <p className="text-sm text-gray-500">{component.props?.content || 'No content configured.'}</p>
        </div>
      );

    case 'list':
      if (!entity) return <div className="card p-4 text-sm text-gray-400">List: no entity specified</div>;
      return <DynamicTable appId={appId} component={{ ...component, type: 'table' }} entityConfig={entityConfig || { name: entity, fields: [] }} />;

    default:
      return <UnknownComponent type={component.type} />;
  }
}

export function PageRenderer({ appId, page, appConfig }: Props) {
  if (!page) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Page not found.</p>
      </div>
    );
  }

  const components: any[] = page.components || [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
      </div>

      {components.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <p className="text-gray-400 text-sm">No components on this page.</p>
          <p className="text-gray-300 text-xs mt-1">Add components to the page config to display content here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {components.map((comp: any) => (
            <ComponentRenderer key={comp.id} appId={appId} component={comp} appConfig={appConfig} />
          ))}
        </div>
      )}
    </div>
  );
}
