export const supplierBrandAssets=[
  {name:"AMD",slug:"AMD",logo:"/marketing/supplier/brands/amd.jpg"},
  {name:"Antec",slug:"Antec",logo:"/marketing/supplier/brands/antec.png"},
  {name:"AOC",slug:"AOC",logo:"/marketing/supplier/brands/aoc.png"},
  {name:"ASRock",slug:"ASRock",logo:"/marketing/brands/asrock.png"},
  {name:"FSP",slug:"FSP",logo:"/marketing/supplier/brands/fsp.png"},
  {name:"GeIL",slug:"GeIL",logo:"/marketing/supplier/brands/geil.png"},
  {name:"Giada",slug:"Giada",logo:"/marketing/supplier/brands/giada.png"},
  {name:"Gizzu",slug:"Gizzu",logo:"/marketing/supplier/brands/gizzu.png"},
  {name:"Intel",slug:"Intel",logo:"/marketing/supplier/brands/intel.png"},
  {name:"MSI",slug:"MSI",logo:"/marketing/supplier/brands/msi.png"},
  {name:"PCBuilder",slug:"PCBuilder",logo:"/marketing/supplier/brands/pcbuilder.png"},
  {name:"Redragon",slug:"Redragon",logo:"/marketing/supplier/brands/redragon.png"},
  {name:"Romoss",slug:"Romoss",logo:"/marketing/supplier/brands/romoss.png"},
  {name:"WINX",slug:"WINX",logo:"/marketing/brands/winx-on-white.png"},
  {name:"Xiaomi",slug:"Xiaomi",logo:"/marketing/supplier/brands/xiaomi.png"},
] as const;

export function supplierBrandAsset(name:string){
  const normalized=name.trim().toLowerCase();return supplierBrandAssets.find(asset=>asset.name.toLowerCase()===normalized||asset.slug.toLowerCase()===normalized);
}
