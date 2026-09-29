/** Starter templates. Labels and (localized) sources live in the i18n dictionaries. */
export const TEMPLATE_DEFS = [
  { id: 'sequence', icon: 'swap_horiz' },
  { id: 'class', icon: 'account_tree' },
  { id: 'activity', icon: 'alt_route' },
  { id: 'component', icon: 'widgets' },
  { id: 'state', icon: 'radio_button_checked' },
  { id: 'usecase', icon: 'person_pin' },
  { id: 'mindmap', icon: 'hub' },
] as const;

export type TemplateId = (typeof TEMPLATE_DEFS)[number]['id'];

export interface DiagramTemplate {
  id: TemplateId;
  icon: string;
  label: string;
  /** Default document name, e.g. "New sequence diagram". */
  name: string;
  source: string;
}
