import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  ogType?: string;
  ogImage?: string;
  schema?: Record<string, any> | Record<string, any>[];
}

const SEO = ({
  title,
  description,
  keywords,
  canonical,
  robots = "index, follow",
  ogType = "website",
  ogImage = "/og-image.jpg",
  schema,
}: SEOProps) => {
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title.includes("Vanca Patina") 
      ? title 
      : `${title} | Vanca Patina`;
    document.title = formattedTitle;

    // Helper to get or create a meta tag
    const getOrCreateMeta = (attrName: string, attrVal: string): HTMLMetaElement => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      return element;
    };

    // Helper to get or create a link tag
    const getOrCreateLink = (relVal: string): HTMLLinkElement => {
      let element = document.querySelector(`link[rel="${relVal}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", relVal);
        document.head.appendChild(element);
      }
      return element;
    };

    // 2. Description
    const metaDescription = getOrCreateMeta("name", "description");
    metaDescription.setAttribute("content", description);

    // 3. Keywords
    if (keywords) {
      const metaKeywords = getOrCreateMeta("name", "keywords");
      metaKeywords.setAttribute("content", keywords);
    } else {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metaKeywords.remove();
    }

    // 4. Robots
    const metaRobots = getOrCreateMeta("name", "robots");
    metaRobots.setAttribute("content", robots);

    // 5. Canonical
    const linkCanonical = getOrCreateLink("canonical");
    linkCanonical.setAttribute("href", canonical || currentUrl);

    // 6. Open Graph Meta Tags
    const ogTitle = getOrCreateMeta("property", "og:title");
    ogTitle.setAttribute("content", formattedTitle);

    const ogDesc = getOrCreateMeta("property", "og:description");
    ogDesc.setAttribute("content", description);

    const ogUrl = getOrCreateMeta("property", "og:url");
    ogUrl.setAttribute("content", canonical || currentUrl);

    const ogTypeMeta = getOrCreateMeta("property", "og:type");
    ogTypeMeta.setAttribute("content", ogType);

    const fullOgImage = ogImage.startsWith("http") 
      ? ogImage 
      : window.location.origin + ogImage;
    const ogImg = getOrCreateMeta("property", "og:image");
    ogImg.setAttribute("content", fullOgImage);

    // 7. Twitter Meta Tags
    const twitterCard = getOrCreateMeta("name", "twitter:card");
    twitterCard.setAttribute("content", "summary_large_image");

    const twitterTitle = getOrCreateMeta("name", "twitter:title");
    twitterTitle.setAttribute("content", formattedTitle);

    const twitterDesc = getOrCreateMeta("name", "twitter:description");
    twitterDesc.setAttribute("content", description);

    const twitterImg = getOrCreateMeta("name", "twitter:image");
    twitterImg.setAttribute("content", fullOgImage);

    // 8. Structured Data (JSON-LD)
    // Remove any existing dynamic schema script tags
    const existingScripts = document.querySelectorAll("script[type='application/ld+json'].dynamic-schema");
    existingScripts.forEach((s) => s.remove());

    if (schema) {
      const schemas = Array.isArray(schema) ? schema : [schema];
      schemas.forEach((s) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.className = "dynamic-schema";
        script.innerHTML = JSON.stringify(s);
        document.head.appendChild(script);
      });
    }

    return () => {
      // Cleanup dynamically created script tags when the component unmounts or changes
      const scripts = document.querySelectorAll("script[type='application/ld+json'].dynamic-schema");
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, keywords, canonical, robots, ogType, ogImage, schema, currentUrl]);

  return null;
};

export default SEO;
