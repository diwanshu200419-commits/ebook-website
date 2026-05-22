(function () {
  var DEFAULT_SITE_NAME = "E-Book Market";
  var DEFAULT_SITE_ORIGIN = "https://ebook-website-theta-nine.vercel.app";
  var DEFAULT_IMAGE = "/assets/covers/ai.png";
  var DEFAULT_THEME_COLOR = "#050816";
  var DEFAULT_LOCALE = "en_IN";
  var DEFAULT_ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

  var PAGE_MAP = {
    "/": {
      title: "E-Book Market | AI Creator Marketplace for Students and Digital Products",
      description: "Sell ebooks, notes, AI prompts, templates, study packs, and digital products on an India-built creator marketplace with worldwide reach.",
      keywords: "AI creator marketplace, sell ebooks online, study notes marketplace, digital products India, AI prompts marketplace, creator economy platform, student income platform",
      path: "/",
      type: "website",
      schemaType: "WebSite",
    },
    "/index.html": {
      title: "E-Book Market | AI Creator Marketplace for Students and Digital Products",
      description: "Sell ebooks, notes, AI prompts, templates, study packs, and digital products on an India-built creator marketplace with worldwide reach.",
      keywords: "AI creator marketplace, sell ebooks online, study notes marketplace, digital products India, AI prompts marketplace, creator economy platform, student income platform",
      path: "/",
      type: "website",
      schemaType: "WebSite",
    },
    "/explore.html": {
      title: "Explore Digital Products | E-Book Market Marketplace",
      description: "Discover ebooks, student notes, AI prompts, templates, digital assets, and creator products with AI-powered recommendations and secure checkout.",
      keywords: "explore digital products, ebook marketplace, AI prompts, student notes, creator products, digital downloads",
      path: "/explore.html",
      type: "website",
      schemaType: "CollectionPage",
    },
    "/book_view.html": {
      title: "Digital Product | E-Book Market",
      description: "Preview and buy digital books, notes, prompts, and creator products on E-Book Market.",
      keywords: "digital product, ebook preview, buy study notes, AI digital product",
      path: "/book_view.html",
      type: "product",
      schemaType: "Product",
    },
    "/creator/creator.html": {
      title: "Creator Profile | E-Book Market",
      description: "Explore creator profiles, digital catalogs, follower signals, and live marketplace products on E-Book Market.",
      keywords: "creator profile, digital creator, knowledge seller, student creator marketplace",
      path: "/creator/creator.html",
      type: "profile",
      schemaType: "ProfilePage",
    },
    "/about.html": {
      title: "About E-Book Market | Global Creator Economy Platform",
      description: "Learn how E-Book Market helps students, teachers, and creators sell knowledge products and earn online worldwide.",
      keywords: "about ebook market, creator economy platform, student startup, digital product marketplace",
      path: "/about.html",
      type: "article",
      schemaType: "AboutPage",
    },
    "/for-creators.html": {
      title: "For Creators | Sell Ebooks, Notes, and AI Products",
      description: "Launch your creator storefront, upload digital products, and grow earnings with AI-powered creator tools on E-Book Market.",
      keywords: "sell digital products, creator hub, sell notes online, AI creator tools, ebook selling platform",
      path: "/for-creators.html",
      type: "article",
      schemaType: "WebPage",
    },
    "/blog.html": {
      title: "Creator Blog | E-Book Market",
      description: "Read growth, creator economy, AI product, and digital selling insights from the E-Book Market team.",
      keywords: "creator economy blog, AI product blog, digital selling blog, student startup blog",
      path: "/blog.html",
      type: "article",
      schemaType: "Blog",
    },
    "/contact.html": {
      title: "Contact E-Book Market | Support and Partnerships",
      description: "Contact E-Book Market for support, creator partnerships, business inquiries, and platform help.",
      keywords: "contact ebook market, creator support, marketplace support, partnerships",
      path: "/contact.html",
      type: "article",
      schemaType: "ContactPage",
    },
    "/help.html": {
      title: "Help Center | E-Book Market",
      description: "Get help with buying, selling, creator onboarding, payments, and account support on E-Book Market.",
      keywords: "help center, creator support, payment help, ebook marketplace help",
      path: "/help.html",
      type: "article",
      schemaType: "WebPage",
    },
    "/guidelines.html": {
      title: "Platform Guidelines | E-Book Market",
      description: "Review product, creator, and marketplace guidelines for publishing trusted digital products on E-Book Market.",
      keywords: "marketplace guidelines, creator guidelines, publishing rules, digital product standards",
      path: "/guidelines.html",
      type: "article",
      schemaType: "WebPage",
    },
    "/careers.html": {
      title: "Careers | E-Book Market",
      description: "Join E-Book Market and help build a global AI-powered creator economy platform for students and digital creators.",
      keywords: "ebook market careers, startup jobs, creator economy jobs, AI startup careers",
      path: "/careers.html",
      type: "article",
      schemaType: "WebPage",
    },
    "/privacy.html": {
      title: "Privacy Policy | E-Book Market",
      description: "Read the privacy policy for E-Book Market and learn how account, payment, and creator data is handled.",
      keywords: "privacy policy, data policy, ebook market privacy",
      path: "/privacy.html",
      type: "article",
      schemaType: "WebPage",
    },
    "/terms.html": {
      title: "Terms of Use | E-Book Market",
      description: "Review the marketplace terms, creator responsibilities, and buyer usage terms for E-Book Market.",
      keywords: "terms of use, creator marketplace terms, buyer terms",
      path: "/terms.html",
      type: "article",
      schemaType: "WebPage",
    },
    "/site.html": {
      title: "Site Map | E-Book Market",
      description: "Browse the main public pages of E-Book Market including marketplace, creator, help, and company pages.",
      keywords: "site map, website pages, ebook market sitemap",
      path: "/site.html",
      type: "article",
      schemaType: "WebPage",
    },
  };

  function normalizeOrigin(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function normalizePath(value) {
    var source = String(value || "").trim();
    if (!source) {
      return "/";
    }

    if (/^https?:\/\//i.test(source)) {
      try {
        return new URL(source).pathname || "/";
      } catch {
        return "/";
      }
    }

    return source.charAt(0) === "/" ? source : "/" + source;
  }

  function isLocalRuntime() {
    var hostname = String(window.location.hostname || "").trim().toLowerCase();
    var protocol = String(window.location.protocol || "").trim().toLowerCase();
    return protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1";
  }

  function resolveSiteOrigin() {
    var metaTag = document.querySelector('meta[name="ebook-site-origin"]');
    var metaOrigin = metaTag ? normalizeOrigin(metaTag.getAttribute("content")) : "";
    var globalOrigin = normalizeOrigin(window.__EBOOK_SITE_ORIGIN__ || "");

    if (metaOrigin) {
      return metaOrigin;
    }

    if (globalOrigin) {
      return globalOrigin;
    }

    if (!isLocalRuntime()) {
      return normalizeOrigin(window.location.origin);
    }

    return DEFAULT_SITE_ORIGIN;
  }

  function buildAbsoluteUrl(value) {
    if (!value) {
      return "";
    }

    if (/^https?:\/\//i.test(String(value))) {
      return String(value);
    }

    try {
      return new URL(String(value), resolveSiteOrigin() + "/").toString();
    } catch {
      return String(value);
    }
  }

  function getNormalizedPathname() {
    var path = normalizePath(window.location.pathname || "/");
    if (path === "/frontend" || path === "/frontend/") {
      return "/";
    }

    if (path.indexOf("/frontend/") === 0) {
      return path.slice("/frontend".length) || "/";
    }

    return path;
  }

  function ensureMeta(selector, attributes, content) {
    var element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement("meta");
      Object.keys(attributes || {}).forEach(function (key) {
        element.setAttribute(key, attributes[key]);
      });
      document.head.appendChild(element);
    }
    element.setAttribute("content", String(content || ""));
    return element;
  }

  function ensureLink(selector, rel, href, extraAttributes) {
    var element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement("link");
      element.setAttribute("rel", rel);
      document.head.appendChild(element);
    }

    element.setAttribute("href", href);
    Object.keys(extraAttributes || {}).forEach(function (key) {
      element.setAttribute(key, extraAttributes[key]);
    });
    return element;
  }

  function ensureJsonLd(id, payload) {
    if (!payload) {
      return;
    }

    var element = document.getElementById(id);
    if (!element) {
      element = document.createElement("script");
      element.type = "application/ld+json";
      element.id = id;
      document.head.appendChild(element);
    }

    element.textContent = JSON.stringify(payload);
  }

  function cleanText(value, fallback) {
    var text = String(value || fallback || "").replace(/\s+/g, " ").trim();
    if (!text) {
      return "";
    }

    return text.length > 180 ? text.slice(0, 177).trim() + "..." : text;
  }

  function collectBodyOverrides() {
    var body = document.body;
    if (!body || !body.dataset) {
      return {};
    }

    return {
      title: body.dataset.seoTitle || "",
      description: body.dataset.seoDescription || "",
      keywords: body.dataset.seoKeywords || "",
      path: body.dataset.seoPath || "",
      type: body.dataset.seoType || "",
      image: body.dataset.seoImage || "",
      robots: body.dataset.seoRobots || "",
      noindex: body.dataset.seoNoindex === "true",
      locale: body.dataset.seoLocale || "",
      schemaType: body.dataset.seoSchemaType || "",
    };
  }

  function getDefaultPageConfig() {
    var path = getNormalizedPathname();
    return PAGE_MAP[path] || {
      title: document.title || DEFAULT_SITE_NAME,
      description: "E-Book Market is a creator-first digital product marketplace for students, teachers, and AI-powered knowledge sellers.",
      keywords: "creator marketplace, digital products, ebooks, notes, AI products",
      path: path,
      type: "website",
      schemaType: "WebPage",
    };
  }

  function toKeywordString(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return String(item || "").trim();
      }).filter(Boolean).join(", ");
    }

    return String(value || "").trim();
  }

  function buildDefaultJsonLd(config, canonicalUrl, imageUrl) {
    var organization = {
      "@type": "Organization",
      name: DEFAULT_SITE_NAME,
      url: resolveSiteOrigin(),
      logo: buildAbsoluteUrl("/assets/default-avatar.png"),
    };

    if (config.schemaType === "WebSite") {
      return [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: DEFAULT_SITE_NAME,
          url: resolveSiteOrigin(),
          description: config.description,
          potentialAction: {
            "@type": "SearchAction",
            target: buildAbsoluteUrl("/explore.html?query={search_term_string}"),
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: organization.name,
          url: organization.url,
          logo: organization.logo,
        },
      ];
    }

    return {
      "@context": "https://schema.org",
      "@type": config.schemaType || "WebPage",
      name: config.title,
      description: config.description,
      url: canonicalUrl,
      image: imageUrl ? [imageUrl] : undefined,
      publisher: organization,
      inLanguage: config.locale === "hi_IN" ? "hi-IN" : "en-IN",
    };
  }

  function setAlternateLinks(canonicalUrl) {
    ["en", "hi", "x-default"].forEach(function (code) {
      ensureLink(
        'link[rel="alternate"][hreflang="' + code + '"]',
        "alternate",
        canonicalUrl,
        { hreflang: code }
      );
    });
  }

  function applySeo(input) {
    var base = getDefaultPageConfig();
    var bodyOverrides = collectBodyOverrides();
    var config = Object.assign({}, base, bodyOverrides, input || {});

    config.title = cleanText(config.title, base.title || DEFAULT_SITE_NAME);
    config.description = cleanText(config.description, base.description);
    config.keywords = toKeywordString(config.keywords || base.keywords);
    config.locale = String(config.locale || DEFAULT_LOCALE);
    config.robots = config.noindex ? "noindex,nofollow" : String(config.robots || DEFAULT_ROBOTS);
    config.type = String(config.type || "website");
    config.path = String(config.path || base.path || getNormalizedPathname());

    var canonicalUrl = buildAbsoluteUrl(config.path === "/" ? "/" : config.path);
    var imageUrl = buildAbsoluteUrl(config.image || DEFAULT_IMAGE);

    if (config.title) {
      document.title = config.title;
    }

    document.documentElement.setAttribute("lang", config.locale === "hi_IN" ? "hi" : "en");

    ensureMeta('meta[name="description"]', { name: "description" }, config.description);
    ensureMeta('meta[name="keywords"]', { name: "keywords" }, config.keywords);
    ensureMeta('meta[name="robots"]', { name: "robots" }, config.robots);
    ensureMeta('meta[name="googlebot"]', { name: "googlebot" }, config.robots);
    ensureMeta('meta[name="author"]', { name: "author" }, DEFAULT_SITE_NAME);
    ensureMeta('meta[name="application-name"]', { name: "application-name" }, DEFAULT_SITE_NAME);
    ensureMeta('meta[name="apple-mobile-web-app-title"]', { name: "apple-mobile-web-app-title" }, DEFAULT_SITE_NAME);
    ensureMeta('meta[name="theme-color"]', { name: "theme-color" }, DEFAULT_THEME_COLOR);
    ensureMeta('meta[name="format-detection"]', { name: "format-detection" }, "telephone=no");

    ensureMeta('meta[property="og:site_name"]', { property: "og:site_name" }, DEFAULT_SITE_NAME);
    ensureMeta('meta[property="og:type"]', { property: "og:type" }, config.type === "product" ? "product" : "website");
    ensureMeta('meta[property="og:title"]', { property: "og:title" }, config.title);
    ensureMeta('meta[property="og:description"]', { property: "og:description" }, config.description);
    ensureMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    ensureMeta('meta[property="og:image"]', { property: "og:image" }, imageUrl);
    ensureMeta('meta[property="og:locale"]', { property: "og:locale" }, config.locale);

    ensureMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    ensureMeta('meta[name="twitter:title"]', { name: "twitter:title" }, config.title);
    ensureMeta('meta[name="twitter:description"]', { name: "twitter:description" }, config.description);
    ensureMeta('meta[name="twitter:image"]', { name: "twitter:image" }, imageUrl);

    ensureLink('link[rel="canonical"]', "canonical", canonicalUrl);
    ensureLink('link[rel="manifest"]', "manifest", buildAbsoluteUrl("/site.webmanifest"));
    ensureLink('link[rel="icon"]', "icon", buildAbsoluteUrl("/assets/default-avatar.png"));
    ensureLink('link[rel="apple-touch-icon"]', "apple-touch-icon", buildAbsoluteUrl("/assets/default-avatar.png"));
    setAlternateLinks(canonicalUrl);

    var jsonLd = config.jsonLd === null
      ? null
      : (config.jsonLd || buildDefaultJsonLd(config, canonicalUrl, imageUrl));
    if (jsonLd) {
      ensureJsonLd("seo-structured-data", jsonLd);
    }

    return {
      canonicalUrl: canonicalUrl,
      imageUrl: imageUrl,
      siteOrigin: resolveSiteOrigin(),
    };
  }

  window.applySeo = applySeo;
  window.buildSeoAbsoluteUrl = buildAbsoluteUrl;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applySeo();
    });
  } else {
    applySeo();
  }
})();
