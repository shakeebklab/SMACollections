'use client';
import {useEffect, useState} from 'react';
import {StoreLoader} from './loading';
export function InitialLoader() {
 const [loading,setLoading] = useState(true);
 useEffect(() => {
  const finish = () => setLoading(false);
  // Wait for the streamed document and eager images without a cosmetic delay.
  const timeout = window.setTimeout(finish, document.readyState === 'complete' ? 0 : 8000);
  window.addEventListener('load',finish,{once:true});
  return () => {window.removeEventListener('load',finish);window.clearTimeout(timeout);};
 },[]);
 return loading ? <StoreLoader fullScreen label="A little detail. Worth the wait."/> : null;
}
