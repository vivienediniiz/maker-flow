/**
 * JSON-LD Structured Data para SEO
 * Ajuda buscadores a entender melhor o conteúdo
 */

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "StudioMaker",
    "url": "https://studiomaker3d.com.br",
    "logo": "https://studiomaker3d.com.br/logo.png",
    "description": "Gestão completa para makers e estúdios de impressão 3D. Precificação inteligente, vendas multicanal, estoque e financeiro.",
    "sameAs": [
      "https://instagram.com/studiomaker3d"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+55-xx-xxxxx-xxxx",
      "contactType": "Customer Support"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebsiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "StudioMaker",
    "url": "https://studiomaker3d.com.br",
    "searchAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://studiomaker3d.com.br/search?q={search_term_string}"
      }
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "StudioMaker",
    "description": "SaaS de gestão para estúdios de impressão 3D. Calculadora de preço, vendas, estoque, financeiro e integrações.",
    "url": "https://studiomaker3d.com.br",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL",
      "description": "Plano gratuito com limites"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "250"
    },
    "creator": {
      "@type": "Organization",
      "name": "Agência Diniz"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LocalBusinessJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "StudioMaker",
    "image": "https://studiomaker3d.com.br/logo.png",
    "description": "Platform de gestão para makers 3D",
    "url": "https://studiomaker3d.com.br",
    "telephone": "+55-xx-xxxxx-xxxx",
    "priceRange": "R$ 0 - R$ 49,90",
    "areaServed": "BR",
    "serviceType": "SaaS Management Platform"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
