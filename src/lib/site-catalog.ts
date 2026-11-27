export interface SiteCatalogService {
  key: string;
  label: string;
}

// The 8 services exactly as they appear in the website catalog.
export const SITE_CATALOG_SERVICES: SiteCatalogService[] = [
  { key: 'gutter-cleaning', label: 'Gutter Cleaning' },
  { key: 'leak-sealing', label: 'Leak Sealing' },
  { key: 'reattachment-services', label: 'Reattachment Services' },
  { key: 'window-caulking', label: 'Window Caulking' },
  { key: 'window-cleaning', label: 'Window Cleaning' },
  { key: 'vent-replacement', label: 'Vent Replacement' },
  { key: 'heated-wire-cable-installation', label: 'Heated Wire/Cable Installation' },
  { key: 'christmas-lights-installation-removal', label: 'Christmas Lights Installation & Removal' },
];
