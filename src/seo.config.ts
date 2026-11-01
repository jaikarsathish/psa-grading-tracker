// Search and AI-answer-engine settings for this app, written by MonstarX's SEO/GEO settings.
//
// Change them in Preview → SEO/GEO or through the authorized builder SEO tools, not here: every save replaces this file. The managed helper
// src/lib/monstarx/seo.ts turns them into the <head> of every page, /robots.txt, /sitemap.xml and /llms.txt.

import type { SeoConfig } from '@/lib/monstarx/seo'

export const seo: SeoConfig = {
  "siteUrl": "",
  "siteName": "Need To Build A Psa",
  "defaultTitle": "PSA Grading Tracker",
  "titleTemplate": "%s · PSA Grading Tracker",
  "defaultDescription": "Track PSA card grading submissions, grades, values and turnaround times.",
  "keywords": [],
  "locale": "en",
  "themeColor": "",
  "image": null,
  "imageAlt": "",
  "twitterSite": "",
  "twitterCard": "summary_large_image",
  "indexable": false,
  "robots": {
    "mode": "allow",
    "disallow": [],
    "aiCrawlers": "allow",
    "custom": ""
  },
  "sitemap": {
    "enabled": true,
    "exclude": [],
    "extra": []
  },
  "llms": {
    "enabled": true,
    "summary": "",
    "notes": ""
  },
  "organization": {
    "name": "Need To Build A Psa",
    "type": "Organization",
    "logo": null,
    "sameAs": [],
    "email": "",
    "phone": "",
    "address": ""
  },
  "verification": {
    "google": "",
    "bing": "",
    "yandex": "",
    "pinterest": ""
  },
  "faq": [],
  "pages": [
    {
      "path": "/",
      "title": "PSA Grading Tracker — Dashboard"
    },
    {
      "path": "/airings"
    },
    {
      "path": "/campaigns"
    },
    {
      "path": "/creatives"
    },
    {
      "path": "/llms.txt"
    },
    {
      "path": "/rates"
    },
    {
      "path": "/reports"
    },
    {
      "path": "/robots.txt"
    },
    {
      "path": "/sitemap.xml"
    },
    {
      "path": "/team"
    },
    {
      "path": "/analytics",
      "title": "PSA Analytics — grades and value"
    },
    {
      "path": "/track",
      "title": "Track your PSA submission"
    }
  ],
  "paths": [
    "/",
    "/airings",
    "/campaigns",
    "/creatives",
    "/llms.txt",
    "/rates",
    "/reports",
    "/robots.txt",
    "/sitemap.xml",
    "/team"
  ]
}

export default seo
