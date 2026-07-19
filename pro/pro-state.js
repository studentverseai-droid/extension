"use strict";
(() => {
  const SETTING_KEY = "proActive";
  const PITCH_TEXT = "Multi-device sync and AI-powered summarization are on the way.";
  const ACTIVE_TEXT = "Snipaze Pro is active. Thanks for your support!";
  const TOOLTIP_INACTIVE = "Snipaze Pro";
  const TOOLTIP_ACTIVE = "Snipaze Pro is active";
  const CTA_LABEL = "Get Pro";
  const CTA_SIGNING_IN_LABEL = "Connecting…";
  const UPGRADE_LABEL = "Upgrade to Yearly";
  const UPGRADE_LABEL_FOUNDER = "Upgrade to Yearly (Founder's price ₹2,250)";
  const PRICING_URL = "https://snipaze.in/pricing.html";
  // Kept in sync with UPGRADE_WINDOW_DAYS in supabase/functions/founder-upgrade/index.ts -
  // that copy is the authoritative one (enforced server-side); this one only decides
  // whether to show the discounted upgrade button.
  const FOUNDER_UPGRADE_WINDOW_DAYS = 15;

  function applyProToolState(root, isActive) {
    const toolEl = root?.querySelector?.(".pro-tool");
    if (!toolEl) return;
    const active = isActive === true;
    toolEl.classList.toggle("active", active);
    toolEl.title = active ? TOOLTIP_ACTIVE : TOOLTIP_INACTIVE;
  }

  function renderProCtaHtml() {
    return `<button type="button" class="pro-cta" data-action="start-pro-signin">${CTA_LABEL}</button>`;
  }

  function renderUpgradeCtaHtml(label) {
    return `<button type="button" class="pro-cta" data-action="open-pricing">${label}</button>`;
  }

  function formatRenewalDate(isoDate) {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function isWithinFounderUpgradeWindow(monthlyStartedAt) {
    if (!monthlyStartedAt) return false;
    const startedAt = new Date(monthlyStartedAt);
    if (Number.isNaN(startedAt.getTime())) return false;
    const daysSinceStart = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart <= FOUNDER_UPGRADE_WINDOW_DAYS;
  }

  function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  function renderPlanTable(rows, currentIndex) {
    const body = rows
      .map(([phase, starts, ends], index) => {
        const marker = index === currentIndex ? " (you are here)" : "";
        return `<tr><td>${phase}${marker}</td><td>${starts}</td><td>${ends}</td></tr>`;
      })
      .join("");
    return `<table class="pro-plan-table"><thead><tr><th>Phase</th><th>Starts</th><th>Ends</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  // Shared by both the "waiting for Yearly to start" and "Yearly/bonus in progress"
  // panel states, since both show the same Monthly -> Yearly -> Bonus journey -
  // just with a different row marked as the current one.
  function renderFounderJourneyTable(monthlyStartedAt, monthlyEnd, currentIndex) {
    const yearlyEnd = addMonths(monthlyEnd, 12);
    const bonusEnd = addMonths(monthlyEnd, 13);
    const monthlyStartedDate = formatRenewalDate(monthlyStartedAt) || "Already started";
    return renderPlanTable(
      [
        ["Monthly plan", monthlyStartedDate, formatRenewalDate(monthlyEnd)],
        ["Yearly plan", formatRenewalDate(monthlyEnd), formatRenewalDate(yearlyEnd)],
        ["Bonus month", formatRenewalDate(yearlyEnd), formatRenewalDate(bonusEnd)],
      ],
      currentIndex,
    );
  }

  function renderProPanelHtml(status) {
    const isActive = status?.isPaid === true;
    if (!isActive) {
      return `<h2>Snipaze Pro</h2><p>${PITCH_TEXT}</p>${renderProCtaHtml()}`;
    }

    const renewalDate = formatRenewalDate(status.currentPeriodEnd);
    const renewalLine = renewalDate ? ` Renews on ${renewalDate}.` : "";

    if (status.pendingYearlyTransition) {
      const monthlyEnd = status.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null;
      if (!monthlyEnd || Number.isNaN(monthlyEnd.getTime())) {
        return `<h2>Snipaze Pro</h2><p>You're on the Monthly plan. Your Founder's Upgrade to Yearly is scheduled.</p>`;
      }
      const table = renderFounderJourneyTable(status.monthlyStartedAt, monthlyEnd, 0);
      return `<h2>Snipaze Pro</h2><p>You're on the Monthly plan. Your Founder's Upgrade is scheduled:</p>${table}`;
    }

    if (status.plan === "yearly" && status.bonusMonthPending && status.yearlyStartedAt) {
      const monthlyEnd = new Date(status.yearlyStartedAt);
      if (!Number.isNaN(monthlyEnd.getTime())) {
        const yearlyEnd = addMonths(monthlyEnd, 12);
        const currentIndex = new Date() < yearlyEnd ? 1 : 2;
        const table = renderFounderJourneyTable(status.monthlyStartedAt, monthlyEnd, currentIndex);
        return `<h2>Snipaze Pro</h2><p>You're on the Yearly plan.</p>${table}`;
      }
    }

    if (status.plan === "yearly") {
      return `<h2>Snipaze Pro</h2><p>You're on the Yearly plan.${renewalLine}</p>`;
    }

    if (status.plan === "monthly") {
      const label = isWithinFounderUpgradeWindow(status.monthlyStartedAt) ? UPGRADE_LABEL_FOUNDER : UPGRADE_LABEL;
      return `<h2>Snipaze Pro</h2><p>You're on the Monthly plan.${renewalLine}</p>${renderUpgradeCtaHtml(label)}`;
    }

    return `<h2>Snipaze Pro</h2><p>${ACTIVE_TEXT}</p>`;
  }

  function startGoogleSignIn() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GOOGLE_SIGN_IN" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "No response from background." });
      });
    });
  }

  async function handleProCtaClick(buttonEl) {
    if (!buttonEl || buttonEl.disabled) return;
    const originalLabel = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = CTA_SIGNING_IN_LABEL;
    const result = await startGoogleSignIn();
    if (result.ok) {
      buttonEl.textContent = `Signed in as ${result.email}`;
      buttonEl.title = "Google account connected";
      if (!result.isPaid && result.accessToken) {
        window.open(`${PRICING_URL}#token=${encodeURIComponent(result.accessToken)}`, "_blank");
      }
    } else {
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel;
      buttonEl.title = result.error || "Sign-in failed";
    }
  }

  async function handleUpgradeClick(buttonEl) {
    if (!buttonEl || buttonEl.disabled) return;
    const originalLabel = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = CTA_SIGNING_IN_LABEL;
    const result = await startGoogleSignIn();
    if (result.ok && result.accessToken) {
      window.open(`${PRICING_URL}#token=${encodeURIComponent(result.accessToken)}`, "_blank");
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel;
    } else {
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel;
      buttonEl.title = result.error || "Could not open the upgrade page.";
    }
  }

  globalThis.SnipazePro = {
    SETTING_KEY,
    PITCH_TEXT,
    ACTIVE_TEXT,
    CTA_LABEL,
    applyProToolState,
    renderProCtaHtml,
    renderProPanelHtml,
    startGoogleSignIn,
    handleProCtaClick,
    handleUpgradeClick,
  };
})();
