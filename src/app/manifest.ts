import type { MetadataRoute } from "next";

export default function manifest():MetadataRoute.Manifest{return{name:"Innozanzi Shop",short_name:"Innozanzi",description:"Shop technology, build a PC and track your Innozanzi orders.",start_url:"/",display:"standalone",background_color:"#ffffff",theme_color:"#071b33",orientation:"portrait-primary",icons:[{src:"/icon.png",sizes:"512x512",type:"image/png"}]}}
