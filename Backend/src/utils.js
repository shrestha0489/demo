export const normalizeUrl = (url) => {
  let normalized = url;
  console.log("URL before normalization:", normalized);

  if (/^https?:\/\//.test(normalized)) {
    normalized = normalized.replace(/^https?:\/\//, "");
  }

  if (/^www\./.test(normalized)) {
    normalized = normalized.replace(/^www\./, "");
  }

  if (/\/+$/.test(normalized)) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized;
};

/**
 * Extracts base domain from a URL
 * @param {string} url - Full URL
 * @returns {string} - Base domain (e.g., abc.com)
 */
export const extractBaseDomain = (url) => {
  try {
    // Remove protocol and get hostname
    let hostname = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    // Extract base domain (domain.tld)
    const parts = hostname.split('.');
    if (parts.length > 2) {
      // Get the last two parts of the domain
      hostname = parts.slice(-2).join('.');
    }

    return hostname;
  } catch (error) {
    console.error("Error extracting base domain:", error);
    return url;
  }
};

/**
 * Extracts domain information from URL
 */
export const extractDomainInfo = async (encodedUrl) => {
  if (!encodedUrl) {
    throw new Error("Missing URL");
  }

  const url = decodeURIComponent(encodedUrl);
  const fullUrl = normalizeUrl(url);
  const baseDomain = extractBaseDomain(fullUrl);
  console.log("Processing domain:", baseDomain);

  return { url, fullUrl, baseDomain };
};


/**
 * Escapes special characters in a string for use in SQL queries.
 * @param {string} str - The string to escape.
 * @returns {string} - The escaped string.
 */
export const escapeSQL = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
};