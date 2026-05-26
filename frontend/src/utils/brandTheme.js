export const DEFAULT_BRAND_THEME = {
  primary: '#166534',
  primaryDark: '#0f3f25',
  secondary: '#d6b24a',
  surface: '#f5f7f4',
  soft: '#ecfdf5',
  textOnPrimary: '#ffffff'
};

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

const toHex = ([r, g, b]) =>
  `#${[r, g, b].map(value => clamp(value).toString(16).padStart(2, '0')).join('')}`;

const mix = (rgb, target, amount) =>
  rgb.map((value, index) => value + (target[index] - value) * amount);

const normalizeRgb = (rgb) => rgb.map(value => clamp(value));

const luminance = ([r, g, b]) => {
  const normalized = [r, g, b].map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return normalized[0] * 0.2126 + normalized[1] * 0.7152 + normalized[2] * 0.0722;
};

const saturation = ([r, g, b]) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
};

const isUsefulColor = ([r, g, b, a = 255]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = luminance([r, g, b]);
  const sat = saturation([r, g, b]);

  return (
    a > 170 &&
    sat > 0.16 &&
    max - min > 18 &&
    lum > 0.035 &&
    lum < 0.94 &&
    !(max > 242 && min > 226) &&
    !(max < 34)
  );
};

const colorDistance = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const dominantScore = (color) => {
  const lum = luminance(color.rgb);
  const sat = saturation(color.rgb);
  const uiLumPenalty = lum > 0.78 ? 0.72 : lum < 0.08 ? 0.76 : 1;

  return color.count * (0.72 + sat * 0.45) * uiLumPenalty;
};

const makePrimaryUsable = (rgb) => {
  const normalized = normalizeRgb(rgb);
  const lum = luminance(normalized);

  if (lum > 0.72) return mix(normalized, [0, 0, 0], 0.42);
  if (lum < 0.08) return mix(normalized, [255, 255, 255], 0.18);

  return normalized;
};

const makeSecondary = (primaryRgb, colors) => {
  const differentDominant = colors.find(color => (
    colorDistance(color.rgb, primaryRgb) > 74 &&
    color.count >= colors[0].count * 0.12
  ));

  if (differentDominant) {
    return normalizeRgb(differentDominant.rgb);
  }

  const primaryLum = luminance(primaryRgb);
  const target = primaryLum > 0.38 ? [255, 255, 255] : [245, 188, 66];
  const amount = primaryLum > 0.38 ? 0.34 : 0.48;

  return normalizeRgb(mix(primaryRgb, target, amount));
};

export const getLogoPalette = (logoUrl) =>
  new Promise(resolve => {
    if (!logoUrl) {
      resolve(DEFAULT_BRAND_THEME);
      return;
    }

    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);

        const { data } = context.getImageData(0, 0, size, size);
        const buckets = new Map();

        for (let index = 0; index < data.length; index += 4) {
          const pixel = [data[index], data[index + 1], data[index + 2], data[index + 3]];
          if (!isUsefulColor(pixel)) continue;

          const key = pixel.slice(0, 3).map(value => Math.round(value / 32) * 32).join(',');
          const current = buckets.get(key) || { count: 0, rgb: [0, 0, 0] };
          current.count += 1;
          current.rgb = current.rgb.map((value, channel) => value + pixel[channel]);
          buckets.set(key, current);
        }

        const colors = [...buckets.values()]
          .map(bucket => ({
            count: bucket.count,
            rgb: bucket.rgb.map(value => value / bucket.count)
          }))
          .sort((a, b) => dominantScore(b) - dominantScore(a));

        if (colors.length === 0) {
          resolve(DEFAULT_BRAND_THEME);
          return;
        }

        const primaryRgb = colors[0].rgb;
        const primaryForUi = makePrimaryUsable(primaryRgb);
        const secondaryRgb = makeSecondary(primaryRgb, colors);

        const primaryDark = mix(primaryForUi, [0, 0, 0], 0.35);
        const soft = mix(primaryForUi, [255, 255, 255], 0.9);
        const surface = mix(primaryForUi, [255, 255, 255], 0.94);

        resolve({
          primary: toHex(primaryForUi),
          primaryDark: toHex(primaryDark),
          secondary: toHex(secondaryRgb),
          surface: toHex(surface),
          soft: toHex(soft),
          textOnPrimary: luminance(primaryForUi) > 0.45 ? '#111827' : '#ffffff'
        });
      } catch (error) {
        resolve(DEFAULT_BRAND_THEME);
      }
    };

    image.onerror = () => resolve(DEFAULT_BRAND_THEME);
    image.src = logoUrl;
  });

export const getBrandThemeVars = (theme) => ({
  '--brand-primary': theme.primary,
  '--brand-primary-dark': theme.primaryDark,
  '--brand-secondary': theme.secondary,
  '--brand-surface': theme.surface,
  '--brand-soft': theme.soft,
  '--brand-on-primary': theme.textOnPrimary
});
