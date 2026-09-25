import { renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useLegacyDogHash } from "../useLegacyDogHash";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

const replace = jest.fn();

function openAt(url: string) {
  window.history.replaceState(null, "", url);
  renderHook(() => useLegacyDogHash());
}

describe("useLegacyDogHash", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace });
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it.each(["/dogs", "/breeds/labrador-retriever", "/organizations/dogs-trust", "/favorites"])(
    "sends an old %s#dog=<slug> overlay link to the dog's page",
    (path) => {
      openAt(`${path}#dog=rex-12`);
      expect(replace).toHaveBeenCalledWith("/dogs/rex-12");
    },
  );

  it("leaves a link to a dog without a slug where it is", () => {
    openAt("/dogs#dog=unknown-dog-42");
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores other anchors", () => {
    openAt("/dogs#dogs-grid");
    expect(replace).not.toHaveBeenCalled();
  });
});
