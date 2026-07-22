"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{display:"grid",minHeight:"100vh",placeItems:"center",padding:24,fontFamily:"Arial, sans-serif"}}><section style={{maxWidth:520,textAlign:"center"}}><h1>Innozanzi Shop is temporarily unavailable</h1><p>We encountered an unexpected system error. Please retry your request.</p><button style={{padding:"12px 22px",border:0,borderRadius:8,background:"#119dff",color:"white",fontWeight:700}} onClick={reset}>Reload system</button></section></main></body></html>;
}
