import { describe,expect,it } from "vitest";
import { normalizeBuildAnalysis } from "../src/domain/pc-projects/analysis";

describe("PC build review analysis",()=>{
  it("accepts a valid saved analysis",()=>{
    expect(normalizeBuildAnalysis({personality:"Balanced build",gaming:[{label:"1080p Gaming",rating:"Very Good"}],games:[{tier:"Excellent",titles:["Example Game"]}]})).toEqual({personality:"Balanced build",gaming:[{label:"1080p Gaming",rating:"Very Good"}],games:[{tier:"Excellent",titles:["Example Game"]}]});
  });
  it("never passes malformed AI collections to the review UI",()=>{
    expect(normalizeBuildAnalysis({personality:"Saved analysis",gaming:{label:"broken"},games:"broken"})).toEqual({personality:"Saved analysis",gaming:[],games:[]});
    expect(normalizeBuildAnalysis({personality:{text:"not renderable"}})).toBeNull();
  });
  it("drops malformed entries while preserving safe text",()=>{
    expect(normalizeBuildAnalysis({personality:"Safe",gaming:[null,{label:"1080p",rating:"Good"},{label:"Missing rating"}],games:[{tier:"Playable",titles:["Game",42]}]})).toEqual({personality:"Safe",gaming:[{label:"1080p",rating:"Good"}],games:[{tier:"Playable",titles:["Game"]}]});
  });
});
