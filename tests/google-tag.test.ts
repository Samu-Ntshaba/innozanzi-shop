import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { googleTagBootstrap } from "@/lib/google-tag";
function run(cookie = "") {
  const window = { location: { origin: "https://shop.example", pathname: "/checkout/complete/private-order" }, dataLayer: [] as unknown[][] };
  const context = { window, document: { cookie }, dataLayer: window.dataLayer };
  runInNewContext(googleTagBootstrap("AW-18425004357"), context);
  return window.dataLayer.map(args => Array.from(args));
}
it("configures Ads for fresh visitors only after default denied consent and redaction", () => {
  const queue = run();
  expect(queue[0]).toEqual(["consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
  expect(queue[1]).toEqual(["set", "ads_data_redaction", true]);
  expect(queue.at(-1)).toEqual(["config", "AW-18425004357", { page_location: "https://shop.example/checkout", page_referrer: "", page_title: "Innozanzi Shop", allow_google_signals: false, allow_ad_personalization_signals: false }]);
});
it("does not treat analytics consent as advertising consent", () => {
  expect(run("innozanzi-consent=analytics").find(a => a[1] === "update")?.[2]).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
  expect(run("innozanzi-ad-consent=granted").find(a => a[1] === "update")?.[2]).toMatchObject({ analytics_storage: "denied", ad_storage: "granted", ad_personalization: "denied" });
});
it("rejects executable or malformed destination IDs", () => {
  for (const id of ["", "G-123", "AW-1');alert(1);//", "AW-123</script>"]) expect(googleTagBootstrap(id)).toBe("");
});
