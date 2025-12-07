import { describe, expect, it } from "bun:test";

import { createS3Signer } from "@acme/backend/shared/s3";

describe("s3 signer", () => {
  it("builds fallback signed url without bucket", async () => {
    const signer = createS3Signer({ baseUrl: "https://s3.local" });
    const result = await signer.signPutUrl("folder/file.png");
    expect(result.uploadUrl).toContain("folder/file.png");
    expect(result.photoUrl).toContain("folder/file.png");
  });
});
