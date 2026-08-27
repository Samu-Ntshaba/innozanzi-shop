export const homepageShelves = [
  { key:"storage", eyebrow:"Keep your files close", title:"Storage & backup", href:"/shop?search=storage&availability=in-stock", paths:["Computer peripherals/Storage/","Components/Solid state drives","Components/Hard disk drives"] },
  { key:"cables", eyebrow:"Complete every setup", title:"Cables & adapters", href:"/shop?category=Cables&availability=in-stock", categories:["Cables"] },
  { key:"components", eyebrow:"Upgrade or build your own", title:"PC components", href:"/shop?category=Components&availability=in-stock", categories:["Components"] },
  { key:"audio", eyebrow:"Calls, music and entertainment", title:"Audio, headsets & speakers", href:"/shop?category=TV%20%26%20audio&availability=in-stock", categories:["TV & audio"] },
  { key:"security", eyebrow:"Stay connected and protected", title:"Smart security", href:"/shop?category=Networking%20%26%20security&availability=in-stock", paths:["Networking & security/Home security/"] },
  { key:"charging", eyebrow:"Power for everyday devices", title:"Power banks & charging", href:"/shop?category=Power&availability=in-stock", paths:["Power/Power banks","Power/Chargers"] },
  { key:"home-tech", eyebrow:"Useful technology beyond the desk", title:"Lifestyle & home technology", href:"/shop?category=Lifestyle%20%26%20home%20tech&availability=in-stock", categories:["Lifestyle & home tech"] },
  { key:"appliances", eyebrow:"Technology for daily living", title:"Home appliances", href:"/shop?category=Appliances&availability=in-stock", categories:["Appliances"] },
  { key:"bags", eyebrow:"Carry and protect your devices", title:"Bags, backpacks & protection", href:"/shop?category=Bags%20%26%20luggage&availability=in-stock", categories:["Bags & luggage"] },
  { key:"software", eyebrow:"Tools for work and creativity", title:"Software", href:"/shop?category=Software&availability=in-stock", categories:["Software"] },
  { key:"mobile", eyebrow:"Portable essentials", title:"Mobile & tablet accessories", href:"/shop?category=Mobile&availability=in-stock", categories:["Mobile"] },
  { key:"printing", eyebrow:"Print wherever work takes you", title:"Portable printing", href:"/shop?search=printer&availability=in-stock", paths:["Lifestyle & home tech/Portable printing/"] },
] as const;

export type HomepageShelfKey = typeof homepageShelves[number]["key"];
export const homepageShelf = (key:string) => homepageShelves.find(shelf => shelf.key === key);
