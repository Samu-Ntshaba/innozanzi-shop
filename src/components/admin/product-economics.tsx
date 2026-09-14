import Decimal from "decimal.js";
import { supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { contributionAtPrice } from "@/domain/commerce/engine";

type Product = Omit<Parameters<typeof supplierRetailPrice>[0],"costPrice"> & {costPrice:Decimal.Value|null};
export async function ProductEconomics({product}:{product:Product}){
 let values:Array<[string,string]>;
 try{
  if(!product.costPrice)throw new Error("Missing cost");
  const retail=await supplierRetailPrice({...product,costPrice:product.costPrice});
  const price=retail.salePrice??retail.regularPrice, floor=retail.protectedResult;
  const cost=retail.promotionActive?product.promotionalPrice!:product.costPrice;
  const actual=contributionAtPrice(cost,price,floor.settings,floor.gateway);
  const zar=(value:Decimal.Value)=>`R ${new Decimal(value).toFixed(2)}`;
  values=[["Innozanzi RRP",zar(price)],["Safe price floor",zar(retail.minimumPrice)],["Expected gross profit",zar(new Decimal(actual.net).minus(floor.supplier))],
   ["Expected contribution",zar(actual.contribution)],["Contribution margin",`${new Decimal(actual.margin).toFixed(2)}%`],["Gateway estimate",zar(actual.fees)],
   ["Delivery exposure",zar(floor.delivery)],["Operating allocation",zar(floor.operating)],["Other configured costs",zar(actual.otherCosts)],
   ["Difference from supplier RRP",product.recommendedRetail&&new Decimal(product.recommendedRetail).gt(0)?`${zar(price.minus(product.recommendedRetail))} / ${price.div(product.recommendedRetail).minus(1).mul(100).toFixed(2)}%`:"Not supplied"]];
 }catch{return <p className="mt-4 font-bold text-red-700">PRICING REVIEW REQUIRED</p>;}
 return <div className="mt-4 border-t pt-4"><h3 className="font-bold">Innozanzi pricing waterfall</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm">{values.map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl><p className="mt-3 text-xs text-slate-500">Contribution is after configured costs and reserve. Actual profit is confirmed during reconciliation.</p></div>;
}
