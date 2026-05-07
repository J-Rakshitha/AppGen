import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function truncate(s: string, n = 50) { return s.length > n ? s.slice(0, n) + '…' : s; }

export function getErrorMessage(err: any): string {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An error occurred';
}

export const SAMPLE_CONFIGS = {
  crm: {
    name: 'CRM System',
    description: 'Customer relationship management',
    theme: { primaryColor: '#6366f1' },
    entities: [
      {
        name: 'contacts',
        label: 'Contacts',
        fields: [
          { name: 'name', type: 'string', label: 'Full Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'phone', type: 'string', label: 'Phone' },
          { name: 'company', type: 'string', label: 'Company' },
          { name: 'status', type: 'select', label: 'Status', options: ['lead', 'prospect', 'customer', 'churned'], default: 'lead' },
          { name: 'notes', type: 'text', label: 'Notes' },
        ],
      },
      {
        name: 'deals',
        label: 'Deals',
        fields: [
          { name: 'title', type: 'string', label: 'Deal Title', required: true },
          { name: 'value', type: 'number', label: 'Value ($)' },
          { name: 'stage', type: 'select', label: 'Stage', options: ['discovery', 'proposal', 'negotiation', 'closed-won', 'closed-lost'], default: 'discovery' },
          { name: 'contact_name', type: 'string', label: 'Contact Name' },
          { name: 'close_date', type: 'date', label: 'Close Date' },
        ],
      },
    ],
    pages: [],
    notifications: [
      { event: 'record_created', title: 'New record added', channels: ['in-app'] },
    ],
  },
  todo: {
    name: 'Task Manager',
    description: 'Team task and project tracker',
    theme: { primaryColor: '#10b981' },
    entities: [
      {
        name: 'tasks',
        label: 'Tasks',
        fields: [
          { name: 'title', type: 'string', label: 'Task Title', required: true },
          { name: 'description', type: 'text', label: 'Description' },
          { name: 'priority', type: 'select', label: 'Priority', options: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          { name: 'status', type: 'select', label: 'Status', options: ['todo', 'in-progress', 'review', 'done'], default: 'todo' },
          { name: 'assignee', type: 'string', label: 'Assignee' },
          { name: 'due_date', type: 'date', label: 'Due Date' },
        ],
      },
    ],
    pages: [],
  },
  inventory: {
    name: 'Inventory System',
    description: 'Product and stock management',
    theme: { primaryColor: '#f59e0b' },
    entities: [
      {
        name: 'products',
        label: 'Products',
        fields: [
          { name: 'name', type: 'string', label: 'Product Name', required: true },
          { name: 'sku', type: 'string', label: 'SKU' },
          { name: 'category', type: 'select', label: 'Category', options: ['electronics', 'clothing', 'food', 'other'] },
          { name: 'price', type: 'number', label: 'Price ($)', required: true },
          { name: 'quantity', type: 'integer', label: 'Quantity', default: 0 },
          { name: 'description', type: 'text', label: 'Description' },
        ],
      },
    ],
    pages: [],
  },
};
