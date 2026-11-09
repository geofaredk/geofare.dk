// The structured data of a service landing page, next to the ProfessionalService every page
// carries: the page as a Service of geofare, and its questions as a FAQPage. Pure, so the
// unit tests call it directly; the base layout serialises and escapes it.

export interface LandingSeoInput {
  name: string;
  description: string;
  /** The page's canonical URL. */
  url: string;
  providerName: string;
  providerUrl: string;
  faq: { question: string; answer: string }[];
}

export function landingStructuredData(input: LandingSeoInput): [service: object, faq: object] {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    serviceType: input.name,
    description: input.description,
    url: input.url,
    provider: { '@type': 'ProfessionalService', name: input.providerName, url: input.providerUrl },
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: input.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
  return [service, faq];
}
