export function StoreFrame({ children, header, footer, marketing }: { children: React.ReactNode; header: React.ReactNode; footer: React.ReactNode; marketing: React.ReactNode }) {
  return <div className="storefront min-h-screen bg-white">
    {header}
    {children}
    {footer}
    {marketing}
  </div>;
}
