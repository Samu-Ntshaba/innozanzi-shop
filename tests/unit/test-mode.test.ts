import { afterEach, describe, expect, it } from "vitest";
import { assertDisposableTestDatabase, isTestModeEnvironment, TEST_DELETION_GUARD } from "@/lib/test-mode";

const original={TEST_MODE_ENVIRONMENT:process.env.TEST_MODE_ENVIRONMENT,TEST_MODE_DELETION_GUARD:process.env.TEST_MODE_DELETION_GUARD,DATABASE_URL:process.env.DATABASE_URL,LIVE_DATABASE_URL:process.env.LIVE_DATABASE_URL};
afterEach(()=>{for(const[key,value]of Object.entries(original))if(value===undefined)delete process.env[key];else process.env[key]=value;});

describe("test mode safety",()=>{
  it("blocks cleanup without every disposable-environment guard",()=>{
    process.env.TEST_MODE_ENVIRONMENT="false";
    expect(()=>assertDisposableTestDatabase()).toThrow(/disabled/);
  });
  it("blocks cleanup when test and live database URLs match",()=>{
    process.env.TEST_MODE_ENVIRONMENT="true";process.env.TEST_MODE_DELETION_GUARD=TEST_DELETION_GUARD;process.env.DATABASE_URL="postgres://same";process.env.LIVE_DATABASE_URL="postgres://same";
    expect(()=>assertDisposableTestDatabase()).toThrow(/isolation/);
  });
  it("allows cleanup only for an explicitly isolated database",()=>{
    process.env.TEST_MODE_ENVIRONMENT="true";process.env.TEST_MODE_DELETION_GUARD=TEST_DELETION_GUARD;process.env.DATABASE_URL="postgres://test";process.env.LIVE_DATABASE_URL="postgres://live";
    expect(isTestModeEnvironment()).toBe(true);
    expect(()=>assertDisposableTestDatabase()).not.toThrow();
  });
});
