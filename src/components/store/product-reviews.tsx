import Link from "next/link";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";
import { submitProductReview } from "@/domain/catalogue/review-actions";

type PublicReview = { id: string; rating: number; title: string | null; body: string | null; isVerifiedPurchase: boolean; createdAt: Date; user: { name: string | null } };

function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return <div aria-label={`${rating} out of 5 stars`} className="flex text-amber-500">{[1, 2, 3, 4, 5].map(star => <Star aria-hidden="true" className={`${size} ${star <= rating ? "fill-current" : "text-slate-300"}`} key={star}/>)}</div>;
}

export function ProductReviews({ productId, sourceType, path, reviews, signedIn, submitted }: { productId: string; sourceType: "LOCAL" | "SUPPLIER"; path: string; reviews: PublicReview[]; signedIn: boolean; submitted?: boolean }) {
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const distribution=[5,4,3,2,1].map(rating=>({rating,count:reviews.filter(review=>review.rating===rating).length}));
  return <section id="reviews" className="mt-14 scroll-mt-28 border-t border-slate-200 pt-10">
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Customer feedback</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Reviews &amp; comments</h2>
        {reviews.length ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-3"><strong className="text-5xl font-black text-slate-950">{average.toFixed(1)}</strong><div><Stars rating={Math.round(average)} size="size-5"/><p className="mt-1 text-xs text-slate-500">{reviews.length} approved {reviews.length === 1 ? "review" : "reviews"}</p></div></div><div className="mt-5 space-y-2">{distribution.map(item=><div className="grid grid-cols-[26px_1fr_24px] items-center gap-2 text-xs text-slate-600" key={item.rating}><span>{item.rating}★</span><span className="h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-amber-400" style={{width:`${reviews.length?item.count/reviews.length*100:0}%`}}/></span><span className="text-right">{item.count}</span></div>)}</div></div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"><p className="font-semibold text-slate-900">No reviews yet</p><p className="mt-1 text-sm leading-6 text-slate-600">Be the first customer to share useful product feedback.</p></div>}
        {submitted ? <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Thank you. Your review was submitted for moderation.</p> : null}
        {signedIn ? <form action={submitProductReview} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <input type="hidden" name="productId" value={productId}/><input type="hidden" name="sourceType" value={sourceType}/><input type="hidden" name="returnPath" value={path}/>
          <fieldset><legend className="text-sm font-semibold text-slate-800">Your rating</legend><div className="mt-2 flex flex-wrap gap-2">{[5, 4, 3, 2, 1].map(rating => <label className="cursor-pointer" key={rating}><input className="peer sr-only" type="radio" name="rating" value={rating} required/><span className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm peer-checked:border-amber-500 peer-checked:bg-amber-50">{rating} ★</span></label>)}</div></fieldset>
          <label className="block text-sm font-semibold text-slate-800">Review title<input className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3" name="title" placeholder="Summarise your experience" required/></label>
          <label className="block text-sm font-semibold text-slate-800">Your comments<textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3" name="body" placeholder="What did you like, and what should other customers know?" required/></label>
          <button className="min-h-11 w-full rounded-lg bg-sky-700 px-5 font-bold text-white">Submit review</button><p className="text-xs leading-5 text-slate-500">Reviews are moderated before publication. Paid-order reviews receive a verified-purchase badge.</p>
        </form> : <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="font-semibold text-slate-900">Purchased this product?</p><p className="mt-1 text-sm text-slate-600">Sign in to leave a rating and comment.</p><Link className="mt-4 inline-block rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white" href={`/sign-in?callbackUrl=${encodeURIComponent(`${path}#reviews`)}`}>Sign in to review</Link></div>}
      </div>
      <div className="space-y-4">
        {reviews.map(review => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" key={review.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><Stars rating={review.rating}/><h3 className="mt-2 text-lg font-bold text-slate-950">{review.title ?? "Customer review"}</h3></div><time className="text-xs text-slate-500">{review.createdAt.toLocaleDateString("en-ZA")}</time></div>{review.body ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{review.body}</p> : null}<div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5"/>{review.user.name ?? "Innozanzi customer"}</span>{review.isVerifiedPurchase ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700"><CheckCircle2 className="size-3.5"/>Verified purchase</span> : null}</div></article>)}
        {!reviews.length ? <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 text-center"><div><MessageSquare className="mx-auto size-7 text-slate-400"/><p className="mt-3 text-sm text-slate-500">Approved customer reviews will appear here.</p></div></div> : null}
      </div>
    </div>
  </section>;
}
