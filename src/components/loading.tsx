export function StoreLoader({ label = 'Preparing your collection', fullScreen = false }: { label?: string; fullScreen?: boolean }) {
 return <div className={fullScreen ? 'store-loader store-loader-screen' : 'store-loader'} role="status" aria-live="polite"><div className="loader-dial" aria-hidden="true"><span className="loader-orbit"/><span className="loader-monogram">T<span>&</span>S</span></div><span className="loader-brand">SMA COLLECTIONS</span><span className="loader-label">{label}</span><span className="loader-track" aria-hidden="true"><span/></span></div>;
}
export function FetchLoader({label}: {label: string}) { return <span className="fetch-loader" role="status"><span className="fetch-spinner" aria-hidden="true"/>{label}</span>; }
