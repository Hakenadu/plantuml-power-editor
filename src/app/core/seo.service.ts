import { DOCUMENT, Injectable, effect, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { I18nService } from '../i18n/i18n.service';
import { LANGUAGES } from '../i18n/languages';

/** Public origin of the deployed app (canonical URLs, Open Graph). */
export const SITE_ORIGIN = 'https://plantuml-editor.com';

/**
 * Keeps the language-dependent head tags (description, Open Graph, Twitter, canonical)
 * in sync with the UI language. The static defaults live in `index.html`.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly i18n = inject(I18nService);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const seo = this.i18n.t().seo;
      const lang = this.i18n.lang();
      const url = `${SITE_ORIGIN}/${this.i18n.urlLanguage() ? `?lang=${lang}` : ''}`;
      const locale = LANGUAGES.find((l) => l.code === lang)!.ogLocale;

      this.meta.updateTag({ name: 'description', content: seo.description });
      this.meta.updateTag({ property: 'og:title', content: seo.title });
      this.meta.updateTag({ property: 'og:description', content: seo.description });
      this.meta.updateTag({ property: 'og:url', content: url });
      this.meta.updateTag({ property: 'og:locale', content: locale });
      this.meta.updateTag({ property: 'og:image', content: `${SITE_ORIGIN}/${seo.image}` });
      this.meta.updateTag({ property: 'og:image:alt', content: seo.imageAlt });
      for (const tag of this.meta.getTags('property="og:locale:alternate"'))
        this.meta.removeTagElement(tag);
      this.meta.addTags(
        LANGUAGES.filter((l) => l.code !== lang).map((l) => ({
          property: 'og:locale:alternate',
          content: l.ogLocale,
        })),
      );
      this.meta.updateTag({ name: 'twitter:title', content: seo.title });
      this.meta.updateTag({ name: 'twitter:image', content: `${SITE_ORIGIN}/${seo.image}` });
      this.meta.updateTag({ name: 'twitter:image:alt', content: seo.imageAlt });
      this.meta.updateTag({ name: 'twitter:description', content: seo.description });
      this.document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
    });
  }
}
