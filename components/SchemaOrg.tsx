/**
 * ✅ Schema.org JSON-LD for agent understanding
 * Defines Organization and SoftwareApplication structured data
 */

export function SchemaOrg() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maker-flow.netlify.app';

  // Organization schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StudioMaker',
    url: appUrl,
    logo: `${appUrl}/og`,
    description: 'Plataforma SaaS de gestão para makers e estúdios de impressão 3D',
    sameAs: [
      'https://github.com/vivienediniiz/maker-flow',
      'https://twitter.com/studiomaker3d',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BR',
      addressRegion: 'SP',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@studiomaker3d.com.br',
      availableLanguage: 'pt-BR',
    },
  };

  // SoftwareApplication schema
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'StudioMaker',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: appUrl,
    description: 'Gestão inteligente de pedidos e inventário para estúdios 3D',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      url: `${appUrl}/pricing`,
    },
    creator: {
      '@type': 'Person',
      name: 'Viviene Diniz',
    },
    featureList: [
      'Preço automático de peças 3D',
      'Rastreamento de inventário de filamentos',
      'Sincronização de pedidos Mercado Pago',
      'Relatórios financeiros',
      'Gestão de múltiplas impressoras',
    ],
  };

  return (
    <>
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        suppressHydrationWarning
      />
      {/* Software Application Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        suppressHydrationWarning
      />
    </>
  );
}
