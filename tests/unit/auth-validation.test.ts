import {describe,expect,it} from "vitest";
import {registrationSchema} from "../../src/schemas/auth";

const validRegistration={name:"Nomsa Dlamini",email:"NOMSA@example.com",password:"simplepass"};

describe("registrationSchema",()=>{
  it("normalizes email and only requires the essentials",()=>{
    const result=registrationSchema.parse(validRegistration);
    expect(result).toEqual({name:"Nomsa Dlamini",email:"nomsa@example.com",password:"simplepass"});
  });

  it("rejects passwords shorter than eight characters",()=>{
    expect(registrationSchema.safeParse({...validRegistration,password:"short"}).success).toBe(false);
  });

  it("does not require phone or password confirmation during registration",()=>{
    expect(registrationSchema.safeParse(validRegistration).success).toBe(true);
  });
});
