export interface CountryOption {
  code: string;
  name: string;
  englishName: string;
}

export interface CountyOption {
  code: string;
  name: string;
}

export interface CityOption {
  code: string;
  name: string;
  counties: CountyOption[];
}

export interface ProvinceOption {
  code: string;
  name: string;
  cities: CityOption[];
}

export interface RegionDraft {
  countryCode: string;
  countryName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  countyCode: string;
  countyName: string;
}

function normalizeCounties(list: unknown): CountyOption[] {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter(
      (item): item is { code?: unknown; name?: unknown } =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        typeof item.name === "string" &&
        item.name !== "市辖区",
    )
    .map((item) => ({
      code: String(item.code ?? ""),
      name: String(item.name ?? ""),
    }));
}

export function normalizeCountries(list: unknown): CountryOption[] {
  if (!Array.isArray(list)) {
    return [];
  }

  const seen = new Set<string>();
  const countries = list
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as {
        alpha2?: unknown;
        cnname?: unknown;
        name?: unknown;
      };
      const code = typeof record.alpha2 === "string" ? record.alpha2.trim().toUpperCase() : "";
      const name = typeof record.cnname === "string" ? record.cnname.trim() : "";
      const englishName = typeof record.name === "string" ? record.name.trim() : "";

      if (!code || !name || seen.has(code)) {
        return null;
      }

      seen.add(code);

      return {
        code,
        name,
        englishName,
      };
    })
    .filter((item): item is CountryOption => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

  const chinaIndex = countries.findIndex((item) => item.code === "CN");
  if (chinaIndex > 0) {
    const [china] = countries.splice(chinaIndex, 1);
    countries.unshift(china);
  }

  return countries;
}

export function normalizeChinaRegions(list: unknown): ProvinceOption[] {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((province) => {
      if (!province || typeof province !== "object") {
        return null;
      }

      const provinceRecord = province as {
        code?: unknown;
        name?: unknown;
        children?: unknown;
      };
      const provinceChildren = Array.isArray(provinceRecord.children) ? provinceRecord.children : [];
      const hasNestedCities = provinceChildren.some(
        (item) => typeof item === "object" && item !== null && Array.isArray((item as { children?: unknown }).children),
      );
      const cities = hasNestedCities
        ? provinceChildren.map((city) => {
            const cityRecord = city as { code?: unknown; name?: unknown; children?: unknown };

            return {
              code: String(cityRecord.code ?? ""),
              name: String(cityRecord.name ?? ""),
              counties: normalizeCounties(cityRecord.children),
            };
          })
        : [
            {
              code: String(provinceRecord.code ?? ""),
              name: String(provinceRecord.name ?? ""),
              counties: normalizeCounties(provinceChildren),
            },
          ];

      const code = String(provinceRecord.code ?? "");
      const name = String(provinceRecord.name ?? "");

      if (!code || !name) {
        return null;
      }

      return {
        code,
        name,
        cities,
      };
    })
    .filter((item): item is ProvinceOption => Boolean(item));
}

export function createEmptyRegionDraft(): RegionDraft {
  return {
    countryCode: "",
    countryName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    countyCode: "",
    countyName: "",
  };
}

export function buildRegionSummary(draft: RegionDraft) {
  const parts = [
    draft.countryName,
    draft.provinceName,
    draft.cityName,
    draft.countyName,
  ].filter(Boolean);

  return parts.join(" / ");
}

export function updateRegionCountry(
  draft: RegionDraft,
  countries: CountryOption[],
  countryCode: string,
) {
  const country = countries.find((item) => item.code === countryCode) ?? null;

  draft.countryCode = country?.code ?? "";
  draft.countryName = country?.name ?? "";
  draft.provinceCode = "";
  draft.provinceName = "";
  draft.cityCode = "";
  draft.cityName = "";
  draft.countyCode = "";
  draft.countyName = "";
}

export function updateRegionProvince(
  draft: RegionDraft,
  provinces: ProvinceOption[],
  provinceCode: string,
) {
  const province = provinces.find((item) => item.code === provinceCode) ?? null;

  draft.provinceCode = province?.code ?? "";
  draft.provinceName = province?.name ?? "";
  draft.cityCode = "";
  draft.cityName = "";
  draft.countyCode = "";
  draft.countyName = "";
}

export function updateRegionCity(
  draft: RegionDraft,
  province: ProvinceOption | null,
  cityCode: string,
) {
  const city = province?.cities.find((item) => item.code === cityCode) ?? null;

  draft.cityCode = city?.code ?? "";
  draft.cityName = city?.name ?? "";
  draft.countyCode = "";
  draft.countyName = "";
}

export function updateRegionCounty(
  draft: RegionDraft,
  city: CityOption | null,
  countyCode: string,
) {
  const county = city?.counties.find((item) => item.code === countyCode) ?? null;

  draft.countyCode = county?.code ?? "";
  draft.countyName = county?.name ?? "";
}

export function hydrateRegionDraftFromSummary(
  summary: string | null | undefined,
  countries: CountryOption[],
  provinces: ProvinceOption[],
) {
  const draft = createEmptyRegionDraft();
  const parts = summary
    ?.split("/")
    .map((part) => part.trim())
    .filter(Boolean) ?? [];

  if (!parts.length) {
    return draft;
  }

  const [countryName, provinceName, cityName, countyName] = parts;
  const country =
    countries.find((item) => item.name === countryName || item.englishName === countryName) ?? null;

  if (!country) {
    return draft;
  }

  draft.countryCode = country.code;
  draft.countryName = country.name;

  if (country.code !== "CN") {
    return draft;
  }

  const province = provinces.find((item) => item.name === provinceName) ?? null;
  if (!province) {
    return draft;
  }

  draft.provinceCode = province.code;
  draft.provinceName = province.name;

  const city =
    province.cities.find((item) => item.name === cityName) ??
    province.cities.find((item) => item.code === province.code) ??
    null;
  if (!city) {
    return draft;
  }

  draft.cityCode = city.code;
  draft.cityName = city.name;

  const county = city.counties.find((item) => item.name === countyName) ?? null;
  if (county) {
    draft.countyCode = county.code;
    draft.countyName = county.name;
  }

  return draft;
}
