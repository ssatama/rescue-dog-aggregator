import { render } from "../../../test-utils";
import { Analytics, SpeedInsights } from "../index";

describe("Analytics Integration", () => {
  it("exports Analytics and SpeedInsights components", () => {
    expect(Analytics).toBeDefined();
    expect(SpeedInsights).toBeDefined();
  });

  it("renders both components without errors", () => {
    expect(() => {
      render(
        <div>
          <Analytics />
          <SpeedInsights />
        </div>,
      );
    }).not.toThrow();
  });

  it("can be imported using named imports", () => {
    const {
      Analytics: AnalyticsComponent,
      SpeedInsights: SpeedInsightsComponent,
    } = require("../index");

    expect(AnalyticsComponent).toBeDefined();
    expect(SpeedInsightsComponent).toBeDefined();
  });
});
