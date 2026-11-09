import { describe, expect, it } from 'vitest';
import { landingStructuredData } from '../../src/lib/landing-seo';

const input = {
  name: 'Earth observation and remote sensing',
  description: 'Satellite data processed into maps you can act on.',
  url: 'https://www.geofare.dk/services/earth-observation-remote-sensing/',
  providerName: 'geofare',
  providerUrl: 'https://www.geofare.dk/',
  faq: [
    { question: 'How long does it take?', answer: 'A first map within two weeks.' },
    { question: 'Do we need a GIS team?', answer: 'No. You get files that open in a browser.' },
  ],
};

describe('landingStructuredData', () => {
  const [service, faq] = landingStructuredData(input);

  it('describes the page as a Service of geofare', () => {
    expect(service).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: input.name,
      serviceType: input.name,
      description: input.description,
      url: input.url,
      provider: { '@type': 'ProfessionalService', name: 'geofare', url: input.providerUrl },
    });
  });

  it('lists every question with its answer as a FAQPage', () => {
    expect(faq).toMatchObject({ '@context': 'https://schema.org', '@type': 'FAQPage' });
    expect((faq as { mainEntity: unknown[] }).mainEntity).toEqual(
      input.faq.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
    );
  });
});
