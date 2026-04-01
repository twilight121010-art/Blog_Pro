<script setup lang="ts">
import AvatarImage from "@/components/AvatarImage.vue";
import { uploadImageFile } from "@/lib/files";
import {
  buildRegionSummary,
  createEmptyRegionDraft,
  hydrateRegionDraftFromSummary,
  normalizeChinaRegions,
  normalizeCountries,
  updateRegionCity,
  updateRegionCountry,
  updateRegionCounty,
  updateRegionProvince,
} from "@/lib/regions";
import { useAuthStore } from "@/stores/auth";
import { useNoticeStore } from "@/stores/notices";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const noticeStore = useNoticeStore();
const router = useRouter();
const feedback = ref("");
const deleteConfirmValue = ref("");
const regionLoading = ref(false);
const regionLoadError = ref("");
const feedbackClass = computed(() =>
  feedback.value === "资料已保存" ? "" : "danger-copy",
);
const canDeleteAccount = computed(
  () => deleteConfirmValue.value.trim() === (authStore.user?.username ?? ""),
);

const form = reactive({
  nickname: "",
  avatarUrl: "",
  bio: "",
  region: "",
  website: "",
});

const regionState = reactive({
  countries: [] as ReturnType<typeof normalizeCountries>,
  provinces: [] as ReturnType<typeof normalizeChinaRegions>,
  draft: createEmptyRegionDraft(),
});

const isChina = computed(() => regionState.draft.countryCode === "CN");
const selectedProvince = computed(
  () => regionState.provinces.find((item) => item.code === regionState.draft.provinceCode) ?? null,
);
const cityOptions = computed(() => selectedProvince.value?.cities ?? []);
const selectedCity = computed(
  () => cityOptions.value.find((item) => item.code === regionState.draft.cityCode) ?? null,
);
const countyOptions = computed(() => selectedCity.value?.counties ?? []);

const summaryItems = computed(() => [
  {
    label: "用户名",
    value: authStore.user?.username ?? "",
  },
  {
    label: "用户 ID",
    value: authStore.user?.userCode ?? "",
  },
  {
    label: "地区",
    value: form.region || "未设置",
  },
  {
    label: "站点",
    value: form.website || "未设置",
  },
  {
    label: "介绍",
    value: form.bio || "还没有介绍",
  },
]);

function syncRegionSummary() {
  form.region = buildRegionSummary(regionState.draft);
}

function hydrateRegionDraft(regionSummary: string | null | undefined) {
  const draft = hydrateRegionDraftFromSummary(
    regionSummary,
    regionState.countries,
    regionState.provinces,
  );
  Object.assign(regionState.draft, draft);
  syncRegionSummary();
}

async function loadRegionData() {
  regionLoading.value = true;
  regionLoadError.value = "";

  try {
    const [countriesResponse, chinaResponse] = await Promise.all([
      fetch("/data/countries.json"),
      fetch("/data/china-level.json"),
    ]);

    const [countriesData, chinaData] = await Promise.all([
      countriesResponse.json(),
      chinaResponse.json(),
    ]);

    regionState.countries = normalizeCountries(countriesData);
    regionState.provinces = normalizeChinaRegions(chinaData);
    hydrateRegionDraft(form.region);
  } catch (error) {
    regionLoadError.value = error instanceof Error ? error.message : "地区数据加载失败";
  } finally {
    regionLoading.value = false;
  }
}

function handleCountryChange(countryCode: string) {
  updateRegionCountry(regionState.draft, regionState.countries, countryCode);
  syncRegionSummary();
}

function handleProvinceChange(provinceCode: string) {
  updateRegionProvince(regionState.draft, regionState.provinces, provinceCode);
  syncRegionSummary();
}

function handleCityChange(cityCode: string) {
  updateRegionCity(regionState.draft, selectedProvince.value, cityCode);
  syncRegionSummary();
}

function handleCountyChange(countyCode: string) {
  updateRegionCounty(regionState.draft, selectedCity.value, countyCode);
  syncRegionSummary();
}

watch(
  () => authStore.user,
  (user) => {
    form.nickname = user?.nickname ?? "";
    form.avatarUrl = user?.avatarUrl ?? "";
    form.bio = user?.bio ?? "";
    form.region = user?.region ?? "";
    form.website = user?.website ?? "";

    if (regionState.countries.length) {
      hydrateRegionDraft(user?.region ?? "");
    }
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  void loadRegionData();
});

async function handleSave() {
  feedback.value = "";
  syncRegionSummary();

  try {
    await authStore.updateProfile({
      nickname: form.nickname,
      avatarUrl: form.avatarUrl || null,
      bio: form.bio || null,
      region: form.region || null,
      website: form.website || null,
    });
    feedback.value = "资料已保存";
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "保存失败";
  }
}

async function handleAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  feedback.value = "";

  try {
    const asset = await uploadImageFile(file, "avatars");
    form.avatarUrl = asset.publicUrl;
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "头像上传失败";
  } finally {
    input.value = "";
  }
}

function clearAvatar() {
  form.avatarUrl = "";
}

async function handleDeleteAccount() {
  if (!authStore.user || !canDeleteAccount.value) {
    return;
  }

  feedback.value = "";

  try {
    await authStore.deleteAccount();
    deleteConfirmValue.value = "";
    noticeStore.push("账号已删除", "info");
    await router.push("/auth");
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "删除账号失败";
  }
}
</script>

<template>
  <section class="page-stack">
    <section v-if="!authStore.user" class="empty-card">
      <h3>请先登录</h3>
      <p>登录后即可编辑头像、昵称和个人介绍。</p>
      <RouterLink class="ghost-button link-button" to="/auth">前往登录</RouterLink>
    </section>

    <section v-else class="panel-surface profile-panel">
      <form class="form-stack" @submit.prevent="handleSave">
        <div class="profile-hero">
          <div class="avatar-upload-field">
            <AvatarImage
              :src="form.avatarUrl"
              :name="form.nickname || authStore.user.nickname"
              :alt="`${form.nickname || authStore.user.nickname} 的头像`"
              size="xl"
              preview
            />

            <div class="avatar-upload-copy">
              <h1 class="profile-title">{{ form.nickname || authStore.user.nickname }}</h1>
              <p class="helper-copy">
                用户名：@{{ authStore.user.username }} · 用户 ID：{{ authStore.user.userCode }}
              </p>
              <div class="action-row tight">
                <label class="secondary-button upload-button" for="profile-avatar">
                  更换头像
                </label>
                <button
                  v-if="form.avatarUrl"
                  class="secondary-button"
                  type="button"
                  @click="clearAvatar"
                >
                  移除头像
                </button>
              </div>
              <input
                id="profile-avatar"
                type="file"
                accept="image/*"
                hidden
                @change="handleAvatarSelected"
              />
            </div>
          </div>
        </div>

        <div class="profile-summary-row">
          <span v-for="item in summaryItems" :key="item.label" class="portal-chip">
            <strong>{{ item.label }}:</strong> {{ item.value }}
          </span>
        </div>

        <div class="field-grid">
          <label class="form-field">
            <span>用户名</span>
            <input :value="authStore.user.username" class="text-input" disabled />
          </label>

          <label class="form-field">
            <span>昵称</span>
            <input v-model.trim="form.nickname" class="text-input" required />
          </label>
        </div>

        <label class="form-field">
          <span>用户 ID</span>
          <input :value="authStore.user.userCode" class="text-input" disabled />
        </label>

        <section class="region-panel">
          <div>
            <span class="region-title">地区</span>
          </div>

          <div v-if="regionLoading" class="helper-copy">正在加载地区选项...</div>
          <p v-else-if="regionLoadError" class="helper-copy danger-copy">{{ regionLoadError }}</p>

          <div v-else class="profile-region-grid">
            <label class="form-field">
              <span>国家</span>
              <select
                class="select-input"
                :value="regionState.draft.countryCode"
                @change="handleCountryChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">请选择国家</option>
                <option
                  v-for="country in regionState.countries"
                  :key="country.code"
                  :value="country.code"
                >
                  {{ country.name }}<template v-if="country.englishName"> / {{ country.englishName }}</template>
                </option>
              </select>
            </label>

            <label class="form-field">
              <span>省份</span>
              <select
                class="select-input"
                :value="regionState.draft.provinceCode"
                :disabled="!isChina"
                @change="handleProvinceChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ isChina ? "请选择省份" : "先选择中国" }}</option>
                <option
                  v-for="province in regionState.provinces"
                  :key="province.code"
                  :value="province.code"
                >
                  {{ province.name }}
                </option>
              </select>
            </label>

            <label class="form-field">
              <span>市</span>
              <select
                class="select-input"
                :value="regionState.draft.cityCode"
                :disabled="!isChina || !regionState.draft.provinceCode"
                @change="handleCityChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ isChina ? "请选择市" : "先选择中国" }}</option>
                <option v-for="city in cityOptions" :key="city.code" :value="city.code">
                  {{ city.name }}
                </option>
              </select>
            </label>

            <label class="form-field">
              <span>县 / 区</span>
              <select
                class="select-input"
                :value="regionState.draft.countyCode"
                :disabled="!isChina || !regionState.draft.cityCode"
                @change="handleCountyChange(($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ isChina ? "请选择县 / 区" : "先选择中国" }}</option>
                <option v-for="county in countyOptions" :key="county.code" :value="county.code">
                  {{ county.name }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <div class="field-grid">
          <label class="form-field">
            <span>地区摘要</span>
            <input :value="form.region || '未设置'" class="text-input" disabled />
          </label>

          <label class="form-field">
            <span>个人网站</span>
            <input v-model.trim="form.website" class="text-input" placeholder="https://example.com" />
          </label>
        </div>

        <label class="form-field">
          <span>个人介绍</span>
          <textarea
            v-model.trim="form.bio"
            class="textarea-input"
            rows="5"
            maxlength="240"
            placeholder="介绍一下你自己"
          />
        </label>

        <div class="action-row">
          <button class="ghost-button" type="submit" :disabled="authStore.pending || regionLoading">
            {{ authStore.pending ? "保存中..." : "保存资料" }}
          </button>
        </div>

        <section class="account-danger-zone">
          <div>
            <h2 class="danger-zone-title">删除账号</h2>
            <p class="helper-copy">
              删除后，你的文章、打卡记录、提醒、头像和上传文件都会一起移除，不能恢复。
            </p>
          </div>

          <label class="form-field">
            <span>输入用户名确认</span>
            <input
              v-model.trim="deleteConfirmValue"
              class="text-input"
              :placeholder="authStore.user.username"
              :disabled="authStore.pending"
            />
          </label>

          <div class="action-row tight">
            <button
              class="danger-button"
              type="button"
              :disabled="authStore.pending || !canDeleteAccount"
              @click="handleDeleteAccount"
            >
              {{ authStore.pending ? "删除中..." : "永久删除账号" }}
            </button>
          </div>
        </section>

        <p
          v-if="feedback || authStore.error"
          class="helper-copy"
          :class="feedback ? feedbackClass : 'danger-copy'"
        >
          {{ feedback || authStore.error }}
        </p>
      </form>
    </section>
  </section>
</template>

<style scoped>
.region-panel {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--line-soft);
  border-radius: 22px;
  background: var(--bg-panel-strong);
}

.region-title {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.profile-region-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.account-danger-zone {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid rgba(181, 77, 45, 0.18);
  border-radius: 22px;
  background: rgba(181, 77, 45, 0.06);
}

.danger-zone-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-red);
}

@media (max-width: 720px) {
  .profile-region-grid {
    grid-template-columns: 1fr;
  }
}
</style>
