export const homepageShelves = [
  { key:"printing", eyebrow:"For home, school and office", title:"Printers & consumables", href:"/shop?search=printer&availability=in-stock", paths:["Printing/"] },
  { key:"storage", eyebrow:"Keep your files close", title:"Storage & backup", href:"/shop?search=storage&availability=in-stock", paths:["Storage/","Components/Storage/"] },
  { key:"cables", eyebrow:"Complete every setup", title:"Cables & adapters", href:"/shop?category=Cables&availability=in-stock", categories:["Cables"] },
  { key:"audio", eyebrow:"Calls, music and entertainment", title:"Audio & video", href:"/shop?search=headset&availability=in-stock", paths:["Audio","Computer peripherals/Headsets","Computer peripherals/Webcams"] },
  { key:"components", eyebrow:"Upgrade or build your own", title:"PC components", href:"/shop?category=Components&availability=in-stock", categories:["Components"] },
  { key:"security", eyebrow:"Stay connected and protected", title:"Smart security", href:"/shop?category=Networking%20%26%20security&availability=in-stock", paths:["Networking & security/Surveillance","Networking & security/Smart"] },
] as const;

export type HomepageShelfKey = typeof homepageShelves[number]["key"];
export const homepageShelf = (key:string) => homepageShelves.find(shelf => shelf.key === key);
